"use client";

import dynamic from "next/dynamic";

const HomePageClient = dynamic(
  () => import("@/components/pages/HomePageClient"),
  { 
    ssr: false,
    loading: () => (
      <div style={{ padding: "50px", color: "white", background: "#111", fontFamily: "sans-serif" }}>
        Chargement de G-TV...
      </div>
    )
  }
);

export default function ClientOnlyHome() {
  return <HomePageClient />;
}
