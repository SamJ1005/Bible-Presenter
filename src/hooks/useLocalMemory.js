export function saveMemory(key, value) {
  try {
    let toStore = value;
    if (Array.isArray(value) && String(key).includes('queue_items')) {
      toStore = value.map((item) => {
        if (item && item.type === 'file' && item.localPreview && item.localPreview.length > 50000) {
          const { localPreview, ...rest } = item;
          return rest;
        }
        return item;
      });
    }
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch (e) {
    console.error("Memory save error:", key, e);
    try {
      if (Array.isArray(value)) {
        const stripped = value.map((item) => {
          if (item && item.localPreview) {
            const { localPreview, ...rest } = item;
            return rest;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(stripped));
      }
    } catch (innerErr) {
      console.error("Failed fallback save:", innerErr);
    }
  }
}

export function loadMemory(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    console.error("Memory load error:", key, e);
    return fallback;
  }
}
