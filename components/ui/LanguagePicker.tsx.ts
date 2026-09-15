"use client";

import { useUI, Language } from "@/store/ui";
import { Globe } from "lucide-react";

export function LanguagePicker() {
  const language = useUI((s) => s.language);
  const setLanguage = useUI((s) => s.setLanguage);

  return (
    <div className="relative flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-850/80 px-3 py-1.5 text-xs text-fog-200 transition-colors hover:border-iris-400/50">
      <Globe className="h-4 w-4 shrink-0 text-iris-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer"
      >
        <option value="fr" className="bg-ink-900 text-foreground">FR</option>
        <option value="en" className="bg-ink-900 text-foreground">EN</option>
        <option value="ar" className="bg-ink-900 text-foreground">AR</option>
      </select>
    </div>
  );
}