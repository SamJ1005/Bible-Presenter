// usePresentation.js
import { getTamilBookName } from "../utils/bibleBooks";
export default function usePresentation({ getTamilVerse, getEnglishVerse, tamilBookDataRef }) {
  function buildPayload({ selectedBook, selectedChapter, selectedVerse, settings = {} }) {
    const tamilText = getTamilVerse?.(selectedChapter, selectedVerse) ?? "";
    const englishText = getEnglishVerse?.(selectedBook, selectedChapter, selectedVerse) ?? "";
    const tamilName = getTamilBookName(selectedBook);
    const index = `${tamilName} ${selectedChapter}:${selectedVerse}  ${selectedBook}`;

    return {
      tamilText,
      englishText,
      index,
      tamilFontSize: settings.tamilFontSize ?? 48,
      englishFontSize: settings.englishFontSize ?? 36,
      tamilEnabled: settings.isTamilEnabled ?? true,
      englishEnabled: settings.isEnglishEnabled ?? true,
      presentationBgType: settings.presentationBgType ?? "color",
      presentationBgImage: settings.presentationBgImage ?? "",
      presentationBgColor: settings.presentationBgColor ?? "black",
    };
  }

  // Opens (if needed) and sends the payload
  async function sendToPresentation({ selectedBook, selectedChapter, selectedVerse, settings = {} }) {
    if (!selectedBook || !selectedChapter || !selectedVerse) {
      console.warn("sendToPresentation called with incomplete state", { selectedBook, selectedChapter, selectedVerse });
      return;
    }

    const payload = buildPayload({ selectedBook, selectedChapter, selectedVerse, settings });

    try {
      // Ensure presentation window exists (Option A behavior: clicking a verse opens it)
      await window.electron.openBlankPresentation?.();
      window.electron.sendPresentation?.(payload);
    } catch (e) {
      console.error("sendToPresentation error", e);
    }
  }

  return { sendToPresentation };
}
