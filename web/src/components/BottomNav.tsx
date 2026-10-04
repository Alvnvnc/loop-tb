"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

const ITEMS = [
  {
    href: "/",
    key: "nav.home",
    icon: (
      <path d="M4 11.5 12 4l8 7.5M6.5 10v9.5h11V10" />
    ),
  },
  {
    href: "/skrining",
    key: "nav.screening",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    ),
  },
  {
    href: "/pasien",
    key: "nav.patients",
    icon: (
      <>
        <circle cx="12" cy="8.2" r="3.4" />
        <path d="M5.4 19.5c1.3-3 3.8-4.5 6.6-4.5s5.3 1.5 6.6 4.5" />
      </>
    ),
  },
  {
    href: "/klinisi",
    key: "nav.clinicians",
    icon: (
      <>
        <rect x="5" y="4" width="14" height="16" rx="2.5" />
        <path d="M9 4.8h6M9 10h6M9 13.6h6M9 17.2h3.5" />
      </>
    ),
  },
  {
    href: "/tentang",
    key: "nav.about",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M12 11v5.2M12 7.8v.2" />
      </>
    ),
  },
];

export default function BottomNav() {
  const path = usePathname();
  const { t } = useLang();

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-3">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path?.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-control px-1 py-2 text-[10.5px] font-semibold transition-colors ${
                  active ? "text-ink" : "text-ink/45 hover:text-ink/75"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {it.icon}
                </svg>
                {t(it.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}