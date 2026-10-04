"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

const LIVE_URL = "https://ip-172-26-13-244.tail40f715.ts.net";
const PAGES_URL = "https://alvnvnc.github.io/loop-tb";

export default function Home() {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const steps = [0, 1, 2].map((i) => ({
    tag: t(`landing.rail.${i}.tag`),
    title: t(`landing.rail.${i}.title`),
    body: t(`landing.rail.${i}.body`),
  }));
  const openList = ["1", "2", "3"].map((n) => t(`landing.evidence.open.${n}`));
  const todoList = ["1", "2", "3"].map((n) => t(`landing.evidence.todo.${n}`));

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Hero */}
      <section className="grid gap-10 pt-12 pb-14 lg:grid-cols-12 lg:gap-8 lg:pt-16">
        <div className="lg:col-span-5">
          <p className="text-[12.5px] font-semibold tracking-wide text-ink/45">{t("landing.kicker")}</p>
          <h1 className="font-display mt-3 text-[38px] leading-[1.05] font-semibold tracking-tight sm:text-[46px]">
            {t("landing.title")}
          </h1>
          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink/70">{t("landing.sub")}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-control bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper shadow-tile transition-all hover:-translate-y-0.5 hover:bg-ink/90"
            >
              {t("landing.cta.primary")}
            </a>
            <a
              href="https://github.com/Alvnvnc/loop-tb"
              target="_blank"
              rel="noreferrer"
              className="rounded-control border border-ink/20 px-5 py-3 text-[14.5px] font-semibold transition-colors hover:border-ink/45"
            >
              {t("landing.cta.secondary")}
            </a>
          </div>

          {/* Rail bernomor */}
          <ol className="mt-10 space-y-1 border-l border-ink/15 pl-0">
            {steps.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.tag}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={on}
                    className="group w-full border-l-2 border-transparent py-3 pl-4 text-left transition-colors"
                    style={{ borderLeftColor: on ? "var(--color-ink)" : "transparent" }}
                  >
                    <span className={`flex items-baseline gap-3 ${on ? "" : "opacity-45 group-hover:opacity-70"}`}>
                      <span className="font-display text-[15px] font-semibold tabular-nums">0{i + 1}</span>
                      <span className="text-[14px] font-bold uppercase tracking-wider">{s.tag}</span>
                    </span>
                    {on && (
                      <span className="reveal mt-2 block">
                        <span className="font-display block text-[21px] font-semibold leading-snug">{s.title}</span>
                        <span className="mt-1.5 block max-w-md text-[14px] leading-relaxed text-ink/65">{s.body}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Mockup perangkat */}
        <div className="lg:col-span-7">
          <div className="relative mx-auto w-fit">
            <div className="absolute -left-12 top-24 z-10 hidden -rotate-2 rounded-tile border border-ink/10 bg-white px-3 py-2 text-[11.5px] font-semibold text-ink/70 shadow-float sm:block">
              RAD-DINO · external AUROC <span className="tabular-nums">0.887</span>
            </div>
            <div className="rounded-[40px] border border-ink/15 bg-film p-3 shadow-float">
              <div className="w-[292px] overflow-hidden rounded-[30px] bg-film text-bone">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/cases/chncxr_0338_1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-film to-transparent p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#ee8b7e]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-refer" />
                      {t("scr.band.refer.label")}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-end justify-between">
                    <p className="text-[12px] text-bone/60">{t("scr.scale.ptb")}</p>
                    <p className="font-display text-[30px] font-semibold leading-none tabular-nums">99%</p>
                  </div>
                  <div className="relative mt-3 h-2 rounded-full bg-[linear-gradient(90deg,#2e7d5b_0%,#2e7d5b_2%,#b7791f_10%,#c0392b_30%,#c0392b_100%)] opacity-90">
                    <span className="absolute -top-[3px] h-[14px] w-[3px] rounded-full bg-bone" style={{ left: "calc(99% - 2px)" }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-bone/50">
                    <span>{t("scr.scale.low")}</span>
                    <span>{t("scr.scale.high")}</span>
                  </div>
                  <p className="mt-3 border-t border-bone/10 pt-2.5 text-[10.5px] leading-relaxed text-bone/55">
                    {t("scr.band.refer.action")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[11.5px] text-ink/45">{t("landing.mockup.caption")}</p>
        </div>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-ink/10 bg-ink/10 sm:grid-cols-3">
        {[
          ["0.887", t("landing.stats.0")],
          ["19", t("landing.stats.1")],
          ["0.71", t("landing.stats.2")],
        ].map(([n, label]) => (
          <div key={label} className="bg-paper px-5 py-6">
            <p className="font-display text-[34px] font-semibold leading-none tabular-nums">{n}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/60">{label}</p>
          </div>
        ))}
      </section>

      {/* Evidence */}
      <section className="mt-16">
        <h2 className="font-display text-[26px] font-semibold">{t("landing.evidence.title")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border border-ink/10 bg-white/70 p-5 shadow-tile">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-clear">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.5 12.2 2.4 2.4 4.6-5" />
              </svg>
              {t("landing.evidence.open.title")}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {openList.map((x) => (
                <li key={x} className="text-[13.5px] leading-relaxed text-ink/70">
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-panel border border-defer/30 bg-defer/5 p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-defer">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 4.8 3.2 19.2h17.6L12 4.8Z" />
                <path d="M12 10v4M12 16.6v.2" />
              </svg>
              {t("landing.evidence.todo.title")}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {todoList.map((x) => (
                <li key={x} className="text-[13.5px] leading-relaxed text-ink/70">
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="mt-16 rounded-panel border border-ink/10 bg-white/70 p-6 shadow-tile">
        <h2 className="font-display text-[24px] font-semibold">{t("landing.stack.title")}</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink/70">{t("landing.stack.body")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["RAD-DINO", "DINOv2", "PyTorch", "FastAPI", "Next.js", "Kaggle T4", "ONNX"].map((c) => (
            <span key={c} className="rounded-full border border-ink/15 bg-paper px-3 py-1 text-[12px] font-semibold text-ink/70">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Try */}
      <section className="mt-16 rounded-panel bg-film p-7 text-bone shadow-float sm:p-9">
        <h2 className="font-display text-[26px] font-semibold">{t("landing.try.title")}</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-bone/70">{t("landing.try.note")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={LIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-control bg-bone px-5 py-3 text-[14px] font-bold text-film transition-all hover:-translate-y-0.5"
          >
            {t("landing.try.full")} ↗
          </a>
          <a
            href={PAGES_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-control border border-bone/30 px-5 py-3 text-[14px] font-semibold text-bone transition-colors hover:border-bone/60"
          >
            {t("landing.try.static")} ↗
          </a>
          <Link
            href="/skrining"
            className="rounded-control px-5 py-3 text-[14px] font-semibold text-bone/70 transition-colors hover:text-bone"
          >
            {t("nav.screening")} →
          </Link>
        </div>
      </section>
    </main>
  );
}