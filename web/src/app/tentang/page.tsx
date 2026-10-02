import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang — SIGAP",
};

export default function TentangPage() {
  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-10">
        <h1 className="text-[26px] font-extrabold tracking-tight">Tentang SIGAP</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink/75">
          Indonesia adalah negara dengan beban tuberkulosis terbesar kedua di dunia: sekitar 10%
          dari kasus global 2024 (WHO Global TB Report 2025), dengan ±200 ribu kasus per tahun yang
          diperkirakan tidak pernah terdeteksi. SIGAP adalah prototipe riset yang menyerang akar
          masalah itu: <strong>loop perawatan yang lebih lambat daripada penularannya</strong>.
        </p>
      </section>

      <section className="mt-10 border-t border-ink/10 pt-8">
        <h2 className="text-[16px] font-bold">Cara kerja</h2>
        <ol className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/75">
          <li>
            <strong>Skrining.</strong> Citra X-ray diproses model klasifikasi TB yang dilatih pada
            dataset publik (TBX11K dan basis Rahman) dan diuji secara eksternal pada korpus NLM
            Shenzhen + Montgomery yang tidak pernah tersentuh training.
          </li>
          <li>
            <strong>Kalibrasi & pita ragu.</strong> Skor dikalibrasi (temperature scaling) dan
            diterjemahkan menjadi tiga band: prioritas rujukan, ragu (perlu pembacaan manusia), dan
            negatif skrining. Ambang diambil dari titik kerja sensitivitas-target pada data validasi,
            mengacu target TPP WHO.
          </li>
          <li>
            <strong>Loop.</strong> Hasil skrining menjadi state risiko awal pada kartu pasien;
            check-in harian memperbarui risiko dan memunculkan eskalasi bila memburuk.
          </li>
        </ol>
      </section>

      <section className="mt-10 border-t border-ink/10 pt-8">
        <h2 className="text-[16px] font-bold">Rigor yang bisa diperiksa</h2>
        <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/75">
          <li>
            Audit kebocoran: deduplikasi perseptual (pHash) menemukan 338 duplikat internal dan 19
            citra train yang duplikat dengan test set eksternal — semuanya dibuang sebelum training
            (split manifest tersedia di repositori).
          </li>
          <li>
            Evaluasi eksternal lintas-rumah-sakit dengan AUROC + interval bootstrap, sensitivitas
            pada spesifisitas 90%/70%, kalibrasi ECE, dan analisis subgrup usia/jenis kelamin dari
            metadata Montgomery.
          </li>
          <li>
            Keterbatasan dilaporkan, bukan disembunyikan: data publik bersifat radiografis (bukan
            konfirmasi bakteriologis), reprocessing agresif dapat lolos dari deduplikasi, dan
            belum ada data Indonesia.
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-ink/10 pt-8 pb-4">
        <h2 className="text-[16px] font-bold">Kontak & sumber</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/75">
          Dibuat untuk UnivaBio 2026. Kode, split data, dan hasil evaluasi:{" "}
          <a
            className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
            href="https://github.com/Alvnvnc/loop-tb"
            target="_blank"
            rel="noreferrer"
          >
            github.com/Alvnvnc/loop-tb
          </a>
          . Referensi utama: WHO consolidated guidelines on TB (Module 2: Screening, 2021) dan WHO
          policy statement on CAD for TB screening (2025); Kemenkes (TOSS-TB).
        </p>
        <p className="mt-6 rounded-[10px] border border-ink/15 bg-white/70 p-4 text-[14px] leading-relaxed text-ink/70">
          Pernyataan jujur: ini prototipe riset untuk kompetisi, <strong>bukan alat medis</strong>.
          Jangan dipakai untuk keputusan klinis tanpa validasi dan pengawasan tenaga kesehatan.
        </p>
      </section>
    </main>
  );
}