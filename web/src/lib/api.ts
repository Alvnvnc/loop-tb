export type Band = "rujuk_prioritas" | "ragu" | "negatif_skrining";

export interface PredictResponse {
  p_tb: number;
  band: Band;
  bands: { tau_high: number; tau_low: number };
  arch?: string;
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

export const BAND_UI: Record<
  Band,
  { label: string; title: string; action: string; text: string; dot: string }
> = {
  rujuk_prioritas: {
    label: "Prioritas rujukan",
    title: "Rujuk — prioritas hari ini",
    action:
      "Kirim pasien untuk pemeriksaan GeneXpert di fasilitas terdekat hari ini. Catat sebagai suspek TB pada buku register.",
    text: "text-[#ee8b7e]",
    dot: "bg-refer",
  },
  ragu: {
    label: "Perlu pembacaan ulang",
    title: "Ragu — perlu pembacaan ulang",
    action:
      "Jangan diputuskan sendiri. Minta pembacaan oleh petugas/radiolog, atau ulangi skrining dengan citra yang lebih baik.",
    text: "text-[#e5b95c]",
    dot: "bg-defer",
  },
  negatif_skrining: {
    label: "Negatif skrining",
    title: "Negatif skrining",
    action:
      "Edukasi gejala TB. Minta pasien kembali jika gejala berlanjut lebih dari 2 minggu atau memburuk.",
    text: "text-[#83c7a4]",
    dot: "bg-clear",
  },
};

export function fmtPct(x: number, digits = 0): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(x);
}

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(iso));
}