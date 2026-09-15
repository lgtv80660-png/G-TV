import dynamic from "next/dynamic";

export const dynamicMode = "force-dynamic";

// Désactive le pré-rendu serveur pour le composant client IPTV
const HomePageClient = dynamic(
  () => import("@/components/pages/HomePageClient"),
  { ssr: false }
);

export default function Page() {
  return <HomePageClient />;
}
