import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { getAssetPath } from "@/lib/utils";

const setupSteps = [
  {
    title: "1) Open your Teacher Command Deck",
    description:
      "Start in Teacher Space so your core tools are one tap away: roster, rewards, missions, and map.",
    image: "/images/planetpng/earth.png",
  },
  {
    title: "2) Add students and confirm rank settings",
    description:
      "Set up your class roster first, then check rank thresholds so point growth matches your class pace.",
    image: "/images/planetpng/mars.png",
  },
  {
    title: "3) Launch missions and use points consistently",
    description:
      "Assign lessons, then award points daily so students can see quick progress and stay motivated.",
    image: "/images/planetpng/jupiter.png",
  },
];

export default function TeacherInstructionsPage() {
  return (
    <div className="min-h-screen bg-space-950 text-cyan-100 font-mono">
      <header className="sticky top-0 z-20 border-b border-cyan-500/20 bg-black/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/space"
              className="p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-300 transition-colors"
              aria-label="Back to teacher space"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-widest">Instructions & Setup</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/70">Best Use Guide</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="rounded-2xl border border-cyan-500/30 bg-black/40 p-5 md:p-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-400 mb-3">Video Walkthrough</h2>
          <div className="aspect-video rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-slate-900/40 flex items-center justify-center text-center p-6">
            <div className="space-y-2">
              <PlayCircle size={42} className="mx-auto text-cyan-300" />
              <p className="text-cyan-100 font-semibold">Instructional video goes here</p>
              <p className="text-xs text-cyan-400/80">Add your video embed or upload when ready.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-400">Setup Steps</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {setupSteps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-cyan-500/20 bg-black/40 overflow-hidden"
              >
                <img
                  src={getAssetPath(step.image)}
                  alt="Planet placeholder"
                  className="w-full h-44 object-cover bg-black/50"
                />
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-cyan-100 leading-snug">{step.title}</h3>
                  <p className="text-sm text-cyan-200/80 leading-relaxed">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
