export type Band = "rujuk_prioritas" | "ragu" | "negatif_skrining";

export interface PredictResponse {
  p_tb: number;
  band: Band;
  bands: { tau_high: number; tau_low: number; tau_uncertainty?: number };
  arch?: string;
  uncertainty?: number;
  disclaimer?: string;
  heatmap_png_b64?: string;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function predict(file: File): Promise<PredictResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/predict`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as PredictResponse;
}

export const BAND_META: Record<
  Band,
  { labelKey: string; titleKey: string; actionKey: string; text: string; dot: string }
> = {
  rujuk_prioritas: {
    labelKey: "scr.band.refer.label",
    titleKey: "scr.band.refer.title",
    actionKey: "scr.band.refer.action",
    text: "text-[#ee8b7e]",
    dot: "bg-refer",
  },
  ragu: {
    labelKey: "scr.band.defer.label",
    titleKey: "scr.band.defer.title",
    actionKey: "scr.band.defer.action",
    text: "text-[#e5b95c]",
    dot: "bg-defer",
  },
  negatif_skrining: {
    labelKey: "scr.band.neg.label",
    titleKey: "scr.band.neg.title",
    actionKey: "scr.band.neg.action",
    text: "text-[#83c7a4]",
    dot: "bg-clear",
  },
};

export function fmtPct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}