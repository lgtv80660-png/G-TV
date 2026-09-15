"use client";

import { useEffect } from "react";
import { useUI } from "@/store/ui";

const dictionaries = {
  fr: {
    Nav: {
      home: "Accueil",
      live: "Live TV",
      movies: "Films",
      series: "Séries",
      search: "Recherche",
      myList: "Ma Liste",
    },
    TopBar: {
      account: "Compte",
      user: "Utilisateur",
      status: "Statut",
      expires: "Expire le",
      connections: "Connexions",
      signOut: "Déconnexion",
      searchPlaceholder: "Rechercher un contenu...",
    },
    Hero: {
      play: "Lecture",
      moreInfo: "Plus d'infos",
      featured: "À l'affiche",
      continueWatching: "Reprendre la lecture",
    },
  },
  en: {
    Nav: {
      home: "Home",
      live: "Live TV",
      movies: "Movies",
      series: "Series",
      search: "Search",
      myList: "My List",
    },
    TopBar: {
      account: "Account",
      user: "User",
      status: "Status",
      expires: "Expires",
      connections: "Connections",
      signOut: "Sign out",
      searchPlaceholder: "Search everything…",
    },
    Hero: {
      play: "Play",
      moreInfo: "More Info",
      featured: "Featured",
      continueWatching: "Continue Watching",
    },
  },
  ar: {
    Nav: {
      home: "الرئيسية",
      live: "البث المباشر",
      movies: "الأفلام",
      series: "المسلسلات",
      search: "بحث",
      myList: "قائمتي",
    },
    TopBar: {
      account: "الحساب",
      user: "المستخدم",
      status: "الحالة",
      expires: "تاريخ الانتهاء",
      connections: "الاتصالات",
      signOut: "تسجيل الخروج",
      searchPlaceholder: "ابحث عن أي شيء...",
    },
    Hero: {
      play: "تشغيل",
      moreInfo: "تفاصيل",
      featured: "مميز",
      continueWatching: "متابعة المشاهدة",
    },
  },
};

export function useTranslation() {
  const language = useUI((s) => s.language);
  const dict = dictionaries[language] || dictionaries.fr;

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current: any = dict;
    for (const key of keys) {
      if (current[key] === undefined) return keyPath;
      current = current[key];
    }
    return current;
  };

  return { t, language };
}
