import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Autorise le build Docker même en présence d'avertissements de typage
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore les erreurs ESLint lors de la compilation
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
