'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';

export function TopNav() {
  return (
    <header className="md:hidden border-b border-border bg-paper/90 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg overflow-hidden shadow-glow">
          <Image
            src="/logo.jpg"
            alt="AI Job Assistant Logo"
            width={28}
            height={28}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <span className="font-display font-bold text-sm tracking-tight text-ink">
          AI Job Assistant
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <nav className="flex items-center gap-1">
          <Link href="/resume" className="text-xs px-2.5 py-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors">
            Resumes
          </Link>
          <Link href="/jobs" className="text-xs px-2.5 py-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors">
            Jobs
          </Link>
          <Link href="/applications" className="text-xs px-2.5 py-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors">
            Apps
          </Link>
        </nav>
      </div>
    </header>
  );
}
