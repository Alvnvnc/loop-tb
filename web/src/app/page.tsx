export default function Home() {
  const steps = [
    {
      title: "Kenali lebih cepat",
      body: "Kader mengunggah X-ray pasien. Model tersaring dari kebocoran data memisahkan TB dari paru tidak normal lain — dengan pita ragu ketika bukti belum cukup.",
    },
    {
      title: "Rujuk tanpa menunggu",
      body: "Skor risiko diterjemahkan menjadi band tindakan dan surat rujukan siap cetak: prioritas GeneXpert hari ini, pembacaan ulang, atau edukasi.",
    },
    {
      title: "Dampingi sampai sembuh",
      body: "Kartu pasien mencatat check-in minum obat. Risiko diperbarui dari waktu ke waktu; bila memburuk, muncul tanda eskalasi untuk petugas.",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-14 pb-12">
        <p className="text-[13px] font-medium text-ink/50">
          Tuberkulosis · Indonesia · data 2024
        </p>
        <h1 className="mt-3 text-[33px] leading-[1.14] font-extrabold tracking-tight sm:text-[42px]">
          Sekitar 200 ribu orang menularkan TB tanpa pernah terdeteksi. Loop perawatannya
          lebih lambat daripada penularannya.
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink/75">
          SIGAP memampatkan jeda itu dengan satu state risiko yang menggerakkan{" "}
          <em className="not-italic font-semibold">skrining → rujukan → pendampingan</em>.
          Bukan skor lain — triase terkalibrasi yang tahu kapan dirinya harus ragu.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="/skrining"
            className="rounded-[8px] bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-ink/90"
          >
            Mulai skrining
          </a>
          <a
            href="/pasien"
            className="rounded-[8px] border border-ink/20 px-5 py-3 text-[15px] font-semibold transition-colors hover:border-ink/45"
          >
            Lihat alur pendampingan
          </a>
        </div>
      </section>

      <section className="border-t border-ink/10 py-10">
        <h2 className="text-[15px] font-bold">Satu loop, tiga titik kompresi</h2>
        <ol className="mt-7 space-y-7">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[44px_1fr] gap-4">
              <span className="pt-0.5 text-[15px] font-bold tabular-nums text-ink/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[17px] font-bold">{s.title}</h3>
                <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink/70">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-ink/10 py-10">
        <h2 className="text-[15px] font-bold">Yang terbuka, yang belum</h2>
        <div className="mt-5 grid gap-7 sm:grid-cols-2">
          <div>
            <h3 className="text-[14px] font-semibold text-clear">Terukur dan terbuka</h3>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink/70">
              <li>
                Audit kebocoran dataset: 19 citra train yang duplikat dengan test set eksternal
                dibuang sebelum training — angka yang jarang dilaporkan.
              </li>
              <li>
                Evaluasi lintas-rumah-sakit dilaporkan apa adanya: AUROC, sensitivitas pada
                spesifisitas tetap, dan kalibrasi (ECE).
              </li>
              <li>Split data, model, dan kode dapat direproduksi dari repositori.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-defer">Belum beres — jujur</h3>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink/70">
              <li>Belum divalidasi prospektif di Indonesia; ini prototipe riset, bukan alat medis.</li>
              <li>Ambang triase dikalibrasi pada data publik, belum pada populasi puskesmas.</li>
              <li>Analisis suara batuk dan integrasi SITB belum dikerjakan.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}