"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/skrining", key: "nav.screening" },
  { href: "/pasien", key: "nav.patients" },
  { href: "/klinisi", key: "nav.clinicians" },
  { href: "/tentang", key: "nav.about" },
];

export default function SiteHeader() {
  const path = usePathname();
  const { lang, setLang, t } = useLang();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-[19px] font-extrabold tracking-tight sm:text-[20px]">SIGAP</span>
          <span className="hidden text-[12px] text-ink/50 sm:block">{t("sfx.tagline")}</span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-0.5 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-control px-3 py-2 text-[14px] font-medium transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center md:ml-3" role="group" aria-label={t("lang.switch")}>
          {(["en", "id"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`rounded-control px-2.5 py-1.5 text-[12px] font-bold uppercase tracking-wide transition-colors ${
                lang === l ? "bg-ink text-paper" : "text-ink/50 hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}