import PlatesTable from "@/components/PlatesTable";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.5l1.5-4.5a2 2 0 011.9-1.5h11.2a2 2 0 011.9 1.5l1.5 4.5M3 13.5v4a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-4M3 13.5h18M7 17h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">溢恩堂車牌查詢入口</h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm sm:text-base mt-3.5 max-w-xl">
            quickly look up registered plates, owners, and vehicle details.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-12">
        <PlatesTable />
      </main>

      <footer className="bg-slate-900 text-slate-300 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 flex flex-col items-center text-center">
          <a
            href="mailto:xyling2007@gmail.com?subject=Issue Report"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report an Issue
          </a>
          <p className="text-xs text-slate-500 mt-5 pt-5 border-t border-slate-800 w-full">
            © {new Date().getFullYear()} License Plate Management. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}