import { create } from "zustand";
import { Language } from "../i18n/translations";

interface User {
  id: string;
  name: string;
  role: "admin" | "supervisor" | "employee";
  language: Language;
}

interface AppState {
  user: User | null;
  language: Language;
  setUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  language: "ar",
  isRTL: true,
  setUser: (user) => set({ user }),
  setLanguage: (language) => set({ 
    language, 
    isRTL: language === "ar" 
  }),
}));
