// usePresentation.js
import { getTamilBookName } from "../utils/bibleBooks";
export default function usePresentation({ getTamilVerse, getEnglishVerse, tamilBookDataRef }) {
  function buildPayload({ selectedBook, selectedChapter, selectedVerse, settings = {}, tamilDataOverride = null, englishText = null, tamilText = null, viewMode = "bible", type = "bible", fileData = null }) {
    if (type === "file" && fileData) {
      return {
        viewMode,
        type: "file",
        url: fileData.url,
        fileType: fileData.fileType,
        name: fileData.name,
        presentationBgColor: settings.presentationBgColor ?? "black", // Keep BG settings available
      };
    }

    const finalTamil = tamilText ?? (getTamilVerse?.(selectedChapter, selectedVerse, tamilDataOverride) || "");
    const finalEnglish = englishText ?? (getEnglishVerse?.(selectedBook, selectedChapter, selectedVerse) || "");
    const tamilName = getTamilBookName(selectedBook);
    const index = `${tamilName} ${selectedChapter}:${selectedVerse}   ${selectedBook}`;

    return {
      viewMode,
      type: "bible",
      tamilText: finalTamil,
      englishText: finalEnglish,
      index,
      tamilFontSize: settings.tamilFontSize ?? 60,
      englishFontSize: settings.englishFontSize ?? 60,
      tamilEnabled: settings.isTamilEnabled ?? true,
      englishEnabled: settings.isEnglishEnabled ?? true,
      presentationBgType: settings.presentationBgType ?? "color",
      presentationBgImage: settings.presentationBgImage ?? "",
      presentationBgColor: settings.presentationBgColor ?? "black",
    };
  }

  // Opens (if needed) and sends the payload
  async function sendToPresentation({ selectedBook, selectedChapter, selectedVerse, settings = {}, tamilDataOverride = null, englishText = null, tamilText = null, viewMode = "bible", type = "bible", fileData = null }) {
    // Validation
    if (type === "bible") {
      if (!selectedBook || !selectedChapter || !selectedVerse) {
        console.warn("sendToPresentation called with incomplete state", { selectedBook, selectedChapter, selectedVerse });
        return;
      }
    }

    const payload = buildPayload({ selectedBook, selectedChapter, selectedVerse, settings, tamilDataOverride, englishText, tamilText, viewMode, type, fileData });

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
