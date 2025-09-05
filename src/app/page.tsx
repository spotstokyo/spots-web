export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white/70 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold">spots</span>
          <input
            placeholder="Search ramen, izakaya…"
            className="ml-auto w-full max-w-md rounded-lg border px-3 py-2"
          />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 grid gap-4 sm:grid-cols-2">
        {[1,2,3,4].map(i => (
          <article key={i} className="rounded-xl border overflow-hidden">
            <div className="h-40 bg-gray-100" />
            <div className="p-3">
              <h3 className="font-semibold">Sample Place {i}</h3>
              <p className="text-sm text-gray-600">Shibuya · ¥¥ · ★★★★☆</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
