"use client";

import { useEffect, useMemo, useState } from "react";
import { BAND_UI, fmtPct, type Band } from "@/lib/api";

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

const DANGER = ["Batuk darah", "Sesak napas", "Demam tinggi"];

const DEMO_CASE: Case = {
  id: "demo",
  date: new Date(Date.now() - 9 * 864e5).toISOString(),
  name: "Contoh peragaan — Ibu S",
  age: "45",
  sex: "P",
  p: 0.42,
  band: "ragu",
  history: [
    { date: new Date(Date.now() - 1 * 864e5).toISOString(), med: true, symptoms: 1, danger: [] },
    { date: new Date(Date.now() - 3 * 864e5).toISOString(), med: true, symptoms: 2, danger: [] },
    { date: new Date(Date.now() - 5 * 864e5).toISOString(), med: false, symptoms: 2, danger: [] },
  ],
};

function step(prev: number, h: CheckIn): number {
  const delta = (h.med ? -0.08 : 0.18) + 0.09 * h.symptoms + (h.danger.length ? 0.3 : 0);
  return Math.min(0.99, Math.max(0.01, prev + delta));
}

function seriesOf(c: Case): number[] {
  const out = [c.p];
  for (const h of [...c.history].reverse()) out.push(step(out[out.length - 1], h));
  return out;
}

function Sparkline({ values }: { values: number[] }) {
  const w = 160;
  const h = 40;
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? w : (i / (values.length - 1)) * w;
      const y = h - v * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-40" role="img" aria-label="Tren risiko">
      <line x1="0" y1={h - 0.61 * h} x2={w} y2={h - 0.61 * h} stroke="#b7791f" strokeDasharray="3 3" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="#14181d" strokeWidth="2" />
    </svg>
  );
}

export default function PasienPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState<string>("demo");
  const [loaded, setLoaded] = useState(false);
  const [med, setMed] = useState(true);
  const [symptoms, setSymptoms] = useState(1);
  const [danger, setDanger] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sigap.cases") ?? "[]") as Case[];
      setCases(stored);
      if (stored[0]) setSelectedId(stored[0].id);
    } catch {
      /* penyimpanan diblokir — tetap tampilkan contoh */
    }
    setLoaded(true);
  }, []);

  const all = useMemo<Case[]>(() => [DEMO_CASE, ...cases], [cases]);
  const selected = all.find((c) => c.id === selectedId) ?? DEMO_CASE;
  const risk = seriesOf(selected).at(-1) ?? selected.p;
  const escalate = risk >= 0.61;
  const tone = BAND_UI[selected.band];

  function persist(next: Case) {
    if (next.id === "demo") return;
    const updated = cases.map((c) => (c.id === next.id ? next : c));
    setCases(updated);
    localStorage.setItem("sigap.cases", JSON.stringify(updated));
  }

  function addCheckIn() {
    const h: CheckIn = { date: new Date().toISOString(), med, symptoms, danger, note: note.trim() || undefined };
    const base = selected.id === "demo" ? { ...DEMO_CASE, id: crypto.randomUUID(), name: DEMO_CASE.name + " (salinan)" } : selected;
    const next: Case = { ...base, history: [h, ...base.history] };
    if (selected.id === "demo") {
      const updated = [next, ...cases];
      setCases(updated);
      try {
        localStorage.setItem("sigap.cases", JSON.stringify(updated));
      } catch {
        /* abaikan */
      }
      setSelectedId(next.id);
    } else {
      persist(next);
    }
    setNote("");
    setDanger([]);
  }

  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-10">
        <h1 className="text-[26px] font-extrabold tracking-tight">Pendampingan pasien</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">
          Kartu pasien menyambung skrining ke pengobatan: check-in harian memperbarui risiko dan
          memicu eskalasi bila memburuk.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {all.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            aria-pressed={selected.id === c.id}
            className={`rounded-[8px] border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              selected.id === c.id ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/45"
            }`}
          >
            {c.name}
          </button>
        ))}
        {loaded && cases.length === 0 && (
          <span className="py-2 text-[13px] text-ink/50">
            Belum ada kartu tersimpan — menyimpan dari halaman Skrining akan muncul di sini.
          </span>
        )}
      </div>

      <section className="reveal mt-6 rounded-[12px] border border-ink/15 bg-white/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-extrabold">{selected.name}</h2>
            <p className="mt-0.5 text-[13px] text-ink/60">
              {selected.age ? `${selected.age} th` : "usia —"} · {selected.sex || "—"} · skrining{" "}
              {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(selected.date))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-ink/55">Risiko saat ini</p>
            <p className="text-[24px] font-extrabold tabular-nums">{fmtPct(risk)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-ink/10 pt-4">
          <Sparkline values={seriesOf(selected)} />
          <div className="text-[13px] leading-relaxed text-ink/70">
            <p className="flex items-center gap-2 font-semibold">
              <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
              {tone.title}
            </p>
            <p className="mt-1">
              Garis putus-putus = ambang rujuk (61%).{" "}
              {selected.history.length < 2 ? "Data check-in masih sedikit." : ""}
            </p>
          </div>
        </div>

        {escalate && (
          <p className="mt-4 rounded-[8px] border border-refer/35 bg-refer/5 px-4 py-3 text-[14px] font-semibold text-refer">
            Eskalasi: risiko menembus ambang. Kunjungi atau telepon pasien hari ini; pertimbangkan
            rujukan ulang.
          </p>
        )}

        {/* Check-in */}
        <div className="mt-6 border-t border-ink/10 pt-5">
          <h3 className="text-[14px] font-bold">Check-in hari ini</h3>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={med} onChange={(e) => setMed(e.target.checked)} className="h-4 w-4 accent-ink" />
              Minum obat sesuai jadwal
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              Gejala (0–3)
              <select
                value={symptoms}
                onChange={(e) => setSymptoms(Number(e.target.value))}
                className="rounded-[6px] border border-ink/20 bg-white px-2 py-1.5 text-[14px]"
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {DANGER.map((d) => (
              <label key={d} className="flex items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={danger.includes(d)}
                  onChange={(e) =>
                    setDanger(e.target.checked ? [...danger, d] : danger.filter((x) => x !== d))
                  }
                  className="h-4 w-4 accent-ink"
                />
                {d}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan singkat (opsional)"
              className="min-w-0 flex-1 rounded-[8px] border border-ink/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink/50"
            />
            <button
              type="button"
              onClick={addCheckIn}
              className="rounded-[8px] bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper hover:bg-ink/90"
            >
              Simpan check-in
            </button>
          </div>
        </div>

        {/* Riwayat */}
        {selected.history.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-5">
            <h3 className="text-[14px] font-bold">Riwayat check-in</h3>
            <ul className="mt-3 space-y-2">
              {selected.history.map((h, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px] text-ink/75">
                  <span className="tabular-nums text-ink/50">
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(h.date))}
                  </span>
                  <span className={h.med ? "text-clear" : "font-semibold text-refer"}>
                    {h.med ? "obat ✓" : "obat terlewat"}
                  </span>
                  <span>gejala {h.symptoms}/3</span>
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

        <p className="mt-6 text-[12px] leading-relaxed text-ink/50">
          Catatan metodologis: pembaruan risiko di halaman ini memakai aturan peragaan sederhana
          (kepatuhan −8%, gejala +9%/poin, tanda bahaya +30%) untuk mendemonstrasikan loop — bukan
          model terlatih. Versi berikutnya memakai state risiko yang sama dengan mesin skrining.
        </p>
      </section>
    </main>
  );
}