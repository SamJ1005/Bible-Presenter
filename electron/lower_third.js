/**
 * lower_third.js — Shared lower-third presentation logic
 * 
 * Used by both presentation.html and presentation_prelist.html.
 * Extracted from presentation.html to avoid duplication and collisions.
 */

/* ---------- LOWER THIRD: LAYOUT ---------- */

/**
 * Apply the lower-third layout positioning to all elements.
 * Call this when data.presentationLayout === 'lowerThird'.
 *
 * @param {Object} els  - DOM elements { container, verseArea, refArea, box, bgLayer, watermark }
 * @param {Object} data - The presentation payload
 * @returns {boolean}   - false if presentation should be hidden (multi-verse), true otherwise
 */
function applyLowerThirdLayout(els, data) {
  const { container, verseArea, refArea, box, watermark } = els;

  container.style.justifyContent = 'flex-end';
  container.style.paddingBottom = '3vh';
  verseArea.style.flex = 'none';

  box.style.alignItems = 'flex-start';
  box.style.textAlign = 'left';

  // Fade out entirely if not a single verse
  const indexStr = data.index || '';
  const isSingle = !indexStr.includes(',') && !indexStr.includes('-');
  if (!isSingle) {
    document.body.style.opacity = '0';
    return false;
  }

  box.style.display = 'block';

  let spacer = document.getElementById('lt-float-spacer');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.id = 'lt-float-spacer';
    box.insertBefore(spacer, box.firstChild);
  }
  spacer.style.display = 'block';
  spacer.style.float = 'right';
  spacer.style.width = '0px';
  spacer.style.height = '11vh';

  // Move refArea inside box so it floats with text
  box.insertBefore(refArea, spacer.nextSibling);

  // Position index in the bottom-right corner as a float
  refArea.style.position = 'relative';
  refArea.style.float = 'right';
  refArea.style.clear = 'right';
  refArea.style.bottom = 'auto';
  refArea.style.right = 'auto';
  refArea.style.marginTop = '0';
  refArea.style.marginRight = '0.8vw';
  refArea.style.padding = '0.3vh 0.6vw';
  refArea.style.paddingTop = '0';
  refArea.style.minHeight = 'auto';
  refArea.style.display = 'block';

  // Remove underline and bold the index in lower third
  if (els.ref) {
    els.ref.style.textDecoration = 'none';
    els.ref.style.fontWeight = 'bold';
  }

  // Hide watermark in lower-third
  if (watermark) watermark.style.display = 'none';

  // Re-order: verse first, index second
  verseArea.style.order = '1';
  refArea.style.order = '2';

  return true;
}

/* ---------- LOWER THIRD: BACKGROUND ---------- */

/**
 * Apply the lower-third background (image or transparent).
 *
 * @param {HTMLElement} bgLayer - The #bgLayer element
 * @param {Object}      data   - The presentation payload
 * @param {Function}    getSafeBgUrl - Utility to build a safe CSS url()
 */
function applyLowerThirdBackground(bgLayer, data, getSafeBgUrl) {
  if (!window.bgCache) {
    window.bgCache = { type: null, val: null, layout: null };
  }

  const layout = 'lowerThird';

  if (data.lowerThirdBgImage) {
    if (window.bgCache.type !== 'lowerThirdImage' || window.bgCache.val !== data.lowerThirdBgImage || window.bgCache.layout !== layout) {
      bgLayer.style.backgroundImage = getSafeBgUrl(data.lowerThirdBgImage);
      bgLayer.style.backgroundColor = 'transparent';

      bgLayer.style.top = 'auto';
      bgLayer.style.bottom = '0vh';
      bgLayer.style.height = '20vh';
      bgLayer.style.backgroundSize = '100% 100%';
      bgLayer.style.backgroundPosition = 'center';

      window.bgCache = { type: 'lowerThirdImage', val: data.lowerThirdBgImage, layout };
    }
  } else {
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.backgroundColor = 'transparent';

    bgLayer.style.top = 'auto';
    bgLayer.style.bottom = '0vh';
    bgLayer.style.height = '20vh';
    bgLayer.style.backgroundSize = '100% 100%';

    window.bgCache = { type: 'transparent', val: null, layout };
  }

  document.body.style.backgroundColor = 'transparent';
}

/* ---------- LOWER THIRD: RESET TO FULLSCREEN ---------- */

/**
 * Reset all lower-third layout changes back to fullscreen defaults.
 *
 * @param {Object} els - DOM elements { container, verseArea, refArea, box, bgLayer, watermark }
 */
