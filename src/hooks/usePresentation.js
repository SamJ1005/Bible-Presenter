// usePresentation.js
import { useRef } from "react";
import { getTamilBookName } from "../utils/bibleBooks";
export default function usePresentation({ getTamilVerse, getEnglishVerse, tamilBookDataRef }) {
  const lastPayloadParamsRef = useRef(null);

  function buildPayload({ selectedBook, selectedChapter, selectedVerse, settings = {}, tamilDataOverride = null, englishText = null, tamilText = null, viewMode = "bible", type = "bible", fileData = null, fontSizeOffset = 0, index = null }) {
    // If viewMode is prelist or type is file, and only lower third is enabled in settings,
    // forcefully enable showFullscreenWindow so playlist items display on screen!
    const forceFullscreen = (viewMode === "prelist" || type === "file") && (settings.showLowerThirdWindow === true && settings.showFullscreenWindow === false);
    const resolvedShowFullscreen = forceFullscreen ? true : (settings.showFullscreenWindow !== false);

    if (type === "file" && fileData) {
      return {
        viewMode,
        type: "file",
        url: fileData.url,
        fileType: fileData.fileType,
        name: fileData.name,
        localPreview: fileData.localPreview || fileData.url,
        presentationBgType: settings.presentationBgType ?? "color",
        presentationBgImage: settings.presentationBgImage ?? "",
        lowerThirdBgImage: settings.lowerThirdBgImage ?? "",
        presentationBgColor: settings.presentationBgColor ?? "black",
        presentationTextColor: settings.presentationTextColor ?? "white",
        lowerThirdTextColor: settings.lowerThirdTextColor ?? "white",
        showFullscreenWindow: resolvedShowFullscreen,
        showLowerThirdWindow: settings.showLowerThirdWindow === true,
        enableTransition: settings.enableTransition ?? false,
        customWatermark: settings.customWatermark ?? "",
      };
    }

    const finalTamil = tamilText ?? (getTamilVerse?.(selectedBook, selectedChapter, selectedVerse, tamilDataOverride) || "");
    const finalEnglish = englishText ?? (getEnglishVerse?.(selectedBook, selectedChapter, selectedVerse) || "");
    
    // Use pre-built index if provided (e.g. from Prelist), otherwise generate
    const finalIndex = index || (() => {
      const tamilName = getTamilBookName(selectedBook);
      return `${tamilName} (${selectedBook}) ${selectedChapter}:${selectedVerse}`;
    })();

    return {
      viewMode,
      type: "bible",
      tamilText: finalTamil,
      englishText: finalEnglish,
      index: finalIndex,
      fontSizeOffset: fontSizeOffset || 0,
      tamilFontOffset: settings.tamilFontOffset ?? 0,
      englishFontOffset: settings.englishFontOffset ?? 0,
      indexFontOffset: settings.indexFontOffset ?? 0,
      tamilEnabled: settings.isTamilEnabled ?? true,
      englishEnabled: settings.isEnglishEnabled ?? true,
      primaryTranslation: settings.primaryTranslation ?? "Tamil",
      lowerThirdLanguage: settings.lowerThirdLanguage ?? "tamil",
      presentationBgType: settings.presentationBgType ?? "color",
      presentationBgImage: settings.presentationBgImage ?? "",
      lowerThirdBgImage: settings.lowerThirdBgImage ?? "",
      presentationBgColor: settings.presentationBgColor ?? "black",
      presentationTextColor: settings.presentationTextColor ?? "white",
      lowerThirdTextColor: settings.lowerThirdTextColor ?? "white",
      showFullscreenWindow: resolvedShowFullscreen,
      showLowerThirdWindow: settings.showLowerThirdWindow === true,
      enableTransition: settings.enableTransition ?? false,
      customWatermark: settings.customWatermark ?? "",
    };
  }

  // Opens (if needed) and sends the payload
  async function sendToPresentation(params = {}) {
    const { selectedBook, selectedChapter, selectedVerse, settings = {}, tamilDataOverride = null, englishText = null, tamilText = null, viewMode = "bible", type = "bible", fileData = null, fontSizeOffset = 0, index = null } = params;

    // Validation
    if (type === "bible" && !index) {
      if (!selectedBook || !selectedChapter || !selectedVerse) {
        console.warn("sendToPresentation called with incomplete state", params);
        return;
      }
    }

    const payload = buildPayload({ selectedBook, selectedChapter, selectedVerse, settings, tamilDataOverride, englishText, tamilText, viewMode, type, fileData, fontSizeOffset, index });

    // Store the exact parameters needed to rebuild this slide with new settings later
    lastPayloadParamsRef.current = params;

    try {
      // Send payload to Electron; it will auto-open the window if not already present.
      window.electron?.sendPresentation?.(payload);
    } catch (e) {
      console.error("sendToPresentation error", e);
    }
  }

  // Called when settings change to update the live window without changing the active slide
  async function rePresentWithSettings(newSettings) {
    if (!lastPayloadParamsRef.current) return;
    
    // Re-build the payload for the currently showing slide using the fresh settings
    const payload = buildPayload({ ...lastPayloadParamsRef.current, settings: newSettings });
    
    try {
      window.electron.sendPresentation?.(payload);
    } catch (e) {
      console.error("rePresentWithSettings error", e);
    }
  }

  return { sendToPresentation, rePresentWithSettings };
}
