export function saveMemory(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Memory save error:", key, e);
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