function resetToFullscreenLayout(els) {
  const { container, verseArea, refArea, box, watermark } = els;

  container.style.justifyContent = 'flex-start';
  container.style.paddingBottom = '0';
  verseArea.style.flex = '1';

  box.style.alignItems = 'center';
  box.style.textAlign = 'center';
  box.style.display = 'flex';

  const spacer = document.getElementById('lt-float-spacer');
  if (spacer) spacer.style.display = 'none';

  // Move refArea back to container
  container.insertBefore(refArea, verseArea);

  refArea.style.position = 'static';
  refArea.style.float = 'none';
  refArea.style.clear = 'none';
  refArea.style.marginTop = '0';
  refArea.style.marginRight = '0';
  refArea.style.bottom = 'auto';
  refArea.style.right = 'auto';
  refArea.style.padding = '';
  refArea.style.paddingTop = '3.5vh';
  refArea.style.minHeight = '5%';
  refArea.style.display = 'flex';

  verseArea.style.order = '';
  refArea.style.order = '';

  if (els.ref) {
    els.ref.style.textDecoration = ''; // Restore underline
    els.ref.style.fontWeight = '';     // Restore bold setting
  }

  document.body.style.backgroundColor = 'var(--bg)';

  if (watermark) watermark.style.display = 'block';
}

/* ---------- LOWER THIRD: FULLSCREEN BACKGROUND ---------- */

/**
 * Apply the fullscreen background (image, white, custom, or black).
 *
 * @param {HTMLElement} bgLayer - The #bgLayer element
 * @param {Object}      data   - The presentation payload
 * @param {Function}    getSafeBgUrl - Utility to build a safe CSS url()
 */
function applyFullscreenBackground(bgLayer, data, getSafeBgUrl) {
  if (!window.bgCache) {
    window.bgCache = { type: null, val: null, layout: null };
  }

  const bgType = data.presentationBgType || 'black';
  const layout = 'fullscreen';

  // Reset bgLayer to fullscreen
  bgLayer.style.top = '0';
  bgLayer.style.bottom = 'auto';
  bgLayer.style.height = '100%';
  bgLayer.style.backgroundSize = 'cover';

  if (bgType === 'image' && data.presentationBgImage) {
    if (window.bgCache.type !== 'image' || window.bgCache.val !== data.presentationBgImage || window.bgCache.layout !== layout) {
      bgLayer.style.backgroundImage = getSafeBgUrl(data.presentationBgImage);
      bgLayer.style.backgroundColor = 'transparent';
      window.bgCache = { type: 'image', val: data.presentationBgImage, layout };
    }
  } else if (bgType === 'white') {
    if (window.bgCache.type !== 'white' || window.bgCache.layout !== layout) {
      bgLayer.style.backgroundImage = 'none';
      bgLayer.style.backgroundColor = '#ffffff';
      window.bgCache = { type: 'white', val: null, layout };
    }
  } else if (bgType === 'custom' && data.presentationBgColor) {
    if (window.bgCache.type !== 'custom' || window.bgCache.val !== data.presentationBgColor || window.bgCache.layout !== layout) {
      bgLayer.style.backgroundImage = 'none';
      bgLayer.style.backgroundColor = data.presentationBgColor;
      window.bgCache = { type: 'custom', val: data.presentationBgColor, layout };
    }
  } else {
    if (window.bgCache.type !== 'black' || window.bgCache.layout !== layout) {
      bgLayer.style.backgroundImage = 'none';
      bgLayer.style.backgroundColor = '#000000';
      window.bgCache = { type: 'black', val: null, layout };
    }
  }
}

/* ---------- LOWER THIRD: TEXT COLOR ---------- */

/**
 * Apply text color based on layout. Lower-third uses its own color if set.
 *
 * @param {Object} els  - DOM elements { ref, tamil, eng }
 * @param {Object} data - The presentation payload
 * @param {string} layout - 'lowerThird' or 'fullscreen'
 * @returns {string} The resolved text color
 */
function applyTextColor(els, data, layout) {
  const { ref, tamil, eng } = els;

  let textColor = data.presentationTextColor || '#fff';
  if (layout === 'lowerThird' && data.lowerThirdTextColor) {
    textColor = data.lowerThirdTextColor;
  }

  document.body.style.color = textColor;
  ref.style.color = textColor;
  ref.style.textDecorationColor = (textColor === 'black' || textColor === '#000000') ? '#444' : '#b4b4b4ec';
  tamil.style.color = textColor;
  eng.style.color = textColor;

  return textColor;
}

