import type { Metadata } from "next";
import ScreeningFlow from "@/components/ScreeningFlow";

export const metadata: Metadata = {
  title: "Screening — SIGAP",
};

export default function SkriningPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <ScreeningFlow />
    </main>
  );
}