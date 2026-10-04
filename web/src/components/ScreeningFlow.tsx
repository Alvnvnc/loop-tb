"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BAND_META, fmtPct, predict, type Band, type PredictResponse } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Patient = { name: string; age: string; sex: string; complaint: string };

const EMPTY_PATIENT: Patient = { name: "", age: "", sex: "", complaint: "" };

const DEMO_RESULT: PredictResponse = {
  p_tb: 0.42,
  band: "ragu",
  bands: { tau_low: 0.21, tau_high: 0.61 },
  arch: "demo archive (not from your image)",
};

type GalleryCase = {
  id: string;
  title: string;
  desc: string;
  label: string;
  image: string;
  result: string;
  band: Band;
  p: number;
  u: number;
};

const CASE_KEY: Record<string, string> = {
  chncxr_0338_1: "a",
  chncxr_0178_0: "b",
  chncxr_0495_1: "c",
  mcucxr_0044_0: "d",
};

function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[15px] font-bold">
      <span className="grid h-7 w-7 place-items-center rounded-control border border-ink/20 text-[13px] tabular-nums">
        {n}
      </span>
      {children}
    </h2>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-clear" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="m5.5 12.5 4 4L18.5 8" />
    </svg>
  );
}

function XRayGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 text-ink/35" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="7" y="5" width="34" height="38" rx="3" />
      <path d="M24 10v28" />
      <path d="M24 13c-5 0-8 3-8 8 0 4 2 7 5 9 1.5 1 2.2 3 2.2 6" />
      <path d="M24 13c5 0 8 3 8 8 0 4-2 7-5 9-1.5 1-2.2 3-2.2 6" />
      <path d="M20 13.5 24 15l4-1.5" />
    </svg>
  );
}

