"use client";

import { useState } from "react";

function maskRegistrant(name) {
  const characters = Array.from(name || "");

  if (characters.length < 2) {
    return name;
  }

  characters[Math.floor(characters.length / 2)] = "O";
  return characters.join("");
}

export default function PlatesTable() {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [hasSearch, setHasSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setFiltered([]);
      setHasSearch(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedSearch }),
      });
      const data = await res.json();
      setFiltered(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setFiltered([]);
    } finally {
      setHasSearch(true);
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search card */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-7 mb-8"
      >
        <label className="block text-sm font-medium text-slate-700 mb-2.5">
          搜尋車牌、登記人或車款
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. ABC-1234"
              className="w-full pl-11 pr-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/25 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {hasSearch && !loading && (
          <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}
      </form>

      {/* Empty state / Results */}
      {!hasSearch ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 py-24 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
          <p className="text-slate-600 text-sm font-medium">Enter a license plate to begin</p>
          <p className="text-slate-400 text-xs mt-1.5">請輸入車牌、登記人或車款以開始搜尋</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in bg-white rounded-2xl ring-1 ring-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">No matching results. 找不到符合的資料</p>
        </div>
      ) : (
        <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plate) => (
            <div
              key={plate.id}
              className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 hover:ring-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-white">
                  {plate.licensePlate}
                </span>
                <div className="flex flex-wrap justify-end items-center gap-1.5">
                  {plate.category && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                        plate.category === "機車"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {plate.category}
                    </span>
                  )}
                  {plate.carModel && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 whitespace-nowrap">
                      {plate.carModel}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">
                    {plate.registrant ? maskRegistrant(plate.registrant) : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-1.55.775a11.037 11.037 0 006.105 6.105l.775-1.55a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{plate.phone || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
