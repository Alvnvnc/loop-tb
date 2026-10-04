"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BAND_META, fmtPct, type Band } from "@/lib/api";
import { useLang } from "@/lib/i18n";

type CheckIn = { date: string; med: boolean; symptoms: number; danger: string[] };
type Case = {
  id: string;
  date: string;
  name: string;
  age?: string;
  sex?: string;
  p: number;
  band: Band;
  history: CheckIn[];
};

export default function KlinisiPage() {
  const { t, lang } = useLang();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sigap.cases") ?? "[]") as Case[];
      setCases(stored);
      if (stored[0]) setSelectedId(stored[0].id);
    } catch {
      /* ignore */
    }
  }, []);

  const selected = useMemo(() => cases.find((c) => c.id === selectedId), [cases, selectedId]);
  const adherence = useMemo(() => {
    if (!selected || selected.history.length === 0) return null;
    return selected.history.filter((h) => h.med).length / selected.history.length;
  }, [selected]);
  const dangerList = selected?.history.flatMap((h) => h.danger).slice(0, 3) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="pt-10 print:hidden">
        <h1 className="font-display text-[30px] font-semibold tracking-tight">{t("cli.title")}</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("cli.sub")}</p>
      </section>

      {cases.length === 0 ? (
        <p className="mt-8 text-[15px] text-ink/60">
          {t("cli.empty")} <Link className="underline" href="/skrining">{t("nav.screening")}</Link>
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2 print:hidden">
            {cases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-pressed={selectedId === c.id}
                className={`rounded-control border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  selectedId === c.id ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white/60 hover:border-ink/45"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {selected && (
            <section className="reveal mt-6 rounded-panel border border-ink/10 bg-white/70 p-5 shadow-tile sm:p-6 print:border-0 print:shadow-none">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[24px] font-semibold">{selected.name}</h2>
                  <p className="mt-0.5 text-[13px] text-ink/60">
                    {selected.age || "—"} · {selected.sex || "—"} · {t("cli.screeningDate")}{" "}
                    {new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { dateStyle: "long" }).format(new Date(selected.date))}
                  </p>
                </div>
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className={`inline-block h-2 w-2 rounded-full ${BAND_META[selected.band].dot}`} />
                  {t(BAND_META[selected.band].titleKey)}
                </p>
              </header>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [String(selected.history.length), t("cli.tile.checkins"), ""],
                  [adherence === null ? "—" : fmtPct(adherence), t("cli.tile.adherence"), ""],
                  [selected.history[0] ? `${selected.history[0].symptoms}/3` : "—", t("cli.tile.symptoms"), ""],
                  [
                    dangerList.length ? t("pat.yes") : t("pat.no"),
                    t("cli.tile.danger"),
                    dangerList.length ? "text-refer" : "text-clear",
                  ],
                ].map(([v, label, tone]) => (
                  <div key={label as string} className="rounded-tile border border-ink/10 bg-paper/70 p-3">
                    <p className={`font-display text-[24px] font-semibold leading-none tabular-nums ${tone}`}>{v}</p>
                    <p className="mt-1.5 text-[11.5px] leading-snug text-ink/55">{label}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[13px] text-ink/60">
                {t("scr.scale.ptb")}: <span className="font-semibold tabular-nums text-ink">{fmtPct(selected.p)}</span>
              </p>

              {dangerList.length > 0 && (
                <p className="mt-5 flex items-start gap-2.5 rounded-tile border border-refer/35 bg-refer/5 px-4 py-3 text-[13.5px] font-semibold text-refer">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 4.8 3.2 19.2h17.6L12 4.8Z" />
                    <path d="M12 10v4M12 16.6v.2" />
                  </svg>
                  {t("cli.alert", { list: dangerList.join(", ") })}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-control bg-ink px-5 py-3 text-[14px] font-semibold text-paper transition-colors hover:bg-ink/90"
                >
                  {t("cli.print")}
                </button>
              </div>

              <p className="mt-6 text-[11.5px] leading-relaxed text-ink/45">{t("cli.note")}</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}