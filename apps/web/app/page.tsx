import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-900">
      <Navbar />

      {/* HERO */}
      <section className="relative isolate mt-10 md:mt-16 py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Left: headline */}
            <div>
              <h1 className="font-serif text-5xl leading-tight tracking-tight md:text-6xl">
                Finally, turn any video and meeting into transcripts you can chat with
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-600 md:text-xl">
                Move beyond manual notes—upload a file, paste a link, or join live. We transcribe, clean,
                let you ask questions, auto‑summarize, and export in one click.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-3 rounded-full bg-amber-600 px-6 py-3 text-white transition hover:bg-amber-700"
                >
                  <span>Get started — it’s free</span>
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-zinc-900 transition hover:bg-zinc-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Watch video
                </a>
              </div>
            </div>

            {/* Right: app mock */}
            <div className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
              <div className="grid grid-cols-[240px_1fr]">
                {/* Sidebar */}
                <div className="border-r border-zinc-200 p-4">
                  <div className="mb-3 h-8 w-full rounded-md border border-zinc-200 bg-white" />
                  <div className="space-y-2">
                    {["Home", "People", "Notes"].map((t, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50">
                        <span className="h-4 w-4 rounded-sm bg-zinc-300" />
                        <span className="text-sm text-zinc-700">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-xs font-medium uppercase text-zinc-500">Groups</div>
                  <div className="mt-2 space-y-2">
                    {["Starred", "Meetings", "Interviews", "Lectures"].map((t) => (
                      <div key={t} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-sm text-zinc-700">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Feed */}
                <div className="p-4">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 + shadow-sm not-last:mb-3 mb-3 last:mb-0">
                      <span className="h-8 w-8 flex-shrink-0 rounded-full bg-zinc-200" />
                      <div className="min-w-0 flex-1">
                        <div className="h-3 w-1/2 rounded bg-zinc-200" />
                        <div className="mt-2 h-2 w-3/4 rounded bg-zinc-100" />
                      </div>
                      <span className="text-xs text-zinc-400">{i}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY STRIP */}
      <section className="relative border-y border-zinc-200 bg-white py-14">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-balance text-2xl font-semibold md:text-3xl">
              See your words transform in real‑time
            </h2>
            <p className="hidden text-sm text-zinc-500 md:block">Scroll →</p>
          </div>
        </div>
        <div className="no-scrollbar overflow-x-auto">
          <div className="mx-auto flex w-max gap-4 px-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="group relative h-[360px] w-[560px] flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-full w-full items-end justify-between rounded-xl bg-zinc-50 p-5">
      <div>
                    <p className="text-sm uppercase tracking-wide text-zinc-500">Scene {i}</p>
                    <h3 className="mt-2 max-w-[26ch] text-xl font-medium">
                      {i === 1 && "Upload .mp4 and get timestamps, speakers, and sections"}
                      {i === 2 && "Paste a YouTube link — we fetch, transcribe, and clean"}
                      {i === 3 && "Join live meetings to transcribe in real time"}
                      {i === 4 && "Ask: ‘what did they decide about budget?’ and get an answer"}
                      {i === 5 && "Auto‑generate summaries, action items, and key quotes"}
                      {i === 6 && "Export to PDF, DOCX, SRT/VTT, or copy a share link"}
                    </h3>
                  </div>
                  <div className="h-24 w-24 rotate-6 rounded-xl bg-zinc-200 transition group-hover:rotate-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold md:text-4xl">
            From video to answers in minutes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600">
            A streamlined flow designed for accuracy and speed.
          </p>

          <div className="relative mt-14 grid items-start gap-10 md:grid-cols-4">
            {["Add video or join", "Transcribe & clean", "Chat & search", "Summarize & export"].map(
              (title, idx) => (
                <div key={title} className="relative">
                  <div className="relative z-10 rounded-2xl border border-zinc-200 bg-white p-6">
                     <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                      {idx + 1}
                    </div>
                    <h3 className="text-xl font-medium">{title}</h3>
                    <p className="mt-2 text-zinc-600">
                      {idx === 0 && "Upload a file, paste a link, or connect to Zoom/Meet/Teams."}
                      {idx === 1 && "Fast, accurate transcripts with speakers, timestamps, and cleanup."}
                      {idx === 2 && "Ask questions, find moments, and extract answers instantly."}
                      {idx === 3 && "One‑click summary and exports: PDF, DOCX, SRT, VTT."}
                    </p>
                  </div>
                  {/* connector */}
                  {idx < 3 && (
                    <svg
                      className="absolute left-[calc(100%+8px)] top-14 hidden h-12 w-24 -translate-y-1/2 text-zinc-300 md:block"
                      viewBox="0 0 100 50"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M0 25 C 30 25, 70 25, 100 25" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" />
                    </svg>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-semibold md:text-3xl">Everything you need, built‑in</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Chat with transcript */}
            <div className="md:col-span-5 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">Chat with your transcript</h3>
              <p className="mt-2 text-zinc-600">Ask questions, extract quotes, create action items.</p>
              <div className="mt-6 h-32 rounded-xl bg-amber-100" />
            </div>
            {/* One‑click summary */}
            <div className="md:col-span-4 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">One‑click summary</h3>
              <p className="mt-2 text-zinc-600">Key points, decisions, next steps — in seconds.</p>
              <div className="mt-6 h-32 rounded-xl bg-amber-100" />
            </div>
            {/* Export formats */}
            <div className="md:col-span-3 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">Export anywhere</h3>
              <p className="mt-2 text-zinc-600">Share links or download files.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['PDF','DOCX','SRT','VTT','TXT'].map(f => (
                  <span key={f} className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700">{f}</span>
                ))}
              </div>
            </div>
            {/* Search & timestamps */}
            <div className="md:col-span-4 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">Search + timestamps</h3>
              <p className="mt-2 text-zinc-600">Jump to any moment with precise anchors.</p>
              <div className="mt-6 h-32 rounded-xl bg-amber-100" />
            </div>
            {/* Speaker detection */}
            <div className="md:col-span-4 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">Speakers & sections</h3>
              <p className="mt-2 text-zinc-600">Automatic diarization and smart structuring.</p>
              <div className="mt-6 h-32 rounded-xl bg-amber-100" />
            </div>
            {/* Multi‑language */}
            <div className="md:col-span-4 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-medium">Multilingual</h3>
              <p className="mt-2 text-zinc-600">Global languages with accurate punctuation.</p>
              <div className="mt-6 h-32 rounded-xl bg-amber-100" />
            </div>
          </div>
        </div>
      </section>

      {/* MOSAIC USE-CASES */}
      <section className="relative py-20">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-semibold md:text-3xl">Built for how you think</h2>
            <a href="/signup" className="text-sm text-amber-700 underline decoration-amber-700/40 underline-offset-4 hover:decoration-amber-700">
              Start free
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {[
              { t: "Founders", span: "md:col-span-3", c: "from-cyan-400/20 to-indigo-500/20" },
              { t: "Students", span: "md:col-span-3", c: "from-emerald-400/20 to-teal-500/20" },
              { t: "Journalists", span: "md:col-span-2", c: "from-fuchsia-400/20 to-pink-500/20" },
              { t: "Researchers", span: "md:col-span-2", c: "from-amber-400/25 to-orange-500/20" },
              { t: "Creators", span: "md:col-span-2", c: "from-sky-400/20 to-blue-500/20" },
            ].map(({ t, span }) => (
              <div
                key={t}
                className={`${span} relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow`}
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-medium">{t}</h3>
                  <p className="mt-2 max-w-[38ch] text-zinc-600">
                    {t === "Founders" && "Turn voice memos into crisp product updates and investor emails."}
                    {t === "Students" && "Condense lectures into organized study notes in minutes."}
                    {t === "Journalists" && "Interview, transcribe, and draft quotes without the shuffle."}
                    {t === "Researchers" && "Capture insights and auto‑structure them into summaries."}
                    {t === "Creators" && "Script videos and posts from off‑the‑cuff ideas."}
                  </p>
                </div>
                <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rotate-12 rounded-xl bg-amber-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative border-y border-zinc-200 py-20">
        <div className="container mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold md:text-4xl">Loved by fast‑moving teams</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                q: "I ship updates faster because my thoughts don’t stall inside docs anymore.",
                n: "Ava, Product Lead",
              },
              {
                q: "The transcript cleanup is scarily good. Sounds like me—just sharper.",
                n: "Jun, Researcher",
              },
              {
                q: "We record standups and it writes the weekly summary with zero friction.",
                n: "Marcos, Founder",
              },
            ].map((t, i) => (
              <figure key={i} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <blockquote className="text-pretty text-lg text-zinc-700">“{t.q}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 text-sm text-zinc-500">
                  <Image
                    src="/avatars/default-user.jpg"
                    alt="avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span>{t.n}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-10">
            <h3 className="text-balance text-3xl font-semibold md:text-4xl">
              Ready to write without writing?
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600">
              Join thousands turning messy thoughts into clear writing with one click.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-white transition hover:bg-amber-700"
              >
                Create your free account
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-zinc-900 transition hover:bg-zinc-50"
              >
                Explore the demo
              </a>
            </div>
          </div>
        </div>
      </section>

        <Footer />
    </div>
  );
}
