"use client";

import dynamic from "next/dynamic";

// L'option { ssr: false } est autorisée ici car nous sommes dans un Client Component ("use client")
const HomePageClient = dynamic(
  () => import("@/components/pages/HomePageClient"),
  { 
    ssr: false,
    loading: () => (
      <div style={{ padding: "50px", color: "white", background: "#111" }}>
        Chargement de G-TV...
      </div>
    )
  }
);

export default function ClientOnlyHome() {
  return <HomePageClient />;
}
