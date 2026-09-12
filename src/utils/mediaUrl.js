// src/utils/mediaUrl.js

const INVALID_PLACEHOLDERS = new Set([
  '[uploading]',
  '[upload-failed]',
  '[offline-or-failed-upload]',
  '[local-file]',
  '[local-only]',
]);

export function isInvalidMediaUrl(url) {
  return !url || INVALID_PLACEHOLDERS.has(url);
}

/**
 * Normalizes any local file path, file:// URL, or remote URL into a streamable URL.
 * Converts local file system references to the privileged 'local-file://' scheme so that
 * Chromium can stream them with HTTP 206 byte ranges in both dev and production.
 */
export function toStreamableMediaUrl(url, rawPath) {
  let target = url;
  if (isInvalidMediaUrl(target) && rawPath) {
    target = rawPath;
  }
  if (!target || isInvalidMediaUrl(target)) return null;

  if (typeof target === 'string') {
    // Cloud / web / blob / data URLs stay untouched
    if (/^(https?|blob|data):/i.test(target)) {
      return target;
    }
    // Already using our custom Electron protocols
    if (/^(local-file|local-media):/i.test(target)) {
      return target;
    }
    // file:/// or file:// scheme -> local-file:///
    if (/^file:\/\/\//i.test(target)) {
      return target.replace(/^file:\/\/\//i, 'local-file:///');
    }
    if (/^file:\/\//i.test(target)) {
      return target.replace(/^file:\/\//i, 'local-file:///');
    }
    // Windows drive path like C:\... or C:/...
    if (/^[a-zA-Z]:[\\/]/.test(target)) {
      return `local-file:///${target.replace(/\\/g, '/')}`;
    }
    // Unix-style absolute path /home/... or /C:/...
    if (target.startsWith('/')) {
      return `local-file://${target}`;
    }
  }

  return target;
}
