"use client";

import { useLang } from "@/lib/i18n";

const LIVE_URL = "https://ip-172-26-13-244.tail40f715.ts.net";
const PAGES_URL = "https://alvnvnc.github.io/loop-tb";

export default function TentangPage() {
  const { t } = useLang();

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6">
      <section className="pt-12">
        <p className="text-[12.5px] font-semibold tracking-wide text-ink/45">{t("landing.kicker")}</p>
        <h1 className="font-display mt-3 text-[34px] font-semibold leading-tight tracking-tight">{t("ab.title")}</h1>
        <p className="font-display mt-5 max-w-2xl text-[19px] leading-relaxed text-ink/80">{t("ab.lede")}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[24px] font-semibold">{t("ab.how.title")}</h2>
        <ol className="mt-5 space-y-5">
          {[1, 2, 3].map((n) => (
            <li key={n} className="grid grid-cols-[44px_1fr] gap-4">
              <span className="font-display pt-0.5 text-[17px] font-semibold tabular-nums text-ink/30">0{n}</span>
              <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink/75">{t(`ab.how.${n}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[24px] font-semibold">{t("ab.rigor.title")}</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-start gap-3 rounded-tile border border-ink/10 bg-white/70 p-4 shadow-tile">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-clear" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.5 12.2 2.4 2.4 4.6-5" />
              </svg>
              <p className="text-[14px] leading-relaxed text-ink/75">{t(`ab.rigor.${n}`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-panel bg-film p-6 text-bone shadow-float sm:p-8">
        <h2 className="font-display text-[24px] font-semibold">{t("ab.links.title")}</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-bone/70">{t("ab.links.body")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={LIVE_URL} target="_blank" rel="noreferrer" className="rounded-control bg-bone px-4 py-2.5 text-[13.5px] font-bold text-film transition-all hover:-translate-y-0.5">
            {t("landing.try.full")} ↗
          </a>
          <a href={PAGES_URL} target="_blank" rel="noreferrer" className="rounded-control border border-bone/30 px-4 py-2.5 text-[13.5px] font-semibold text-bone transition-colors hover:border-bone/60">
            {t("landing.try.static")} ↗
          </a>
          <a
            href="https://github.com/Alvnvnc/loop-tb"
            target="_blank"
            rel="noreferrer"
            className="rounded-control border border-bone/30 px-4 py-2.5 text-[13.5px] font-semibold text-bone transition-colors hover:border-bone/60"
          >
            GitHub ↗
          </a>
          <a
            href="https://github.com/Alvnvnc/loop-tb/releases/tag/models-v1"
            target="_blank"
            rel="noreferrer"
            className="rounded-control border border-bone/30 px-4 py-2.5 text-[13.5px] font-semibold text-bone transition-colors hover:border-bone/60"
          >
            models-v1 ↗
          </a>
        </div>
      </section>

      <section className="mt-12 pb-4">
        <p className="rounded-panel border border-ink/15 bg-white/70 p-5 text-[14px] leading-relaxed text-ink/70">{t("ab.disclaimer")}</p>
      </section>
    </main>
  );
}