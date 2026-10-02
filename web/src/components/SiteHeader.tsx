"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/skrining", label: "Skrining" },
  { href: "/pasien", label: "Pendampingan" },
  { href: "/klinisi", label: "Ringkasan klinisi" },
  { href: "/tentang", label: "Tentang" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[19px] font-extrabold tracking-tight">SIGAP</span>
          <span className="hidden text-[12px] text-ink/50 sm:block">skrining TB</span>
        </Link>
        <nav aria-label="Navigasi utama" className="ml-auto flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-[8px] px-3 py-2 text-[14px] font-medium transition-colors ${
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