function ProbScale({
  p,
  u,
  tauLow,
  tauHigh,
}: {
  p: number;
  u: number;
  tauLow: number;
  tauHigh: number;
}) {
  const { t } = useLang();
  const left = (x: number) => `${Math.min(100, Math.max(0, x * 100))}%`;
  const lo = Math.max(0, p - u);
  const hi = Math.min(1, p + u);
  return (
    <div className="rounded-tile border border-bone/12 bg-bone/[0.04] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-bone/55">{t("scr.scale.ptb")}</span>
        <span className="font-display text-[38px] font-semibold leading-none tabular-nums">{fmtPct(p)}</span>
      </div>
      <div className="relative mt-4">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-bone/10">
          <span className="absolute inset-y-0 left-0 bg-clear/80" style={{ width: left(tauLow) }} />
          <span className="absolute inset-y-0 bg-defer/80" style={{ left: left(tauLow), width: left(Math.max(0, tauHigh - tauLow)) }} />
          <span className="absolute inset-y-0 right-0 bg-refer/80" style={{ left: left(tauHigh) }} />
        </div>
        {u > 0 && (
          <div
            className="absolute -bottom-[8px] h-[4px] rounded-full bg-bone/70"
            style={{ left: left(lo), width: `${Math.max(0.8, (hi - lo) * 100)}%` }}
            title={t("scr.scale.unc")}
          />
        )}
        <div className="absolute -top-[6px] h-[22px]" style={{ left: `calc(${left(p)} - 2px)` }}>
          <div className="grow-x h-full w-[4px] rounded-full bg-bone" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-bone/55">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-clear" />
          {t("scr.scale.low")} &lt; {fmtPct(tauLow)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-defer" />
          {t("scr.scale.tauLow")} {fmtPct(tauLow)}–{fmtPct(tauHigh)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-refer" />
          {t("scr.scale.tauHigh")} ≥ {fmtPct(tauHigh)}
        </span>
        {u > 0 && <span className="ml-auto tabular-nums">{t("scr.scale.unc")}: ±{fmtPct(u, 1)}</span>}
      </div>
    </div>
  );
}

function FindingCard({ title, body, tone = "bone" }: { title: string; body: string; tone?: "bone" | "defer" }) {
  return (
    <div className={`rounded-tile border p-4 ${tone === "defer" ? "border-defer/40 bg-defer/10" : "border-bone/12 bg-bone/[0.04]"}`}>
      <h3 className={`text-[13px] font-bold ${tone === "defer" ? "text-[#e5b95c]" : "text-bone"}`}>{title}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-bone/70">{body}</p>
    </div>
  );
}

export default function ScreeningFlow() {
  const { t, lang } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<GalleryCase[]>([]);
  const [caseId, setCaseId] = useState("");
  const [preview, setPreview] = useState("");
  const [patient, setPatient] = useState<Patient>(EMPTY_PATIENT);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState("");
  const [overlay, setOverlay] = useState<"heatmap" | "original">("heatmap");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/cases/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setGallery(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  async function openCase(c: GalleryCase) {
    try {
      const r = await fetch(`${BASE_PATH}/cases/${c.result}`);
      if (!r.ok) throw new Error("load");
      const data = (await r.json()) as PredictResponse;
      setPreview(`${BASE_PATH}/cases/${c.image}`);
      setResult(data);
      setOverlay("heatmap");
      setCaseId(c.id);
      setSaved(false);
      setError("");
    } catch {
      setError(t("scr.error"));
    }
  }

  function onPick(f: File | null | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError(t("scr.error"));
      return;
    }
    setError("");
    setResult(null);
    setSaved(false);
    setCaseId("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setPreview("");
    setResult(null);
    setSaved(false);
    setCaseId("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = demo ? DEMO_RESULT : await predict(file);
      setCaseId("");
      setResult(r);
      setOverlay(r.heatmap_png_b64 ? "heatmap" : "original");
    } catch {
      setError(t("scr.error"));
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
        name: patient.name.trim() || "—",
        age: patient.age,
        sex: patient.sex,
        p: result.p_tb,
        band: result.band,
        history: [],
      });
      localStorage.setItem("sigap.cases", JSON.stringify(cases));
      setSaved(true);
    } catch {
      setError(t("scr.error"));
    }
  }

  const heat = result?.heatmap_png_b64 ? `data:image/png;base64,${result.heatmap_png_b64}` : "";
  const meta = result ? BAND_META[result.band] : null;
  const today = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { dateStyle: "long" }).format(new Date());
  const uncDeferred =
    result && result.bands.tau_uncertainty !== undefined && result.uncertainty !== undefined
      ? result.uncertainty > result.bands.tau_uncertainty
      : false;

  return (
    <>
      <div className="print:hidden">
        <section className="pt-10">
          <h1 className="font-display text-[30px] font-semibold tracking-tight">{t("scr.title")}</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("scr.sub")}</p>
        </section>

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-5">
        {/* Galeri contoh arsip (mobile: di atas; desktop: rail kanan) */}
        {gallery.length > 0 && (
          <section className="mt-8 rounded-panel border border-ink/10 bg-white/60 p-4 shadow-tile sm:p-5 lg:hidden">
            <h2 className="text-[15px] font-bold">{t("scr.gallery.title")}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/60">{t("scr.gallery.desc")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {gallery.map((c) => {
                const key = CASE_KEY[c.id];
                const title = key ? t(`scr.case.${key}.title`) : c.title;
                const desc = key ? t(`scr.case.${key}.desc`) : c.desc;
                const dot = c.band === "rujuk_prioritas" ? "bg-refer" : c.band === "negatif_skrining" ? "bg-clear" : "bg-defer";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCase(c)}
                    aria-pressed={caseId === c.id}
                    className={`rounded-tile border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-tile ${
                      caseId === c.id ? "border-ink bg-ink/5" : "border-ink/15 bg-paper/60 hover:border-ink/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                      {title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-ink/60">{desc}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 1 — Citra */}
        <section className="mt-9">
          <StepTitle n={1}>{t("scr.step1")}</StepTitle>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={t("scr.drop.title")}
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
              className="mt-4 flex w-full flex-col items-center gap-3 rounded-panel border border-dashed border-ink/20 bg-white/60 px-6 py-10 text-center transition-colors hover:border-ink/40"
            >
              <XRayGlyph />
              <span className="text-[15px] font-semibold">{t("scr.drop.title")}</span>
              <span className="max-w-sm text-[13px] text-ink/55">{t("scr.drop.hint")}</span>
            </button>
          ) : (
            <div className="mt-4 rounded-panel border border-ink/12 bg-white/70 p-3 shadow-tile">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-24 w-24 rounded-tile bg-film object-contain" />
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label={t("scr.remove")}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-ink/15 bg-paper text-ink/60 transition-colors hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="m7 7 10 10M17 7 7 17" />
                    </svg>
                  </button>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="truncate text-[14px] font-semibold">{file.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink/55">{(file.size / 1e6).toFixed(1)} MB</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-2 text-[13px] font-semibold underline decoration-ink/30 underline-offset-2 hover:text-ink"
                  >
                    {t("scr.change")}
                  </button>
                </div>
              </div>
              <div className="mt-3 rounded-tile bg-mist px-4 py-3">
                <p className="text-[12px] font-bold text-ink/70">{t("scr.guide.title")}</p>
                <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className="flex items-center gap-2 text-[12.5px] text-ink/65">
                      <CheckIcon />
                      {t(`scr.guide.${n}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* 2 — Data pasien */}
        <section className="mt-9">
          <StepTitle n={2}>{t("scr.step2")}</StepTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] font-medium text-ink/70">
              {t("scr.field.name")}
              <input
                value={patient.name}
                onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                className="mt-1 w-full rounded-control border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                placeholder={t("scr.field.name.ph")}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-medium text-ink/70">
                {t("scr.field.age")}
                <input
                  value={patient.age}
                  onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-control border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                  placeholder="34"
                />
              </label>
              <label className="block text-[13px] font-medium text-ink/70">
                {t("scr.field.sex")}
                <select
                  value={patient.sex}
                  onChange={(e) => setPatient({ ...patient, sex: e.target.value })}
                  className="mt-1 w-full rounded-control border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                >
                  <option value="">—</option>
                  <option value="L">{t("scr.sex.m")}</option>
                  <option value="P">{t("scr.sex.f")}</option>
                </select>
              </label>
            </div>
            <label className="block text-[13px] font-medium text-ink/70 sm:col-span-2">
              {t("scr.field.complaint")}
              <input
                value={patient.complaint}
                onChange={(e) => setPatient({ ...patient, complaint: e.target.value })}
                className="mt-1 w-full rounded-control border border-ink/20 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink/50"
                placeholder={t("scr.field.complaint.ph")}
              />
            </label>
          </div>
        </section>

        {/* Aksi */}
        <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={analyze}
            disabled={!file || loading}
            className="w-full whitespace-nowrap rounded-control bg-ink px-6 py-3.5 text-[15px] font-semibold text-paper shadow-tile transition-all hover:-translate-y-0.5 hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
          >
            {loading ? t("scr.analyzing") : t("scr.analyze")}
          </button>
          <label className="flex items-center gap-2 text-[13px] text-ink/65">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="h-4 w-4 accent-ink" />
            {t("scr.demo")}
          </label>
        </div>
        <p className="mt-4 text-[12px] text-ink/45">{t("scr.trust")}</p>

        {loading && (
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink/10" role="status" aria-label={t("scr.analyzing")}>
            <div className="h-full w-1/3 animate-pulse rounded-full bg-ink/60" />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-control border border-refer/30 bg-refer/5 px-4 py-3 text-[14px] text-refer">
            {error}
          </p>
        )}
          </div>

          {/* Rail kanan (desktop): galeri saat kosong, hasil setelah analisis */}
          <div className="lg:col-span-7">
        {(!result || !meta) && gallery.length > 0 && (
          <section className="mt-8 hidden rounded-panel border border-ink/10 bg-white/60 p-4 shadow-tile sm:p-5 lg:mt-9 lg:block">
            <h2 className="text-[15px] font-bold">{t("scr.gallery.title")}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/60">{t("scr.gallery.desc")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {gallery.map((c) => {
                const key = CASE_KEY[c.id];
                const title = key ? t(`scr.case.${key}.title`) : c.title;
                const desc = key ? t(`scr.case.${key}.desc`) : c.desc;
                const dot = c.band === "rujuk_prioritas" ? "bg-refer" : c.band === "negatif_skrining" ? "bg-clear" : "bg-defer";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCase(c)}
                    aria-pressed={caseId === c.id}
                    className={`rounded-tile border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-tile ${
                      caseId === c.id ? "border-ink bg-ink/5" : "border-ink/15 bg-paper/60 hover:border-ink/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                      {title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-ink/60">{desc}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {(!result || !meta) && (
          <div className="mt-6 hidden rounded-panel border border-dashed border-ink/20 bg-film/[0.03] px-6 py-12 text-center lg:block">
            <div className="mx-auto h-2.5 w-52 overflow-hidden rounded-full bg-[linear-gradient(90deg,#2e7d5b_0%,#2e7d5b_2%,#b7791f_10%,#c0392b_30%,#c0392b_100%)] opacity-70" />
            <p className="mt-4 text-[14px] font-semibold text-ink/60">{t("scr.resultPlaceholder")}</p>
          </div>
        )}
        {result && meta && (
          <section className="reveal mt-10 lg:mt-9" aria-live="polite">
            <h2 className="text-[15px] font-bold">{t("scr.result")}</h2>
            <div className="mt-4 overflow-hidden rounded-panel bg-film text-bone shadow-float">
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overlay === "heatmap" && heat ? heat : preview}
                  alt={t("scr.overlay.heat")}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                {heat && (
                  <div className="absolute top-3 right-3 flex gap-1 rounded-control bg-film/80 p-1">
                    {(
                      [
                        ["heatmap", t("scr.overlay.heat")],
                        ["original", t("scr.overlay.orig")],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setOverlay(k)}
                        aria-pressed={overlay === k}
                        className={`rounded-[7px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
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
                <p className={`flex items-center gap-2 text-[12.5px] font-bold ${meta.text}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                  {t(meta.labelKey)}
                </p>
                <h3 className="font-display mt-1 text-[28px] font-semibold leading-tight sm:text-[34px]">{t(meta.titleKey)}</h3>
                <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-bone/85">{t(meta.actionKey)}</p>

                <div className="mt-5">
                  <ProbScale p={result.p_tb} u={result.uncertainty ?? 0} tauLow={result.bands.tau_low} tauHigh={result.bands.tau_high} />
                </div>

                <div className="mt-3 grid gap-3">
                  <FindingCard title={t("scr.card.observed.title")} body={t("scr.card.observed.body")} />
                  <FindingCard title={t("scr.card.notshown.title")} body={t("scr.card.notshown.body")} />
                  <FindingCard
                    title={t("scr.card.unc.title")}
                    body={
                      uncDeferred
                        ? t("scr.card.unc.body", { u: fmtPct(result.uncertainty ?? 0, 1) })
                        : t("scr.card.unc.low", { u: fmtPct(result.uncertainty ?? 0, 1) })
                    }
                    tone={uncDeferred ? "defer" : "bone"}
                  />
                </div>

                {caseId && (
                  <p className="mt-4 rounded-tile border border-bone/12 bg-bone/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-bone/60">
                    {t("scr.archiveNote")}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3 border-t border-bone/10 pt-5">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-control bg-bone px-5 py-3 text-[14px] font-bold text-film transition-all hover:-translate-y-0.5"
                  >
                    {t("scr.action.print")}
                  </button>
                  <button
                    type="button"
                    onClick={saveToCard}
                    disabled={saved}
                    className="rounded-control border border-bone/30 px-5 py-3 text-[14px] font-semibold text-bone transition-colors hover:border-bone/60 disabled:opacity-50"
                  >
                    {saved ? t("scr.action.saved") : t("scr.action.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setSaved(false);
                      setCaseId("");
                      clearFile();
                    }}
                    className="rounded-control px-5 py-3 text-[14px] font-semibold text-bone/60 transition-colors hover:text-bone"
                  >
                    {t("scr.action.new")}
                  </button>
                </div>

                <p className="mt-4 text-[11.5px] leading-relaxed text-bone/45">
                  {result.arch ? `${result.arch}. ` : ""}
                  {t("scr.meta")}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-bone/45">{t("scr.disclaimer")}</p>
              </div>
            </div>
          </section>
        )}
          </div>
        </div>
      </div>

      {/* Surat rujukan (hanya saat cetak) */}
      <div className="hidden print:block">
        <h1 className="font-display text-[24px] font-semibold">{t("letter.title")}</h1>
        <p className="mt-1 text-[12px] text-ink/60">{t("letter.prototype")}</p>
        <table className="mt-6 w-full border-collapse text-[14px]">
          <tbody>
            {[
              [t("letter.date"), today],
              [t("letter.facility"), t("letter.facility.ph")],
              [t("letter.patient"), patient.name || "____________________"],
              [t("letter.agesex"), `${patient.age || t("letter.dash")} / ${patient.sex || t("letter.dash")}`],
              [t("letter.complaint"), patient.complaint || t("letter.dash")],
              [t("letter.risk"), result ? fmtPct(result.p_tb) : t("letter.dash")],
              [t("letter.band"), result ? t(BAND_META[result.band].titleKey) : t("letter.dash")],
              [
                t("letter.taus"),
                result ? `${fmtPct(result.bands.tau_low)} / ${fmtPct(result.bands.tau_high)}` : t("letter.dash"),
              ],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-ink/15">
                <td className="w-56 py-2 pr-4 align-top font-semibold">{k}</td>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[14px] leading-relaxed">{t("letter.request")}</p>
        <div className="mt-10 flex justify-between text-[14px]">
          <div>
            {t("letter.sender")}
            <div className="mt-14 w-56 border-t border-ink/40" />
          </div>
          <div>
            {t("letter.receiver")}
            <div className="mt-14 w-56 border-t border-ink/40" />
          </div>
        </div>
      </div>
    </>
  );
}