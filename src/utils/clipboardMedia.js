/**
 * Helper utility to read media files or images from system/browser clipboard.
 * Supports:
 * 1. Native Windows Explorer file copy (images/videos)
 * 2. Browser "Copy Image" / screenshots / snipping tool
 * 3. Standard web ClipboardEvent items and files
 */
export async function getMediaFromClipboard(event = null) {
  // 1. In Electron, always check native clipboard reader first (reads true OS file path and native image data)
  const reader = window.electron?.readClipboardMedia || window.api?.readClipboardMedia;
  if (reader) {
    try {
      const clipResult = await reader();
      if (clipResult) {
        if (clipResult.path) {
          return {
            name: clipResult.name || (clipResult.type === "video" ? "video.mp4" : "image.png"),
            path: clipResult.path,
            type: clipResult.mimeType || (clipResult.type === "video" ? "video/mp4" : "image/png"),
            size: clipResult.size || 0,
          };
        } else if (clipResult.dataUrl) {
          const res = await fetch(clipResult.dataUrl);
          const blob = await res.blob();
          return new File([blob], clipResult.name || `pasted_image_${Date.now()}.png`, {
            type: clipResult.mimeType || "image/png",
          });
        }
      }
    } catch (err) {
      console.warn("[Clipboard] Electron reader error:", err);
    }
  }

  // 2. Check DOM ClipboardEvent if provided (for browser environment or fallback)
  if (event && event.clipboardData) {
    // 2a. Check for files (copied from File Explorer or web file drops)
    const files = Array.from(event.clipboardData.files || []);
    const mediaFile = files.find(
      (f) =>
        (f.type && (f.type.startsWith("image/") || f.type.startsWith("video/"))) ||
        /\.(png|jpe?g|webp|gif|bmp|mp4|webm|mov|mkv|avi|flv|wmv|m4v|3gp|ts)$/i.test(f.name || "")
    );
    if (mediaFile) {
      return mediaFile;
    }

    // 2b. Check for image items (e.g. from browser "Copy image" or screenshot)
    const items = Array.from(event.clipboardData.items || []);
    const imgItem = items.find((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (imgItem) {
      const blob = imgItem.getAsFile();
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        return new File([blob], `pasted_image_${Date.now()}.${ext}`, { type: blob.type });
      }
    }
  }

  // 3. Fallback: Web navigator.clipboard.read()
  if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
    try {
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        const imgType = item.types.find((t) => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          const ext = imgType.split("/")[1] || "png";
          return new File([blob], `pasted_image_${Date.now()}.${ext}`, { type: imgType });
        }
      }
    } catch {
      // Ignore permission errors in browser environment
    }
  }

  return null;
}
