import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIGAP — skrining TB yang tahu kapan harus ragu",
  description:
    "Prototipe riset triase tuberkulosis: X-ray terkalibrasi → rujukan → pendampingan minum obat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="no-print mt-16 border-t border-ink/10">
          <div className="mx-auto max-w-3xl px-5 py-6 text-[13px] leading-relaxed text-ink/55">
            SIGAP adalah prototipe riset triase skrining — <strong>bukan alat diagnosis</strong>. Setiap
            hasil wajib dikonfirmasi tenaga kesehatan (GeneXpert). Angka beban penyakit: WHO Global TB
            Report 2025 dan Kemenkes 2024.{" "}
            <a
              className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
              href="https://github.com/Alvnvnc/loop-tb"
              target="_blank"
              rel="noreferrer"
            >
              Kode, split data, dan evaluasi terbuka
            </a>
            .
          </div>
        </footer>
      </body>
    </html>
  );
}