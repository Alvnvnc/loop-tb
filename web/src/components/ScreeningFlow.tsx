"use client";

import { useRef, useState, type ReactNode } from "react";
import { BAND_UI, fmtPct, predict, type PredictResponse } from "@/lib/api";

type Patient = { name: string; age: string; sex: string; complaint: string };

const EMPTY_PATIENT: Patient = { name: "", age: "", sex: "", complaint: "" };

/** Contoh keluaran statis untuk peragaan tanpa server ML — selalu diberi label jelas. */
const DEMO_RESULT: PredictResponse = {
  p_tb: 0.42,
  band: "ragu",
  bands: { tau_low: 0.21, tau_high: 0.61 },
  arch: "arsip peragaan (bukan dari citra Anda)",
};

function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[16px] font-bold">
      <span className="grid h-7 w-7 place-items-center rounded-[6px] border border-ink/20 text-[13px] tabular-nums">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default function ScreeningFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [patient, setPatient] = useState<Patient>(EMPTY_PATIENT);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState("");
  const [overlay, setOverlay] = useState<"heatmap" | "original">("heatmap");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(f: File | null | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("File harus berupa citra (PNG/JPG).");
      return;
    }
    setError("");
    setResult(null);
    setSaved(false);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = demo ? DEMO_RESULT : await predict(file);
      setResult(r);
      setOverlay(r.heatmap_png_b64 ? "heatmap" : "original");
    } catch {
      setError(
        "Server model tidak terjangkau. Nyalakan mode peragaan untuk mendemokan alurnya, atau periksa koneksi API."
      );
    } finally {
      setLoading(false);
    }
  }

  function saveToCard() {
    if (!result) return;
    try {
      const cases = JSON.parse(localStorage.getItem("sigap.cases") ?? "[]");
      cases.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        name: patient.name.trim() || "Tanpa nama",
        age: patient.age,
        sex: patient.sex,
        p: result.p_tb,
        band: result.band,
        history: [],
      });
      localStorage.setItem("sigap.cases", JSON.stringify(cases));
      setSaved(true);
    } catch {
      setError("Tidak bisa menyimpan di perangkat ini (penyimpanan lokal diblokir).");
    }
  }

  const heat = result?.heatmap_png_b64 ? `data:image/png;base64,${result.heatmap_png_b64}` : "";
  const tone = result ? BAND_UI[result.band] : null;
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());

  return (
    <>
      <div className="print:hidden">
        {/* 1 — Citra */}
        <section className="mt-9">
          <StepTitle n={1}>Citra X-ray dada</StepTitle>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Pilih citra X-ray"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPick(e.dataTransfer.files?.[0]);
              }}
              className="mt-4 w-full rounded-[12px] border border-dashed border-ink/25 bg-white/60 px-6 py-12 text-center transition-colors hover:border-ink/45"
            >
              <span className="block text-[15px] font-semibold">Pilih foto X-ray</span>
              <span className="mt-1 block text-[13px] text-ink/55">
                PNG atau JPG, tampak depan (PA/AP). Tarik file ke sini atau ketuk untuk memilih.
              </span>
            </button>
          ) : (
            <div className="mt-4 rounded-[12px] border border-ink/15 bg-white/70 p-3">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Pratinjau X-ray"
                  className="h-28 w-28 rounded-[8px] bg-film object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{file.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink/55">
                    {(file.size / 1e6).toFixed(1)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-2 text-[13px] font-semibold underline decoration-ink/30 underline-offset-2 hover:text-ink"
                  >
                    Ganti citra
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2 — Data pasien */}
        <section className="mt-9">
          <StepTitle n={2}>Data pasien (opsional)</StepTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] font-medium text-ink/70">
              Nama atau kode pasien
              <input
                value={patient.name}
                onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                className="mt-1 w-full rounded-[8px] border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                placeholder="mis. S-014"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-medium text-ink/70">
                Usia
                <input
                  value={patient.age}
                  onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-[8px] border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                  placeholder="34"
                />
              </label>
              <label className="block text-[13px] font-medium text-ink/70">
                Jenis kelamin
                <select
                  value={patient.sex}
                  onChange={(e) => setPatient({ ...patient, sex: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                >
                  <option value="">—</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </label>
            </div>
            <label className="block text-[13px] font-medium text-ink/70 sm:col-span-2">
              Keluhan utama
              <input
                value={patient.complaint}
                onChange={(e) => setPatient({ ...patient, complaint: e.target.value })}
                className="mt-1 w-full rounded-[8px] border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                placeholder="mis. batuk 3 minggu, keringat malam"
              />
            </label>
          </div>
        </section>

        {/* Aksi */}
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={analyze}
            disabled={!file || loading}
            className="rounded-[8px] bg-ink px-6 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Menganalisis…" : "Analisis citra"}
          </button>
          <label className="flex items-center gap-2 text-[13px] text-ink/65">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            Mode peragaan (hasil contoh, bukan dari citra Anda)
          </label>
        </div>

        {loading && (
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink/10" role="status" aria-label="Menganalisis">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-ink/60" />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-[8px] border border-refer/30 bg-refer/5 px-4 py-3 text-[14px] text-refer">
            {error}
          </p>
        )}

        {/* Hasil — lightbox */}
        {result && tone && (
          <section className="reveal mt-10" aria-live="polite">
            <h2 className="text-[15px] font-bold">Hasil analisis</h2>
            <div className="mt-4 overflow-hidden rounded-[12px] bg-film text-bone">
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overlay === "heatmap" && heat ? heat : preview}
                  alt="X-ray dengan peta perhatian model"
                  className="absolute inset-0 h-full w-full object-contain"
                />
                {heat && (
                  <div className="absolute top-3 right-3 flex gap-1 rounded-[8px] bg-film/80 p-1">
                    {(
                      [
                        ["heatmap", "Peta perhatian"],
                        ["original", "Citra asli"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setOverlay(k)}
                        aria-pressed={overlay === k}
                        className={`rounded-[6px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                          overlay === k ? "bg-bone text-film" : "text-bone/70 hover:text-bone"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-bone/10 p-5 sm:p-6">
                <p className={`flex items-center gap-2 text-[13px] font-semibold ${tone.text}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
                  {tone.label}
                </p>
                <h3 className="mt-1.5 text-[26px] leading-tight font-extrabold sm:text-[32px]">
                  {tone.title}
                </h3>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-bone/85">{tone.action}</p>
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-bone/10 pt-4">
                  <div>
                    <dt className="text-[12px] text-bone/50">Estimasi p(TB)</dt>
                    <dd className="mt-0.5 text-[20px] font-bold tabular-nums">{fmtPct(result.p_tb)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-bone/50">Ambang ragu</dt>
                    <dd className="mt-0.5 text-[20px] font-bold tabular-nums">
                      {fmtPct(result.bands.tau_low)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-bone/50">Ambang rujuk</dt>
                    <dd className="mt-0.5 text-[20px] font-bold tabular-nums">
                      {fmtPct(result.bands.tau_high)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-[12px] leading-relaxed text-bone/50">
                  {result.arch ? `Model: ${result.arch}. ` : ""}
                  Ambang diambil dari titik sensitivitas-target pada data validasi (TPP WHO: sensitivitas
                  &gt;90%, spesifisitas &gt;70%).
                </p>
              </div>
            </div>

            {/* Penjelasan */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-[10px] border border-ink/12 bg-white/70 p-4">
                <h3 className="text-[14px] font-bold">Yang dilihat model</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink/70">
                  Area yang paling memengaruhi skor disorot pada peta perhatian — untuk diverifikasi
                  manusia, bukan dikutip sebagai bukti lesi.
                </p>
              </div>
              <div className="rounded-[10px] border border-defer/35 bg-defer/5 p-4">
                <h3 className="text-[14px] font-bold text-defer">Yang tidak ditunjukkan</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink/75">
                  Peta perhatian bukan bukti lesi. Model belum bisa membedakan bekas TB (scar) dari TB
                  aktif — karena itu pita ragu ada dan pembacaan manusia tetap wajib.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-[8px] bg-ink px-5 py-3 text-[14px] font-semibold text-paper hover:bg-ink/90"
              >
                Cetak surat rujukan
              </button>
              <button
                type="button"
                onClick={saveToCard}
                disabled={saved}
                className="rounded-[8px] border border-ink/20 px-5 py-3 text-[14px] font-semibold hover:border-ink/45 disabled:opacity-50"
              >
                {saved ? "Tersimpan di kartu pasien" : "Simpan ke kartu pasien"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSaved(false);
                  setFile(null);
                  setPreview("");
                }}
                className="rounded-[8px] px-5 py-3 text-[14px] font-semibold text-ink/60 hover:bg-ink/5 hover:text-ink"
              >
                Skrining baru
              </button>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-ink/55">
              Alat triase riset — <strong>bukan diagnosis</strong>. Hasil wajib dikonfirmasi tenaga
              kesehatan melalui pemeriksaan GeneXpert.
            </p>
          </section>
        )}
      </div>

      {/* Surat rujukan (hanya saat cetak) */}
      <div className="hidden print:block">
        <h1 className="text-[22px] font-extrabold">Surat Rujukan Skrining Tuberkulosis</h1>
        <p className="mt-1 text-[12px] text-ink/60">
          Prototipe riset SIGAP — bukan dokumen medis resmi.
        </p>
        <table className="mt-6 w-full border-collapse text-[14px]">
          <tbody>
            {[
              ["Tanggal", today],
              ["Fasilitas pengirim", "Puskesmas / posyandu: ____________________"],
              ["Pasien", patient.name || "____________________"],
              ["Usia / jenis kelamin", `${patient.age || "—"} / ${patient.sex || "—"}`],
              ["Keluhan", patient.complaint || "—"],
              ["Estimasi risiko TB", result ? fmtPct(result.p_tb) : "—"],
              ["Band triase", result ? BAND_UI[result.band].title : "—"],
              [
                "Ambang (ragu / rujuk)",
                result
                  ? `${fmtPct(result.bands.tau_low)} / ${fmtPct(result.bands.tau_high)}`
                  : "—",
              ],
            ].map(([k, v]) => (
              <tr key={k as string} className="border-b border-ink/15">
                <td className="w-56 py-2 pr-4 align-top font-semibold">{k}</td>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[14px] leading-relaxed">
          Mohon dilakukan pemeriksaan GeneXpert dan evaluasi klinis sesuai algoritma program TB
          nasional (TOSS-TB). Hasil skrining ini adalah alat bantu triase, bukan diagnosis.
        </p>
        <div className="mt-10 flex justify-between text-[14px]">
          <div>
            Petugas pengirim
            <div className="mt-14 w-56 border-t border-ink/40" />
          </div>
          <div>
            Penerima rujukan
            <div className="mt-14 w-56 border-t border-ink/40" />
          </div>
        </div>
      </div>
    </>
  );
}