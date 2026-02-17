import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProfessionalHeader() {
  return (
    <nav className="w-full border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-3 sm:gap-4">
        <Link href="/" className="relative w-32 sm:w-44 md:w-64 h-12 sm:h-16 shrink-0">
          <Image
            src="/images/logos/croppedclasscravelogo.png"
            alt="ClassCrave Logo"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
          <Link href="/educators" className="hover:text-slate-900 transition-colors">Educators</Link>
          <Link href="/roadmap" className="hover:text-slate-900 transition-colors">Roadmap</Link>
          <Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login?role=teacher" className="hidden sm:inline-flex text-indigo-600 font-semibold hover:text-indigo-800 transition-colors text-sm">
            Classroom Login
          </Link>
          <Link href="/login?role=teacher" className="px-3 sm:px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap">
            <span className="hidden sm:inline">Get Started</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function ProfessionalFooter() {
  return (
    <footer className="border-t border-black/5 py-10 sm:py-12 bg-white/70 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm gap-4">
        <div className="text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} ClassCrave. Built for teachers, by teachers.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          <Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link>
        </div>
      </div>
    </footer>
  );
}
