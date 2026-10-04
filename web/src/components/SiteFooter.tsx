"use client";

import { useLang } from "@/lib/i18n";

export default function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="no-print mt-16 border-t border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-[13px] leading-relaxed text-ink/55 sm:px-6">
        <p className="max-w-3xl">{t("footer.text")}</p>
        <p>
          <a
            className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
            href="https://github.com/Alvnvnc/loop-tb"
            target="_blank"
            rel="noreferrer"
          >
            {t("footer.repo")}
          </a>
        </p>
      </div>
    </footer>
  );
}