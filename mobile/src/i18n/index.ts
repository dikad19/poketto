import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import id from "./locales/id.json";

const STORAGE_KEY = "app-language";

export async function initI18n() {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  const device = getLocales()[0]?.languageCode; // "id", "en", dll
  const lng = saved ?? (device === "id" ? "id" : "en"); // default English

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, id: { translation: id } },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(lng: "en" | "id") {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(STORAGE_KEY, lng);
}

export default i18n;
