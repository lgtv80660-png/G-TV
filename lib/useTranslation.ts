"use client";

import { useEffect } from "react";
import { useUI } from "@/store/ui";

const dictionaries: Record<string, any> = {
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
    Home: {
      heroTitle: "Que voulez-vous regarder ce soir ?",
      welcomeBack: "BON RETOUR",
      movies: "Films",
      browseMovies: "Explorer le catalogue",
      liveTv: "Live TV",
      channelsEpg: "Chaînes & EPG",
      myList: "Ma Liste",
      savedLater: "Enregistrés pour plus tard",
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
    Home: {
      heroTitle: "What will you watch tonight?",
      welcomeBack: "WELCOME BACK",
      movies: "Movies",
      browseMovies: "Browse the film library",
      liveTv: "Live TV",
      channelsEpg: "Channels & EPG",
      myList: "My List",
      savedLater: "Saved for later",
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
    Home: {
      heroTitle: "ماذا ستشاهد الليلة؟",
      welcomeBack: "مرحباً بعودتك",
      movies: "الأفلام",
      browseMovies: "استكشف قائمة الأفلام",
      liveTv: "البث المباشر",
      channelsEpg: "القنوات و الدليل",
      myList: "قائمتي",
      savedLater: "محفوظة للمشاهدة لاحقاً",
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
