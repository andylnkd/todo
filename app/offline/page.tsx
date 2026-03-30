export default function OfflinePage() {
  return (
    <main className="offline-shell min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
        <div className="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50">
          Offline
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">You are offline.</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Innatus is installed and the shell is available, but this page needs a network connection for fresh data.
            Reconnect and reopen the app to sync your latest tasks.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          Tip: pages you have already visited may still open from cache. New authenticated data fetches will resume once
          the device is back online.
        </div>
      </div>
    </main>
  );
}
