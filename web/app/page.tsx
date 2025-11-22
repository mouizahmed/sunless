import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import Features from "@/components/landing/features";
import CTA from "@/components/landing/cta";
import Pricing from "@/components/landing/pricing";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-900 relative">
      {/* Purple backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-violet-50/20 to-purple-100/40 pointer-events-none" />

      <Navbar />

      {/* HERO */}
      <section className="relative isolate mt-10 md:mt-16 py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Left: headline */}
            <div>
              <h1 className="font-serif text-5xl leading-tight tracking-tight md:text-6xl">
                Finally, turn any video and meeting into transcripts you can
                chat with
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-600 md:text-xl">
                Move beyond manual notes—upload a file, paste a link, or join
                live. We transcribe, clean, let you ask questions,
                auto‑summarize, and export in one click.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#features"
                  className="inline-flex items-center gap-3 rounded-full bg-brand px-6 py-3 text-white transition hover:bg-brand-light"
                >
                  <span>Get started — it&apos;s free</span>
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-zinc-900 transition hover:bg-zinc-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
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
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50"
                      >
                        <span className="h-4 w-4 rounded-sm bg-zinc-300" />
                        <span className="text-sm text-zinc-700">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-xs font-medium uppercase text-zinc-500">
                    Groups
                  </div>
                  <div className="mt-2 space-y-2">
                    {["Starred", "Meetings", "Interviews", "Lectures"].map(
                      (t) => (
                        <div
                          key={t}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50"
                        >
                          <span className="h-2 w-2 rounded-full bg-brand" />
                          <span className="text-sm text-zinc-700">{t}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                {/* Feed */}
                <div className="p-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 + shadow-sm not-last:mb-3 mb-3 last:mb-0"
                    >
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

      <Features />

      <Pricing />

      <CTA />

      <Footer />
    </div>
  );
}
