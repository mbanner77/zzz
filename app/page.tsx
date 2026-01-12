"use client";

import { JSX } from "react";
import { Calendar } from "@/components/Calendar";

export default function Page(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-6xl">
        <Calendar />
      </div>
    </main>
  );
}