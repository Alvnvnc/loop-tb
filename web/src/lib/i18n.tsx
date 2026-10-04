"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "id";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    // common / nav
    "nav.home": "Home",
    "nav.screening": "Screening",
    "nav.patients": "Patients",
    "nav.clinicians": "Clinicians",
    "nav.about": "About",
    "sfx.tagline": "TB screening",
    "lang.switch": "Language",
    // landing
    "landing.kicker": "UnivaBio 2026 · AI for Human Health",
    "landing.title": "Screen faster than the disease spreads.",
    "landing.sub":
      "Indonesia carries 10% of the world's TB burden, and about 200,000 people each year transmit TB before ever being detected. SIGAP compresses the care loop with one calibrated risk state — and says “uncertain” when it should.",
    "landing.cta.primary": "Open live demo",
    "landing.cta.secondary": "Browse the code",
    "landing.rail.0.tag": "Screen",
    "landing.rail.0.title": "Detect earlier",
    "landing.rail.0.body":
      "A chest X-ray becomes a calibrated risk with a deferral band: when model families disagree, the system asks for a human re-read instead of forcing a verdict.",
    "landing.rail.1.tag": "Refer",
    "landing.rail.1.title": "Act without waiting",
    "landing.rail.1.body":
      "The score maps to an action band and a printable referral letter for GeneXpert confirmation, aligned with Indonesia's TOSS-TB workflow.",
    "landing.rail.2.tag": "Support",
    "landing.rail.2.title": "Follow through",
    "landing.rail.2.body":
      "The same risk state follows the patient home: adherence check-ins update the score and trigger escalation when it worsens.",
    "landing.mockup.caption": "Illustrative result — real model output on a public dataset case.",
    "landing.stats.0": "AUROC on unseen hospitals",
    "landing.stats.1": "training images removed after our leakage audit",
    "landing.stats.2": "sensitivity at 90% specificity (external)",
    "landing.evidence.title": "Evidence, reported honestly",
    "landing.evidence.open.title": "Measured & open",
    "landing.evidence.open.1":
      "External validation on two unseen hospitals (800 images), with bootstrap intervals, calibration (ECE) and age/sex subgroups.",
    "landing.evidence.open.2":
      "Data audit before training: 338 internal duplicates and 19 training images that leaked into the external test set were removed. The frozen split manifest is published.",
    "landing.evidence.open.3":
      "Representation study across three model families; the winner (RAD-DINO self-supervised probe) is open in the repo and as downloadable artifacts.",
    "landing.evidence.todo.title": "Not done yet — honestly",
    "landing.evidence.todo.1":
      "No prospective validation in Indonesia yet; this is a research prototype, not a medical device.",
    "landing.evidence.todo.2":
      "Triage thresholds come from public data, not from puskesmas populations; site calibration is planned.",
    "landing.evidence.todo.3": "Cough audio analysis and SITB integration are not implemented.",
    "landing.stack.title": "Under the hood",
    "landing.stack.body":
      "RAD-DINO (self-supervised chest X-ray) + linear probe, temperature scaling, cross-family disagreement deferral. Served with FastAPI and a bilingual Next.js UI; trained on Kaggle GPUs via API.",
    "landing.try.title": "Try it now",
    "landing.try.full": "Full app (live model API)",
    "landing.try.static": "Static mirror (same live API)",
    "landing.try.note":
      "Both links run the real ensemble: upload a chest X-ray and get a triage band, an attention map and a referral letter.",
    // screening
    "scr.title": "Chest X-ray screening",
    "scr.sub": "Upload a chest X-ray, run the analysis, then follow the action band. Under three minutes per patient.",
    "scr.gallery.title": "Archive examples — no server",
    "scr.gallery.desc":
      "Four real cases from the external NLM corpus with outputs from the same final ensemble, computed offline — try the full flow without an API connection.",
    "scr.resultPlaceholder": "Your triage result will appear here after analysis.",
    "scr.case.a.title": "Case A — Active TB",
    "scr.case.a.desc": "Ensemble agrees: refer today.",
    "scr.case.b.title": "Case B — Normal, unseen hospital",
    "scr.case.b.desc": "Model families disagree → the system withholds a decision.",
    "scr.case.c.title": "Case C — TB, inconclusive evidence",
    "scr.case.c.desc": "Even for TB, high uncertainty → human re-read.",
    "scr.case.d.title": "Case D — Normal, near negative",
    "scr.case.d.desc": "Low signal, but uncertainty keeps it in the middle band.",
    "scr.step1": "X-ray image",
    "scr.drop.title": "Choose X-ray image",
    "scr.drop.hint": "PNG or JPG, frontal view (PA/AP). Drag and drop, or click to choose.",
    "scr.change": "Change image",
    "scr.guide.title": "Before you analyze",
    "scr.guide.1": "Frontal chest view (PA/AP)",
    "scr.guide.2": "Whole lung field visible, not cropped",
    "scr.guide.3": "Use the original file — not a photo of a screen",
    "scr.guide.4": "Avoid patient identifiers when possible",
    "scr.step2": "Patient details (optional)",
    "scr.field.name": "Name or patient code",
    "scr.field.name.ph": "e.g. S-014",
    "scr.field.age": "Age",
    "scr.field.sex": "Sex",
    "scr.sex.m": "Male",
    "scr.sex.f": "Female",
    "scr.field.complaint": "Main complaint",
    "scr.field.complaint.ph": "e.g. cough for 3 weeks, night sweats",
    "scr.demo": "Demo mode (sample output — not from your image)",
    "scr.analyze": "Analyze image",
    "scr.analyzing": "Analyzing…",
    "scr.error":
      "Model server unavailable. Try the archive examples above (final ensemble outputs — no server needed), or switch on demo mode.",
    "scr.result": "Analysis result",
    "scr.band.refer.label": "Priority referral",
    "scr.band.refer.title": "Refer — priority today",
    "scr.band.refer.action":
      "Send the patient for GeneXpert testing at the nearest facility today. Record them as a presumptive TB case.",
    "scr.band.defer.label": "Needs re-read",
    "scr.band.defer.title": "Uncertain — needs re-read",
    "scr.band.defer.action":
      "Do not decide alone. Ask a clinician to read the image, or repeat the screening with a better X-ray.",
    "scr.band.neg.label": "Negative screen",
    "scr.band.neg.title": "Negative screen",
    "scr.band.neg.action":
      "Educate on TB symptoms. Ask the patient to return if symptoms last more than two weeks or worsen.",
    "scr.scale.ptb": "p(TB) estimate",
    "scr.scale.unc": "Uncertainty (disagreement)",
    "scr.scale.low": "Low risk",
    "scr.scale.high": "High risk",
    "scr.scale.tauLow": "uncertain",
    "scr.scale.tauHigh": "refer",
    "scr.card.observed.title": "What the model found",
    "scr.card.observed.body":
      "The areas that most influenced the score are highlighted on the attention map — for a human to verify, not to quote as proof of a lesion.",
    "scr.card.notshown.title": "What it cannot tell",
    "scr.card.notshown.body":
      "The attention map is not evidence of a lesion. The model cannot separate healed TB scars from active TB — that is why the uncertain band exists and human reading remains mandatory.",
    "scr.card.unc.title": "About the uncertainty",
    "scr.card.unc.body":
      "Model families disagree on this image (u = {u}). The score and the band may change with a higher-quality X-ray, so treat it as a screening signal only.",
    "scr.card.unc.low":
      "Model families broadly agree on this image (u = {u}), which increases confidence in this band — subject to the limits below.",
    "scr.overlay.heat": "Attention map",
    "scr.overlay.orig": "Original",
    "scr.trust": "Processing runs in this browser session or your clinic's server. Research prototype — not a diagnosis.",
    "scr.remove": "Remove image",
    "scr.action.print": "Print referral letter",
    "scr.action.save": "Save to patient record",
    "scr.action.saved": "Saved to record",
    "scr.action.new": "New screening",
    "scr.disclaimer":
      "Research triage tool — not a diagnosis. Every result must be confirmed by a health professional (GeneXpert).",
    "scr.archiveNote":
      "Archive output — computed offline with the final model on an NLM external-corpus case. Live server mode is available when the API is connected.",
    "scr.meta":
      "Thresholds are taken from the sensitivity-target operating point on validation data (WHO TPP reference: sensitivity > 90%, specificity > 70%).",
    "letter.title": "Tuberculosis Screening Referral Letter",
    "letter.prototype": "SIGAP research prototype — not an official medical document.",
    "letter.date": "Date",
    "letter.facility": "Referring facility",
    "letter.facility.ph": "Puskesmas / clinic: ____________________",
    "letter.patient": "Patient",
    "letter.agesex": "Age / sex",
    "letter.complaint": "Complaint",
    "letter.risk": "Estimated TB risk",
    "letter.band": "Triage band",
    "letter.taus": "Thresholds (uncertain / refer)",
    "letter.request":
      "Please perform GeneXpert testing and a clinical evaluation according to the national TB program algorithm (TOSS-TB). This screening result is a triage aid, not a diagnosis.",
    "letter.sender": "Referring officer",
    "letter.receiver": "Receiving facility",
    "letter.dash": "—",
    // patients
    "pat.title": "Patient follow-up",
    "pat.sub": "Patient records connect screening to treatment: daily check-ins update the risk and trigger escalation when it worsens.",
    "pat.demoName": "Demo case — Mrs. S",
    "pat.demoCopySuffix": "(copy)",
    "pat.empty": "No saved records yet — saving from the Screening page will show them here.",
    "pat.insight.ok": "Adherence is steady — {taken} of {total} check-ins on time.",
    "pat.insight.risk": "Risk is rising — missed doses: {missed}, symptom score {symptoms}/3.",
    "pat.insight.low": "Not enough check-ins yet — add today's to see the trend.",
    "pat.timeline.title": "Care timeline",
    "pat.stage.screening": "Screening completed",
    "pat.stage.referral": "Referral issued",
    "pat.stage.treatment": "Treatment & adherence",
    "pat.stage.followup": "Follow-up & cure check",
    "pat.status.done": "Done",
    "pat.status.active": "In progress",
    "pat.status.next": "Upcoming",
    "pat.stat.risk": "Current risk",
    "pat.stat.checkins": "Check-ins",
    "pat.stat.ontime": "On-time doses",
    "pat.stat.danger": "Danger signs",
    "pat.yes": "Yes",
    "pat.no": "No",
    "pat.checkin.title": "Today's check-in",
    "pat.checkin.med": "Took medication as scheduled",
    "pat.checkin.symptoms": "Symptoms (0–3)",
    "pat.checkin.d1": "Blood in cough",
    "pat.checkin.d2": "Shortness of breath",
    "pat.checkin.d3": "High fever",
    "pat.checkin.note": "Note (optional)",
    "pat.checkin.save": "Save check-in",
    "pat.history.title": "Check-in history",
    "pat.history.med": "medication ✓",
    "pat.history.missed": "missed dose",
    "pat.history.symptoms": "symptoms {n}/3",
    "pat.escalation":
      "Escalation: risk crossed the threshold. Visit or call the patient today; consider re-referral.",
    "pat.window": "Last 14 check-ins",
    "pat.legend.taken": "dose taken",
    "pat.legend.missed": "missed",
    "pat.note":
      "Methodological note: risk updates here use a simple demo rule (adherence −8%, symptoms +9%/point, danger signs +30%) to demonstrate the loop — not a trained model. The next version reuses the same risk state as the screening engine.",
    // clinicians
    "cli.title": "Clinician summary",
    "cli.sub": "One page for re-reading and follow-up: screening result, adherence and escalation flags.",
    "cli.empty": "No saved cases yet. Save a result from the Screening page first.",
    "cli.tile.checkins": "Check-ins logged",
    "cli.tile.adherence": "Medication adherence",
    "cli.tile.symptoms": "Latest symptoms",
    "cli.tile.danger": "Danger signs",
    "cli.alert":
      "Attention: the patient reported danger signs ({list}). Consider an immediate clinical review.",
    "cli.print": "Print summary",
    "cli.note": "Research prototype summary — not a medical record.",
    "cli.screeningDate": "screening",
    // about
    "ab.title": "About SIGAP",
    "ab.lede":
      "Indonesia has the world's second-highest tuberculosis burden: about 10% of global cases and an estimated 200,000 people each year who transmit TB without ever being detected. The root cause is latency — the care loop moves slower than the disease.",
    "ab.how.title": "How it works",
    "ab.how.1":
      "Chest X-rays are scored by a self-supervised chest X-ray representation (RAD-DINO) with a linear probe, trained on audited public data and evaluated on unseen hospitals.",
    "ab.how.2":
      "Scores are calibrated (temperature scaling) and mapped to three bands: priority referral, uncertain (human re-read) and negative — with thresholds from a sensitivity-target operating point.",
    "ab.how.3":
      "The screening result becomes the starting risk state on a patient record; daily check-ins update it and escalate when the patient worsens.",
    "ab.rigor.title": "Rigor you can check",
    "ab.rigor.1":
      "Leakage audit: perceptual hashing removed 338 internal duplicates and 19 training images that leaked into the external test set before any training ran.",
    "ab.rigor.2":
      "External evaluation across two unseen hospitals with bootstrap AUROC intervals, sensitivity at fixed specificity, calibration (ECE) and age/sex subgroups.",
    "ab.rigor.3":
      "Limitations are reported, not hidden: public radiographic labels, aggressive re-processing may evade de-duplication, and no Indonesian data yet.",
    "ab.links.title": "Code, data and live demo",
    "ab.links.body":
      "Frozen split manifest, evaluation scripts and model artifacts are public. The live demo runs the real ensemble.",
    "ab.disclaimer":
      "Honest statement: this is a research prototype built for a competition — not a medical device. Do not use it for clinical decisions without validation and oversight by health professionals.",
    // footer
    "footer.text":
      "SIGAP is a research triage prototype — not a diagnostic device. Every result must be confirmed by a health professional (GeneXpert). Disease-burden figures: WHO Global TB Report 2025 and Kemenkes 2024.",
    "footer.repo": "Code, frozen splits and evaluation are open",
  },
  id: {
    "nav.home": "Beranda",
    "nav.screening": "Skrining",
    "nav.patients": "Pasien",
    "nav.clinicians": "Klinisi",
    "nav.about": "Tentang",
    "sfx.tagline": "skrining TB",
    "lang.switch": "Bahasa",
    "landing.kicker": "UnivaBio 2026 · AI for Human Health",
    "landing.title": "Skrining lebih cepat daripada penyebaran penyakitnya.",
    "landing.sub":
      "Indonesia memikul 10% beban TB dunia, dan sekitar 200 ribu orang setiap tahun menularkan TB tanpa pernah terdeteksi. SIGAP memampatkan loop perawatan dengan satu state risiko terkalibrasi — dan berkata “ragu” saat memang harus ragu.",
    "landing.cta.primary": "Buka live demo",
    "landing.cta.secondary": "Lihat kode",
    "landing.rail.0.tag": "Skrining",
    "landing.rail.0.title": "Deteksi lebih dini",
    "landing.rail.0.body":
      "Citra X-ray dada menjadi risiko terkalibrasi dengan pita ragu: saat keluarga model tidak sepakat, sistem meminta pembacaan manusia alih-alih memaksakan keputusan.",
    "landing.rail.1.tag": "Rujuk",
    "landing.rail.1.title": "Bertindak tanpa menunggu",
    "landing.rail.1.body":
      "Skor dipetakan ke band tindakan dan surat rujukan siap cetak untuk konfirmasi GeneXpert, selaras alur TOSS-TB.",
    "landing.rail.2.tag": "Dampingi",
    "landing.rail.2.title": "Tuntaskan sampai sembuh",
    "landing.rail.2.body":
      "State risiko yang sama mengikuti pasien sampai rumah: check-in kepatuhan memperbarui skor dan memicu eskalasi bila memburuk.",
    "landing.mockup.caption": "Hasil ilustratif — keluaran model nyata pada kasus korpus publik.",
    "landing.stats.0": "AUROC di rumah sakit asing",
    "landing.stats.1": "citra training dibuang setelah audit kebocoran",
    "landing.stats.2": "sensitivitas pada spesifisitas 90% (eksternal)",
    "landing.evidence.title": "Bukti, dilaporkan jujur",
    "landing.evidence.open.title": "Terukur & terbuka",
    "landing.evidence.open.1":
      "Validasi eksternal di dua rumah sakit asing (800 citra), dengan interval bootstrap, kalibrasi (ECE), dan subgrup usia/jenis kelamin.",
    "landing.evidence.open.2":
      "Audit data sebelum training: 338 duplikat internal dan 19 citra training yang bocor ke test set eksternal dibuang. Manifest split beku dipublikasikan.",
    "landing.evidence.open.3":
      "Studi representasi tiga keluarga model; pemenangnya (probe self-supervised RAD-DINO) terbuka di repo dan sebagai artefak unduhan.",
    "landing.evidence.todo.title": "Belum beres — jujur",
    "landing.evidence.todo.1":
      "Belum ada validasi prospektif di Indonesia; ini prototipe riset, bukan alat medis.",
    "landing.evidence.todo.2":
      "Ambang triase berasal dari data publik, bukan populasi puskesmas; kalibrasi per-site direncanakan.",
    "landing.evidence.todo.3": "Analisis suara batuk dan integrasi SITB belum dikerjakan.",
    "landing.stack.title": "Di balik layar",
    "landing.stack.body":
      "RAD-DINO (self-supervised X-ray dada) + probe linear, temperature scaling, deferral dari disagreement lintas-keluarga. Dilayani FastAPI dan UI Next.js dwibahasa; dilatih di GPU Kaggle via API.",
    "landing.try.title": "Coba sekarang",
    "landing.try.full": "Aplikasi penuh (API model live)",
    "landing.try.static": "Cermin statis (API live yang sama)",
    "landing.try.note":
      "Kedua tautan menjalankan ensemble asli: unggah X-ray dada dan dapatkan band triase, peta perhatian, dan surat rujukan.",
    "scr.title": "Skrining X-ray dada",
    "scr.sub": "Unggah citra X-ray dada, jalankan analisis, lalu ikuti band tindakan. Kurang dari tiga menit per pasien.",
    "scr.gallery.title": "Contoh arsip — tanpa server",
    "scr.gallery.desc":
      "Empat kasus nyata dari korpus eksternal NLM dengan keluaran ensemble final yang sama, dihitung offline — coba alur lengkap tanpa koneksi API.",
    "scr.resultPlaceholder": "Hasil triase akan muncul di sini setelah analisis.",
    "scr.case.a.title": "Kasus A — TB aktif",
    "scr.case.a.desc": "Ensemble sepakat: prioritas rujukan hari ini.",
    "scr.case.b.title": "Kasus B — normal dari RS asing",
    "scr.case.b.desc": "Keluarga model tidak sepakat → sistem menahan keputusan.",
    "scr.case.c.title": "Kasus C — TB, bukti tidak konklusif",
    "scr.case.c.desc": "Bahkan untuk TB, ketidakpastian tinggi → pembacaan ulang.",
    "scr.case.d.title": "Kasus D — normal, mendekati negatif",
    "scr.case.d.desc": "Sinyal rendah, tetapi ketidakpastian menjaga band ragu.",
    "scr.step1": "Citra X-ray",
    "scr.drop.title": "Pilih foto X-ray",
    "scr.drop.hint": "PNG atau JPG, tampak depan (PA/AP). Tarik file ke sini atau ketuk untuk memilih.",
    "scr.change": "Ganti citra",
    "scr.guide.title": "Sebelum menganalisis",
    "scr.guide.1": "Tampak depan dada (PA/AP)",
    "scr.guide.2": "Seluruh lapang paru terlihat, tidak terpotong",
    "scr.guide.3": "Gunakan file asli — bukan foto layar",
    "scr.guide.4": "Hindari identitas pasien bila memungkinkan",
    "scr.step2": "Data pasien (opsional)",
    "scr.field.name": "Nama atau kode pasien",
    "scr.field.name.ph": "mis. S-014",
    "scr.field.age": "Usia",
    "scr.field.sex": "Jenis kelamin",
    "scr.sex.m": "Laki-laki",
    "scr.sex.f": "Perempuan",
    "scr.field.complaint": "Keluhan utama",
    "scr.field.complaint.ph": "mis. batuk 3 minggu, keringat malam",
    "scr.demo": "Mode peragaan (hasil contoh — bukan dari citra Anda)",
    "scr.analyze": "Analisis citra",
    "scr.analyzing": "Menganalisis…",
    "scr.error":
      "Server model tidak tersedia. Coba contoh arsip di atas (keluaran ensemble final — tanpa server), atau nyalakan mode peragaan.",
    "scr.result": "Hasil analisis",
    "scr.band.refer.label": "Prioritas rujukan",
    "scr.band.refer.title": "Rujuk — prioritas hari ini",
    "scr.band.refer.action":
      "Kirim pasien untuk pemeriksaan GeneXpert di fasilitas terdekat hari ini. Catat sebagai suspek TB pada buku register.",
    "scr.band.defer.label": "Perlu pembacaan ulang",
    "scr.band.defer.title": "Ragu — perlu pembacaan ulang",
    "scr.band.defer.action":
      "Jangan diputuskan sendiri. Minta pembacaan oleh petugas/radiolog, atau ulangi skrining dengan citra yang lebih baik.",
    "scr.band.neg.label": "Negatif skrining",
    "scr.band.neg.title": "Negatif skrining",
    "scr.band.neg.action":
      "Edukasi gejala TB. Minta pasien kembali jika gejala berlanjut lebih dari 2 minggu atau memburuk.",
    "scr.scale.ptb": "Estimasi p(TB)",
    "scr.scale.unc": "Ketidakpastian (disagreement)",
    "scr.scale.low": "Risiko rendah",
    "scr.scale.high": "Risiko tinggi",
    "scr.scale.tauLow": "ragu",
    "scr.scale.tauHigh": "rujuk",
    "scr.card.observed.title": "Yang dilihat model",
    "scr.card.observed.body":
      "Area yang paling memengaruhi skor disorot pada peta perhatian — untuk diverifikasi manusia, bukan dikutip sebagai bukti lesi.",
    "scr.card.notshown.title": "Yang tidak ditunjukkan",
    "scr.card.notshown.body":
      "Peta perhatian bukan bukti lesi. Model belum bisa membedakan bekas TB (scar) dari TB aktif — karena itu pita ragu ada dan pembacaan manusia tetap wajib.",
    "scr.card.unc.title": "Tentang ketidakpastian",
    "scr.card.unc.body":
      "Keluarga model tidak sepakat pada citra ini (u = {u}). Skor dan band dapat berubah dengan X-ray yang lebih baik, jadi gunakan hanya sebagai sinyal skrining.",
    "scr.card.unc.low":
      "Keluarga model umumnya sepakat pada citra ini (u = {u}), yang menambah keyakinan pada band ini — dengan batasan di bawah.",
    "scr.overlay.heat": "Peta perhatian",
    "scr.overlay.orig": "Citra asli",
    "scr.trust": "Pemrosesan berjalan di sesi browser ini atau server klinikmu. Prototipe riset — bukan diagnosis.",
    "scr.remove": "Hapus citra",
    "scr.action.print": "Cetak surat rujukan",
    "scr.action.save": "Simpan ke kartu pasien",
    "scr.action.saved": "Tersimpan di kartu pasien",
    "scr.action.new": "Skrining baru",
    "scr.disclaimer":
      "Alat triase riset — bukan diagnosis. Setiap hasil wajib dikonfirmasi tenaga kesehatan (GeneXpert).",
    "scr.archiveNote":
      "Keluaran arsip — dihitung offline dengan model final pada citra contoh korpus eksternal (NLM). Mode server langsung tersedia saat API terhubung.",
    "scr.meta":
      "Ambang diambil dari titik sensitivitas-target pada data validasi (acuan TPP WHO: sensitivitas > 90%, spesifisitas > 70%).",
    "letter.title": "Surat Rujukan Skrining Tuberkulosis",
    "letter.prototype": "Prototipe riset SIGAP — bukan dokumen medis resmi.",
    "letter.date": "Tanggal",
    "letter.facility": "Fasilitas pengirim",
    "letter.facility.ph": "Puskesmas / posyandu: ____________________",
    "letter.patient": "Pasien",
    "letter.agesex": "Usia / jenis kelamin",
    "letter.complaint": "Keluhan",
    "letter.risk": "Estimasi risiko TB",
    "letter.band": "Band triase",
    "letter.taus": "Ambang (ragu / rujuk)",
    "letter.request":
      "Mohon dilakukan pemeriksaan GeneXpert dan evaluasi klinis sesuai algoritma program TB nasional (TOSS-TB). Hasil skrining ini adalah alat bantu triase, bukan diagnosis.",
    "letter.sender": "Petugas pengirim",
    "letter.receiver": "Penerima rujukan",
    "letter.dash": "—",
    "pat.title": "Pendampingan pasien",
    "pat.sub": "Kartu pasien menyambung skrining ke pengobatan: check-in harian memperbarui risiko dan memicu eskalasi bila memburuk.",
    "pat.demoName": "Contoh peragaan — Ibu S",
    "pat.demoCopySuffix": "(salinan)",
    "pat.empty": "Belum ada kartu tersimpan — menyimpan dari halaman Skrining akan muncul di sini.",
    "pat.insight.ok": "Kepatuhan stabil — {taken} dari {total} check-in tepat waktu.",
    "pat.insight.risk": "Risiko menanjak — dosis terlewat: {missed}, skor gejala {symptoms}/3.",
    "pat.insight.low": "Check-in masih sedikit — tambahkan hari ini untuk melihat tren.",
    "pat.timeline.title": "Perjalanan perawatan",
    "pat.stage.screening": "Skrining selesai",
    "pat.stage.referral": "Rujukan diterbitkan",
    "pat.stage.treatment": "Pengobatan & kepatuhan",
    "pat.stage.followup": "Tindak lanjut & evaluasi sembuh",
    "pat.status.done": "Selesai",
    "pat.status.active": "Berjalan",
    "pat.status.next": "Menyusul",
    "pat.stat.risk": "Risiko saat ini",
    "pat.stat.checkins": "Check-in",
    "pat.stat.ontime": "Dosis tepat waktu",
    "pat.stat.danger": "Tanda bahaya",
    "pat.yes": "Ada",
    "pat.no": "Tidak",
    "pat.checkin.title": "Check-in hari ini",
    "pat.checkin.med": "Minum obat sesuai jadwal",
    "pat.checkin.symptoms": "Gejala (0–3)",
    "pat.checkin.d1": "Batuk darah",
    "pat.checkin.d2": "Sesak napas",
    "pat.checkin.d3": "Demam tinggi",
    "pat.checkin.note": "Catatan (opsional)",
    "pat.checkin.save": "Simpan check-in",
    "pat.history.title": "Riwayat check-in",
    "pat.history.med": "obat ✓",
    "pat.history.missed": "obat terlewat",
    "pat.history.symptoms": "gejala {n}/3",
    "pat.escalation":
      "Eskalasi: risiko menembus ambang. Kunjungi atau telepon pasien hari ini; pertimbangkan rujukan ulang.",
    "pat.window": "14 check-in terakhir",
    "pat.legend.taken": "dosis diminum",
    "pat.legend.missed": "terlewat",
    "pat.note":
      "Catatan metodologis: pembaruan risiko di halaman ini memakai aturan peragaan sederhana (kepatuhan −8%, gejala +9%/poin, tanda bahaya +30%) untuk mendemonstrasikan loop — bukan model terlatih. Versi berikutnya memakai state risiko yang sama dengan mesin skrining.",
    "cli.title": "Ringkasan klinisi",
    "cli.sub": "Satu halaman untuk pembacaan ulang dan tindak lanjut: hasil skrining, kepatuhan, dan tanda eskalasi.",
    "cli.empty": "Belum ada kasus tersimpan. Simpan hasil dari halaman Skrining terlebih dahulu.",
    "cli.tile.checkins": "Check-in tercatat",
    "cli.tile.adherence": "Kepatuhan obat",
    "cli.tile.symptoms": "Gejala terakhir",
    "cli.tile.danger": "Tanda bahaya",
    "cli.alert":
      "Perhatian: pasien melaporkan tanda bahaya ({list}). Pertimbangkan evaluasi klinis segera.",
    "cli.print": "Cetak ringkasan",
    "cli.note": "Ringkasan prototipe riset — bukan rekam medis.",
    "cli.screeningDate": "skrining",
    "ab.title": "Tentang SIGAP",
    "ab.lede":
      "Indonesia adalah negara dengan beban tuberkulosis terbesar kedua di dunia: sekitar 10% kasus global dan estimasi 200 ribu orang per tahun yang menularkan TB tanpa pernah terdeteksi. Akarnya adalah latensi — loop perawatan bergerak lebih lambat daripada penyakitnya.",
    "ab.how.title": "Cara kerja",
    "ab.how.1":
      "X-ray dada dinilai oleh representasi self-supervised X-ray dada (RAD-DINO) dengan probe linear, dilatih pada data publik yang diaudit dan dievaluasi di rumah sakit yang belum pernah dilihat.",
    "ab.how.2":
      "Skor dikalibrasi (temperature scaling) dan dipetakan ke tiga band: prioritas rujukan, ragu (pembacaan manusia), dan negatif — dengan ambang dari titik sensitivitas-target.",
    "ab.how.3":
      "Hasil skrining menjadi state risiko awal pada kartu pasien; check-in harian memperbaruinya dan memicu eskalasi bila pasien memburuk.",
    "ab.rigor.title": "Rigor yang bisa diperiksa",
    "ab.rigor.1":
      "Audit kebocoran: perceptual hashing membuang 338 duplikat internal dan 19 citra training yang bocor ke test set eksternal sebelum training dijalankan.",
    "ab.rigor.2":
      "Evaluasi eksternal di dua rumah sakit asing dengan interval bootstrap AUROC, sensitivitas pada spesifisitas tetap, kalibrasi (ECE), dan subgrup usia/jenis kelamin.",
    "ab.rigor.3":
      "Keterbatasan dilaporkan, bukan disembunyikan: label radiografis publik, reprocessing agresif dapat lolos dedup, dan belum ada data Indonesia.",
    "ab.links.title": "Kode, data, dan demo live",
    "ab.links.body":
      "Manifest split beku, skrip evaluasi, dan artefak model terbuka untuk publik. Demo live menjalankan ensemble asli.",
    "ab.disclaimer":
      "Pernyataan jujur: ini prototipe riset untuk kompetisi — bukan alat medis. Jangan dipakai untuk keputusan klinis tanpa validasi dan pengawasan tenaga kesehatan.",
    "footer.text":
      "SIGAP adalah prototipe riset triase skrining — bukan alat diagnosis. Setiap hasil wajib dikonfirmasi tenaga kesehatan (GeneXpert). Angka beban penyakit: WHO Global TB Report 2025 dan Kemenkes 2024.",
    "footer.repo": "Kode, split data, dan evaluasi terbuka",
  },
};

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("sigap.lang")) as Lang | null;
    if (stored === "id" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem("sigap.lang", lang);
    } catch {
      /* private mode */
    }
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };

  return <LangContext.Provider value={{ lang, setLang: setLangState, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}