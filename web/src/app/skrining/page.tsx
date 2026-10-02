import type { Metadata } from "next";
import ScreeningFlow from "@/components/ScreeningFlow";

export const metadata: Metadata = {
  title: "Skrining — SIGAP",
};

export default function SkriningPage() {
  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-10 print:hidden">
        <h1 className="text-[26px] font-extrabold tracking-tight">Skrining X-ray</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/70">
          Unggah citra X-ray dada, jalankan analisis, lalu ikuti band tindakan. Kurang dari tiga
          menit per pasien.
        </p>
      </section>
      <ScreeningFlow />
    </main>
  );
}