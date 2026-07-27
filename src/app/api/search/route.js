import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// NOTE: Do NOT construct the Notion client at module scope (top-level).
// On Cloudflare Workers, @opennextjs/cloudflare only copies your Worker's
// env vars/secrets into `process.env` *inside* the per-request handler
// (see node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-node.js).
// Module-level code runs once at cold start, *before* that copy happens, so
// `process.env.NOTION_API_KEY` would still be `undefined` here — this is
// exactly why it worked in local Next.js dev (where process.env is populated
// before any module import) but failed as a deployed Worker. Reading it
// inside the request handler below reads it after it's been populated.
function getNotionClient() {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

// Simple in-memory cache for the data source id, so most requests skip
// straight to the actual search query instead of paying for
// `databases.retrieve` on every single search.
// This is safe as module-level *mutable state*, unlike `process.env` above —
// there's no cold-start timing issue here since we only ever read/write
// `schemaCache` from inside the request handler, well after the module has
// finished loading.
//
// Scope note: each Cloudflare Workers isolate gets its own copy of this
// variable (it is NOT a shared/distributed cache across edge locations),
// and an idle isolate can be evicted at any time — so this only ever saves
// calls *within* a single warm isolate's lifetime. It also can't leak
// memory: it's one small, bounded object that gets replaced wholesale on
// every refresh, never appended to.
const SCHEMA_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let schemaCache = null; // { dataSourceId, fetchedAt }

// Short-lived cache of every row's searchable fields, refreshed far more
// often than the schema cache above since plates get added/edited in Notion
// much more frequently than the database's structure changes. See the
// comment above `normalizePlate` for why we need the raw rows at all instead
// of asking Notion to filter them for us.
const ROWS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let rowsCache = null; // { rows, fetchedAt }

// Plates get entered inconsistently in Notion — some rows have a hyphen
// (e.g. "ALM-8077"), some don't (e.g. "ALM8077") — and users searching the
// portal are just as inconsistent about typing the hyphen. Notion's API
// filters (`equals`/`contains`) only do literal string comparison, so they
// can't ignore hyphens on their own: a `title.equals` filter for "ALM8077"
// would never match a stored "ALM-8077", and vice versa. Normalizing both
// sides the same way (uppercase, strip all hyphens) before comparing means a
// search matches regardless of which side has the hyphen, or whether either
// side does at all.
function normalizePlate(value) {
  return (value || "").toString().toUpperCase().replace(/-/g, "");
}

export async function POST(request) {
  try {
    // This endpoint is public with no login, so throttle per-IP to slow
    // down anyone scripting through plate/owner/model guesses.
    const { env } = getCloudflareContext();
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.SEARCH_RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { query } = await request.json();
    const search = (query || "").toString().trim();

    // No query, no results — never dump the full table to the client.
    if (!search) {
      return NextResponse.json([]);
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      // Log the specific cause server-side only — never leak config details
      // to the client response.
      console.error(
        "Missing Notion config at runtime:",
        !notionApiKey ? "NOTION_API_KEY" : "",
        !notionDatabaseId ? "NOTION_DATABASE_ID" : "",
        "— check Settings > Variables and Secrets on the Worker (not just the build-time variables)."
      );
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    const notion = getNotionClient();

    let dataSourceId;
    const schemaCacheIsFresh =
      schemaCache && Date.now() - schemaCache.fetchedAt < SCHEMA_CACHE_TTL_MS;

    if (schemaCacheIsFresh) {
      ({ dataSourceId } = schemaCache);
    } else {
      // Resolve the data source id for this database (Notion API 2025-09-03+).
      const db = await notion.databases.retrieve({
        database_id: notionDatabaseId,
      });
      dataSourceId = db.data_sources?.[0]?.id;
      if (!dataSourceId) {
        throw new Error(
          "Notion database has no data sources — check NOTION_DATABASE_ID"
        );
      }

      schemaCache = { dataSourceId, fetchedAt: Date.now() };
    }

    // Pull every row back and match in JS rather than asking Notion to
    // filter — see the comment on `normalizePlate` above for why: Notion's
    // filters can't ignore hyphens, so a server-side filter would miss
    // plates whenever the hyphen usage in the query doesn't exactly match
    // what's stored. Paginate through all rows (Notion returns at most 100
    // per page) and cache the result briefly so repeat searches don't each
    // re-fetch the whole table.
    const rowsCacheIsFresh =
      rowsCache && Date.now() - rowsCache.fetchedAt < ROWS_CACHE_TTL_MS;

    let rows;
    if (rowsCacheIsFresh) {
      rows = rowsCache.rows;
    } else {
      rows = [];
      let cursor = undefined;
      do {
        const page = await notion.dataSources.query({
          data_source_id: dataSourceId,
          start_cursor: cursor,
        });
        rows = rows.concat(page.results);
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);

      rowsCache = { rows, fetchedAt: Date.now() };
    }

    const normalizedSearch = normalizePlate(search);

    // ===== EXACT MATCH & SINGLE RESULT LIMIT FOR SECURITY =====
    // Only an exact match qualifies — on the plate (ignoring hyphens on
    // both sides) or an exact match on registrant/car model as typed — and
    // only the first match is ever returned. TO REVERT TO LOOSE SEARCH:
    // change the `===`/normalized-equality checks below to `.includes()`.
    const results = rows.filter((page) => {
      const props = page.properties;
      const plate = props["車牌"]?.title?.[0]?.plain_text || "";
      const registrant = props["登記人"]?.rich_text?.[0]?.plain_text || "";
      const carModel = props["車款"]?.select?.name || "";

      return (
        normalizePlate(plate) === normalizedSearch ||
        registrant === search ||
        carModel === search
      );
    });

    // Even with an exact filter, more than one row could match (e.g.
    // duplicate plates). Force only a single row back to the client.
    // TO REVERT: remove this `.slice(0, 1)`.
    const limitedResults = results.slice(0, 1);
    // ===== END EXACT MATCH & SINGLE RESULT LIMIT FOR SECURITY =====

    const plates = limitedResults.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        licensePlate: props["車牌"]?.title?.[0]?.plain_text || "",
        registrant: props["登記人"]?.rich_text?.[0]?.plain_text || "",
        phone: props["登記電話"]?.phone_number || "",
        carModel: props["車款"]?.select?.name || "",
        // "分類" is a select property with two options: 汽車 (car) / 機車
        // (motorcycle). Exposed as-is so the frontend can branch on it.
        category: props["分類"]?.select?.name || "",
      };
    });

    return NextResponse.json(plates);
  } catch (error) {
    // Notion SDK errors (APIResponseError) carry a `code` (e.g.
    // "unauthorized", "object_not_found", "validation_error") and `status`
    // that are far more useful for diagnosing production issues via
    // `wrangler tail` / the dashboard Logs tab than the bare error object.
    console.error("Notion search failed:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
