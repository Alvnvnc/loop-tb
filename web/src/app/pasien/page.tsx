"use client";

import { useEffect, useMemo, useState } from "react";
import { BAND_META, fmtPct, type Band } from "@/lib/api";
import { useLang } from "@/lib/i18n";

type CheckIn = { date: string; med: boolean; symptoms: number; danger: string[]; note?: string };
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

function step(prev: number, h: CheckIn): number {
  const delta = (h.med ? -0.08 : 0.18) + 0.09 * h.symptoms + (h.danger.length ? 0.3 : 0);
  return Math.min(0.99, Math.max(0.01, prev + delta));
}

function riskOf(c: Case): number {
  let r = c.p;
  for (const h of [...c.history].reverse()) r = step(r, h);
  return r;
}

function StatusNode({ status }: { status: "done" | "active" | "next" }) {
  if (status === "done")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-clear text-white">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="m5.5 12.5 4 4L18.5 8" />
        </svg>
      </span>
    );
  if (status === "active")
    return <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-paper"><span className="h-2 w-2 rounded-full bg-ink" /></span>;
  return <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-ink/30" />;
}

export default function PasienPage() {
  const { t, lang } = useLang();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState<string>("demo");
  const [loaded, setLoaded] = useState(false);
  const [med, setMed] = useState(true);
  const [symptoms, setSymptoms] = useState(1);
  const [danger, setDanger] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const demoName = t("pat.demoName");
  const DEMO_CASE: Case = useMemo(
    () => ({
      id: "demo",
      date: new Date(Date.now() - 9 * 864e5).toISOString(),
      name: demoName,
      age: "45",
      sex: "F",
      p: 0.42,
      band: "ragu",
      history: [
        { date: new Date(Date.now() - 1 * 864e5).toISOString(), med: true, symptoms: 1, danger: [] },
        { date: new Date(Date.now() - 3 * 864e5).toISOString(), med: true, symptoms: 2, danger: [] },
        { date: new Date(Date.now() - 5 * 864e5).toISOString(), med: false, symptoms: 2, danger: [] },
      ],
    }),
    [demoName],
  );

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sigap.cases") ?? "[]") as Case[];
      setCases(stored);
      if (stored[0]) setSelectedId(stored[0].id);
    } catch {
      /* storage blocked */
    }
    setLoaded(true);
  }, []);

  const all = useMemo<Case[]>(() => [DEMO_CASE, ...cases], [DEMO_CASE, cases]);
  const selected = all.find((c) => c.id === selectedId) ?? DEMO_CASE;
  const risk = riskOf(selected);
  const escalate = risk >= 0.61;
  const meta = BAND_META[selected.band];

  const taken = selected.history.filter((h) => h.med).length;
  const missed = selected.history.length - taken;
  const latestSym = selected.history[0]?.symptoms ?? 0;
  const hasDanger = selected.history.some((h) => h.danger.length > 0);
  const insight =
    selected.history.length < 2
      ? t("pat.insight.low")
      : risk >= 0.61 || missed >= 2 || latestSym >= 3
        ? t("pat.insight.risk", { missed, symptoms: latestSym })
        : t("pat.insight.ok", { taken, total: selected.history.length });

  const bars = [...selected.history].reverse().slice(-14);
  const stages: { key: string; status: "done" | "active" | "next" }[] = [
    { key: "pat.stage.screening", status: "done" },
    { key: "pat.stage.referral", status: "done" },
    { key: "pat.stage.treatment", status: "active" },
    { key: "pat.stage.followup", status: "next" },
  ];

  function persist(next: Case) {
    if (next.id === "demo") return;
    const updated = cases.map((c) => (c.id === next.id ? next : c));
    setCases(updated);
    localStorage.setItem("sigap.cases", JSON.stringify(updated));
  }

  function addCheckIn() {
    const h: CheckIn = { date: new Date().toISOString(), med, symptoms, danger, note: note.trim() || undefined };
    const base =
      selected.id === "demo" ? { ...DEMO_CASE, id: crypto.randomUUID(), name: `${DEMO_CASE.name} ${t("pat.demoCopySuffix")}` } : selected;
    const next: Case = { ...base, history: [h, ...base.history] };
    if (selected.id === "demo") {
      const updated = [next, ...cases];
      setCases(updated);
      try {
        localStorage.setItem("sigap.cases", JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      setSelectedId(next.id);
    } else {
      persist(next);
    }
    setNote("");
    setDanger([]);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="pt-10">
        <h1 className="font-display text-[30px] font-semibold tracking-tight">{t("pat.title")}</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("pat.sub")}</p>
      </section>

      {/* Pemilih kasus */}
      <div className="mt-7 flex flex-wrap gap-2">
        {all.map((c) => {
          const dot = c.band === "rujuk_prioritas" ? "bg-refer" : c.band === "negatif_skrining" ? "bg-clear" : "bg-defer";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              aria-pressed={selected.id === c.id}
              className={`flex items-center gap-2 rounded-control border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                selected.id === c.id ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white/60 hover:border-ink/45"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
              {c.name}
            </button>
          );
        })}
        {loaded && cases.length === 0 && <span className="py-2 text-[13px] text-ink/50">{t("pat.empty")}</span>}
      </div>

      {/* Ringkasan */}
      <section className="reveal mt-6 rounded-panel border border-ink/10 bg-white/70 p-5 shadow-tile sm:p-6">
        <h2 className="font-display text-[22px] font-semibold leading-snug">{insight}</h2>
        <p className="mt-1.5 text-[13px] text-ink/55">
          {selected.age ? `${selected.age}` : "—"} · {selected.sex || "—"} · {t("cli.screeningDate")}{" "}
          {new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { dateStyle: "medium" }).format(new Date(selected.date))}
        </p>

        {escalate && (
          <p className="mt-4 flex items-start gap-2.5 rounded-tile border border-refer/35 bg-refer/5 px-4 py-3 text-[13.5px] font-semibold text-refer">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 4.8 3.2 19.2h17.6L12 4.8Z" />
              <path d="M12 10v4M12 16.6v.2" />
            </svg>
            {t("pat.escalation")}
          </p>
        )}

        {/* Stat tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [fmtPct(risk), t("pat.stat.risk"), risk >= 0.61 ? "text-refer" : risk >= 0.3 ? "text-defer" : "text-clear"],
            [String(selected.history.length), t("pat.stat.checkins"), ""],
            [selected.history.length ? fmtPct(taken / selected.history.length) : "—", t("pat.stat.ontime"), ""],
            [hasDanger ? t("pat.yes") : t("pat.no"), t("pat.stat.danger"), hasDanger ? "text-refer" : "text-clear"],
          ].map(([v, label, tone]) => (
            <div key={label as string} className="rounded-tile border border-ink/10 bg-paper/70 p-3">
              <p className={`font-display text-[24px] font-semibold leading-none tabular-nums ${tone}`}>{v}</p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink/55">{label}</p>
            </div>
          ))}
        </div>

        {/* Bar 14 check-in */}
        {bars.length > 0 && (
          <div className="mt-5 rounded-tile border border-ink/10 bg-paper/70 p-4">
            <p className="text-[12px] font-bold text-ink/60">{t("pat.window")}</p>
            <div className="mt-3 flex items-end gap-1.5">
              {bars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${h.danger.length ? "bg-refer" : "bg-transparent"}`} />
                  <span
                    className={`w-full max-w-[14px] rounded-[3px] ${h.med ? "bg-clear/85" : "bg-refer/85"}`}
                    style={{ height: `${10 + h.symptoms * 7}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex gap-4 text-[11px] text-ink/55">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-clear" /> {t("pat.legend.taken")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-refer" /> {t("pat.legend.missed")}
              </span>
            </div>
          </div>
        )}

        {/* Timeline perawatan */}
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-[12px] font-bold text-ink/60">{t("pat.timeline.title")}</p>
            <ol className="mt-3 space-y-3">
              {stages.map((s) => (
                <li key={s.key} className="flex items-start gap-3">
                  <StatusNode status={s.status} />
                  <div className={s.status === "next" ? "opacity-45" : ""}>
                    <p className="text-[13.5px] font-semibold leading-snug">{t(s.key)}</p>
                    <p className="text-[11.5px] text-ink/50">
                      {s.status === "done" ? t("pat.status.done") : s.status === "active" ? t("pat.status.active") : t("pat.status.next")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-[12px] font-bold text-ink/60">{t("pat.checkin.title")}</p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2.5 text-[13.5px]">
                <input type="checkbox" checked={med} onChange={(e) => setMed(e.target.checked)} className="h-4 w-4 accent-ink" />
                {t("pat.checkin.med")}
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px]">
                {t("pat.checkin.symptoms")}
                <select
                  value={symptoms}
                  onChange={(e) => setSymptoms(Number(e.target.value))}
                  className="rounded-[7px] border border-ink/20 bg-white px-2 py-1.5 text-[13.5px]"
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {["d1", "d2", "d3"].map((d) => {
                  const label = t(`pat.checkin.${d}`);
                  const on = danger.includes(label);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDanger(on ? danger.filter((x) => x !== label) : [...danger, label])}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        on ? "border-refer bg-refer/10 text-refer" : "border-ink/20 text-ink/60 hover:border-ink/45"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("pat.checkin.note")}
                  className="min-w-0 flex-1 rounded-control border border-ink/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink/50"
                />
                <button
                  type="button"
                  onClick={addCheckIn}
                  className="rounded-control bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper transition-colors hover:bg-ink/90"
                >
                  {t("pat.checkin.save")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat */}
        {selected.history.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-5">
            <p className="text-[12px] font-bold text-ink/60">{t("pat.history.title")}</p>
            <ul className="mt-3 space-y-2">
              {selected.history.map((h, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13.5px] text-ink/75">
                  <span className="tabular-nums text-ink/50">
                    {new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { dateStyle: "medium" }).format(new Date(h.date))}
                  </span>
                  <span className={h.med ? "text-clear" : "font-semibold text-refer"}>
                    {h.med ? t("pat.history.med") : t("pat.history.missed")}
                  </span>
                  <span>{t("pat.history.symptoms", { n: h.symptoms })}</span>
                  {h.danger.map((d) => (
                    <span key={d} className="font-semibold text-refer">
                      {d}
                    </span>
                  ))}
                  {h.note && <span className="text-ink/55">“{h.note}”</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-[11.5px] leading-relaxed text-ink/45">{t("pat.note")}</p>
      </section>

      <p className="mt-4 flex items-center gap-2 text-[12.5px] text-ink/60">
        <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
        {t(meta.titleKey)}
      </p>
    </main>
  );
}