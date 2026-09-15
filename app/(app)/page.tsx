"use client";

import { TopBar } from "@/components/layout/TopBar";
import { BentoGrid } from "@/components/home/BentoGrid";

export default function HomePage() {
  return (
    <>
      <TopBar title="Home" />
      <BentoGrid />
    </>
  );
}
