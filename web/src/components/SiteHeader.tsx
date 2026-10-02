"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/skrining", label: "Skrining" },
  { href: "/pasien", label: "Pasien" },
  { href: "/klinisi", label: "Klinisi" },
  { href: "/tentang", label: "Tentang" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-[18px] font-extrabold tracking-tight sm:text-[19px]">SIGAP</span>
          <span className="hidden text-[12px] text-ink/50 sm:block">skrining TB</span>
        </Link>
        <nav aria-label="Navigasi utama" className="ml-auto flex gap-0.5 overflow-x-auto sm:gap-1">
          {NAV.map((n) => {
            const active = path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-colors sm:px-3 sm:text-[14px] ${
                  active
                    ? "bg-ink text-paper"
                    : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}