/* ---------- LOWER THIRD: CONTENT LAYOUT ---------- */

/**
 * Apply lower-third content sizing (verse area padding, box constraints).
 * Tamil-only, auto-fit within the 15.5vh area, accounting for padding/margin.
 *
 * @param {Object} els  - DOM elements { verseArea, box, eng }
 * @param {Object} overrides - Optional layoutOverrides from prelist items
 */
function applyLowerThirdContentLayout(els, overrides) {
  const { verseArea, box, eng } = els;

  // Force hide English in lower-third — Tamil only
  eng.style.display = 'none';

  // Content area with padding for margin-aware auto-fit
  // Verse goes till the full right side border (1vw padding)
  // Float handles the text wrapping around the index!
  const versePadding = (overrides && overrides.versePaddingTop !== undefined)
    ? `${overrides.versePaddingTop}vh 1vw 0 20vw`
    : '1vh 1vw 0 20vw';

  verseArea.style.padding = versePadding;
  box.style.marginTop = '0';
  box.style.gap = '0';
  box.style.overflow = 'hidden';
  box.style.justifyContent = 'flex-start';
  verseArea.style.justifyContent = 'flex-start';
  box.style.minHeight = '15.5vh';
  box.style.maxHeight = '15.5vh';
}

/* ---------- LOWER THIRD: FIT TAMIL TEXT ---------- */

/**
 * Auto-fit Tamil text within the lower-third area.
 * Starts at 4.5vw and shrinks until it fits the box height,
 * accounting for padding space from the margins.
 *
 * @param {HTMLElement} tamilEl - The #tamilText element
 * @param {HTMLElement} box     - The #verseBox element
 * @param {Object}      data   - The presentation payload (for font offsets)
 */
function fitLowerThirdTamil(tamilEl, box, data) {
  const tamilText = data.tamilText ? data.tamilText.replace(/<[^>]*>/g, "") : "";
  const len = tamilText.length;

  // Use multiple font size presets based on text length (similar to normal presentation)
  let tamilVW = 2.5;
  if (len < 80) tamilVW = 2.2;
  else if (len < 160) tamilVW = 2.0;
  else if (len < 240) tamilVW = 1.6;
  else tamilVW = 1.4;

  const minVW = 1.2;

  tamilEl.style.fontSize = tamilVW + 'vw';

  // Shrink loop: account for box padding/margin by checking scrollHeight vs clientHeight
  let safety = 0;
  while (
    (box.scrollHeight > box.clientHeight || tamilEl.scrollWidth > box.clientWidth) &&
    tamilVW > minVW &&
    safety < 120
  ) {
    tamilVW -= 0.1;
    tamilEl.style.fontSize = tamilVW + 'vw';
    safety++;
  }

  // Apply font offset AFTER auto-shrink
  const tamilOffset = (data.tamilFontOffset || 0) * 0.15;
  const localOffset = (data.fontSizeOffset || 0) * 0.15;
  tamilVW += tamilOffset + localOffset;
  tamilEl.style.fontSize = tamilVW + 'vw';
}

/* ---------- LOWER THIRD: FIT REFERENCE ---------- */

/**
 * Fit the reference (index) text for lower-third mode.
 * Significantly smaller than fullscreen.
 *
 * @param {HTMLElement} refEl - The #reference element
 * @param {Object}      data  - The presentation payload
 */
function fitLowerThirdReference(refEl, data) {
  const text = (refEl.innerText || '').toLowerCase();
  const isSmallRef =
    text.includes('revelation') ||
    text.includes('வெளிப்படுத்தின') ||
    text.includes('thessalonians') ||
    text.includes('தெச');

  const isMultiVerse = text.includes('-') || text.includes(',');
  const isLongText = text.length > 20;

  let vw = (isSmallRef || (isMultiVerse && isLongText)) ? 4.2 : 5.5;
  vw *= 0.28; // Significantly smaller for lower-third

  const indexOffset = (data && data.indexFontOffset ? data.indexFontOffset : 0) * 0.15;
  const localOffset = (data && data.fontSizeOffset ? data.fontSizeOffset : 0) * 0.10;
  vw += indexOffset + localOffset;

  refEl.style.fontSize = vw + 'vw';

  // Shrink if still overflowing
  while (refEl.scrollWidth > refEl.clientWidth && vw > 0.8) {
    vw -= 0.05;
    refEl.style.fontSize = vw + 'vw';
  }
}
