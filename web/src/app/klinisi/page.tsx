"use client";

import { useEffect, useMemo, useState } from "react";
import { BAND_UI, fmtPct, type Band } from "@/lib/api";

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
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sigap.cases") ?? "[]") as Case[];
      setCases(stored);
      if (stored[0]) setSelectedId(stored[0].id);
    } catch {
      /* abaikan */
    }
  }, []);

  const selected = useMemo(() => cases.find((c) => c.id === selectedId), [cases, selectedId]);
  const adherence = useMemo(() => {
    if (!selected || selected.history.length === 0) return null;
    const taken = selected.history.filter((h) => h.med).length;
    return taken / selected.history.length;
  }, [selected]);

  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-10 print:hidden">
        <h1 className="text-[26px] font-extrabold tracking-tight">Ringkasan klinisi</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">
          Satu halaman untuk pembacaan ulang dan tindak lanjut: hasil skrining, kepatuhan, dan
          tanda eskalasi.
        </p>
      </section>

      {cases.length === 0 ? (
        <p className="mt-8 text-[15px] text-ink/60">
          Belum ada kasus tersimpan. Simpan hasil dari halaman <a className="underline" href="/skrining">Skrining</a>{" "}
          terlebih dahulu.
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
                className={`rounded-[8px] border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  selectedId === c.id ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/45"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {selected && (
            <section className="reveal mt-6 rounded-[12px] border border-ink/15 bg-white/70 p-5 sm:p-6 print:border-0">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-extrabold">{selected.name}</h2>
                  <p className="mt-0.5 text-[13px] text-ink/60">
                    {selected.age || "—"} th · {selected.sex || "—"} · skrining{" "}
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(selected.date))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-2 text-[13px] font-semibold">
                    <span className={`inline-block h-2 w-2 rounded-full ${BAND_UI[selected.band].dot}`} />
                    {BAND_UI[selected.band].title}
                  </p>
                  <p className="text-[13px] text-ink/60 tabular-nums">p(TB) awal {fmtPct(selected.p)}</p>
                </div>
              </header>

              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink/10 pt-4 sm:grid-cols-4">
                <div>
                  <dt className="text-[12px] text-ink/55">Check-in tercatat</dt>
                  <dd className="text-[18px] font-bold tabular-nums">{selected.history.length}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink/55">Kepatuhan obat</dt>
                  <dd className="text-[18px] font-bold tabular-nums">
                    {adherence === null ? "—" : fmtPct(adherence)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink/55">Gejala terakhir</dt>
                  <dd className="text-[18px] font-bold tabular-nums">
                    {selected.history[0] ? `${selected.history[0].symptoms}/3` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink/55">Tanda bahaya</dt>
                  <dd className="text-[18px] font-bold">
                    {selected.history.some((h) => h.danger.length > 0) ? (
                      <span className="text-refer">Ada</span>
                    ) : (
                      <span className="text-clear">Tidak</span>
                    )}
                  </dd>
                </div>
              </dl>

              {selected.history.some((h) => h.danger.length > 0) && (
                <p className="mt-5 rounded-[8px] border border-refer/35 bg-refer/5 px-4 py-3 text-[14px] font-semibold text-refer">
                  Perhatian: pasien melaporkan tanda bahaya ({selected.history.flatMap((h) => h.danger).slice(0, 3).join(", ")}).
                  Pertimbangkan evaluasi klinis segera.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-[8px] bg-ink px-5 py-3 text-[14px] font-semibold text-paper hover:bg-ink/90"
                >
                  Cetak ringkasan
                </button>
              </div>

              <p className="mt-6 text-[12px] leading-relaxed text-ink/50">
                Ringkasan prototipe riset — bukan rekam medis. Sumber angka: state risiko skrining +
                log peragaan check-in.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}