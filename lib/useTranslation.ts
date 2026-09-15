"use client";

import { useEffect } from "react";
import { useUI } from "@/store/ui";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

const dictionaries: Record<string, any> = { fr, en, ar };

export function useTranslation() {
  const language = useUI((s) => s.language);
  const dict = dictionaries[language] || dictionaries.fr;

  // Ajuste l'orientation RTL pour l'arabe
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current = dict;
    for (const key of keys) {
      if (current[key] === undefined) return keyPath;
      current = current[key];
    }
    return current;
  };

  return { t, language };
}