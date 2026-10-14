// Helper to discover bundled wallpapers from public/wallpapers/
const fullscreenFiles = import.meta.glob(
  "/public/wallpapers/fullscreen/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}",
  { eager: true }
);

const lowerThirdFiles = import.meta.glob(
  "/public/wallpapers/lowerthird/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}",
  { eager: true }
);

function formatWallpapers(filesObj, prefix) {
  return Object.keys(filesObj).map((filePath, idx) => {
    // Extract filename: e.g. "/public/wallpapers/fullscreen/w1.jpg" -> "w1.jpg"
    const fileName = filePath.split("/").pop();
    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const relativeUrl = `${prefix}/${fileName}`;
    return {
      id: `bundled-${prefix.replace(/\//g, "-")}-${idx + 1}`,
      name: cleanName || `Wallpaper ${idx + 1}`,
      data: relativeUrl,
      isDefault: true,
      isBundled: true,
    };
  });
}

export function getBundledFullscreenWallpapers() {
  return formatWallpapers(fullscreenFiles, "wallpapers/fullscreen");
}

export function getBundledLowerThirdWallpapers() {
  return formatWallpapers(lowerThirdFiles, "wallpapers/lowerthird");
}
