// Intelligent Color Extraction & Dynamic Theme Generator for Musicly Studio
// Extracts dominant colors from background visuals and builds matching 6-swatch Atmosphere Palettes

import { STUDIO_THEMES } from '../data/studioThemes.js';

// In-memory cache for extracted themes by image URL/source
const themeExtractionCache = new Map();

/**
 * Clamp a number between min and max
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Convert RGB (0-255) to 6-digit Hex (#RRGGBB)
 */
export function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(clamp(c, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert 6-digit or 3-digit Hex to { r, g, b }
 */
export function hexToRgb(hex) {
  if (!hex) return { r: 228, g: 228, b: 231 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return { r: 228, g: 228, b: 231 };
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Convert HSL (h: 0-360, s: 0-1, l: 0-1) to { r, g, b } in 0-255
 */
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h >= 0 && h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

/**
 * Convert RGB (0-255) to { h: 0-360, s: 0-1, l: 0-1 }
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
      default:
        break;
    }
  }

  return { h, s, l };
}

/**
 * Clean & authentic Obsidian Titanium theme generator
 */
export function getObsidianTheme(isAuto = true, subtitle = 'Brutalist Precision & Minimalist Canvas') {
  const curated = STUDIO_THEMES.find(t => t.id === 'obsidian_titanium') || {
    id: 'obsidian_titanium',
    name: 'Obsidian Titanium',
    subtitle: 'Brutalist Precision & Matte Satin',
    swatches: ['#09090B', '#18181B', '#27272A', '#3F3F46', '#A1A1AA', '#F4F4F5'],
    shadeNames: ['Jet Void', 'Cast Iron', 'Graphite Matrix', 'Brushed Titanium', 'Chrome Silver', 'Glacial Frost'],
    darkSwatchesCount: 3,
    accent: '#E4E4E7',
    accentLight: '#FFFFFF',
    accentDark: '#3F3F46',
    accentRgb: '228, 228, 231',
    dockGradient: 'linear-gradient(180deg, rgba(39, 39, 42, 0.90) 0%, rgba(24, 24, 27, 0.94) 50%, rgba(9, 9, 11, 0.98) 100%)',
    dockBorder: 'rgba(228, 228, 231, 0.32)',
    dockShadow: 'rgba(0, 0, 0, 0.60)',
    pillBg: 'linear-gradient(180deg, rgba(39, 39, 42, 0.92) 0%, rgba(24, 24, 27, 0.96) 100%)',
    pillBorder: 'rgba(228, 228, 231, 0.30)',
    pillDot: '#E4E4E7',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #F4F4F5 0%, #A1A1AA 26%, #3F3F46 52%, #27272A 72%, #18181B 88%, #09090B 100%)',
    ambientGlow1: 'rgba(161, 161, 170, 0.35)',
    ambientGlow2: 'rgba(24, 24, 27, 0.70)'
  };

  return {
    ...curated,
    id: isAuto ? 'auto_from_bg' : curated.id,
    curatedMatchId: 'obsidian_titanium',
    name: isAuto ? 'Obsidian Titanium (Auto)' : curated.name,
    subtitle: subtitle || curated.subtitle,
    isAuto,
    isMonochrome: true
  };
}

/**
 * Determine evocative theme name and shade names based on hue & saturation
 */
export function getEvocativeThemeMeta(h, s, l) {
  if (s < 0.18) {
    return {
      name: 'Obsidian Titanium (Auto)',
      subtitle: 'Brutalist Precision & Minimalist Canvas',
      shades: ['Jet Void', 'Cast Iron', 'Graphite Matrix', 'Brushed Titanium', 'Chrome Silver', 'Glacial Frost'],
      curatedId: 'obsidian_titanium'
    };
  }

  // Earthy Brown / Leather / Espresso
  if (h >= 15 && h < 38 && l < 0.38) {
    return {
      name: 'Espresso Roast (Auto)',
      subtitle: 'Warm Artisan Cafe & Rich Leather',
      shades: ['Dark Espresso', 'Roasted Bean', 'Hazelnut Wood', 'Cinnamon Crema', 'Almond Foam', 'Warm Porcelain'],
      curatedId: 'espresso_roast'
    };
  }

  if (h >= 345 || h < 15) {
    return {
      name: 'Crimson Rose (Auto)',
      subtitle: 'Dusk Horizon & Velvet Ember',
      shades: ['Bloodstone Void', 'Midnight Merlot', 'Burgundy Velvet', 'Crimson Flare', 'Blush Bloom', 'Porcelain Petal'],
      curatedId: 'crimson_rose'
    };
  }
  if (h >= 15 && h < 48) {
    return {
      name: 'Studio Amber (Auto)',
      subtitle: 'Warm Analogue Studio & Honey Glow',
      shades: ['Dark Molasses', 'Roasted Bark', 'Rich Tobacco', 'Golden Ochre', 'Warm Amber', 'Honeyed Sunlight'],
      curatedId: 'golden_amber'
    };
  }
  if (h >= 48 && h < 70) {
    return {
      name: 'Electric Citron (Auto)',
      subtitle: 'Luminous Solar Citrus Glow',
      shades: ['Deep Olive Void', 'Tawny Shadow', 'Sunlit Khaki', 'Citrine Gold', 'Electric Citron', 'Pale Lime Mist'],
      curatedId: 'golden_amber'
    };
  }
  if (h >= 70 && h < 160) {
    return {
      name: 'Nordic Pine (Auto)',
      subtitle: 'Deep Coniferous Forest & Morning Mist',
      shades: ['Deep Void Pine', 'Abyssal Spruce', 'Dark Forest', 'Jade Canopy', 'Sage Mist', 'Frosted Celadon'],
      curatedId: 'nordic_pine'
    };
  }
  if (h >= 160 && h < 195) {
    return {
      name: 'Ocean Aquamarine (Auto)',
      subtitle: 'Tropical Lagoon & Crystal Waves',
      shades: ['Trench Coral', 'Abyssal Lagoon', 'Deep Turquoise', 'Living Emerald', 'Neon Aquamarine', 'Seafoam Mist'],
      curatedId: 'ocean_aquamarine'
    };
  }
  if (h >= 195 && h < 255) {
    return {
      name: 'Midnight Sapphire (Auto)',
      subtitle: 'Nocturnal Deep Ocean & Cyber Neon',
      shades: ['Abyssal Trench', 'Deep Sea Navy', 'Cobalt Depths', 'Electric Sapphire', 'Neon Cyan', 'Glacial White'],
      curatedId: 'midnight_sapphire'
    };
  }
  if (h >= 255 && h < 295) {
    return {
      name: 'Velvet Amethyst (Auto)',
      subtitle: 'Lush Violet Nebula & Twilight Aura',
      shades: ['Cosmic Obsidian', 'Deep Mulberry', 'Velvet Plum', 'Royal Orchid', 'Soft Lavender', 'Starlight Lilac'],
      curatedId: 'velvet_amethyst'
    };
  }
  return {
    name: 'Electric Orchid (Auto)',
    subtitle: 'Vibrant Magenta Horizon',
    shades: ['Abyssal Plum', 'Midnight Magenta', 'Rich Fuchsia', 'Electric Orchid', 'Neon Petal', 'Blush Starlight'],
    curatedId: 'crimson_rose'
  };
}

/**
 * Generate a complete Studio Atmosphere Theme object from HSL + vibrant RGB
 */
export function buildStudioThemeFromHsl({
  h,
  s,
  l,
  vibrantHex,
  id = 'auto_from_bg',
  customName = null,
  customSubtitle = null,
  isAuto = true
}) {
  if (s < 0.18) {
    return getObsidianTheme(isAuto, customSubtitle);
  }

  const meta = getEvocativeThemeMeta(h, s, l);
  const name = customName || meta.name;
  const subtitle = customSubtitle || meta.subtitle;
  const shadeNames = meta.shades;

  // Harmonic 6-step atmospheric ramp:
  // S0: Darkest void (L ~ 7%)
  // S1: Abyssal base (L ~ 12%)
  // S2: Rich dark tone (L ~ 19%)
  // S3: Deep accent mid-tone (L ~ 33%)
  // S4: Primary vibrant accent (L ~ 52-60%)
  // S5: Luminous frosted highlight (L ~ 88-93%)
  const satVoid = clamp(s * 0.70, 0.20, 0.75);
  const satDark = clamp(s * 0.75, 0.25, 0.80);
  const satMid = clamp(s * 0.85, 0.30, 0.90);
  const satVibrant = clamp(Math.max(s, 0.65), 0.50, 0.98);
  const satLight = clamp(s * 0.50, 0.15, 0.65);

  const rgb0 = hslToRgb(h, satVoid, 0.07);
  const rgb1 = hslToRgb(h, satDark, 0.12);
  const rgb2 = hslToRgb(h, satDark, 0.19);
  const rgb3 = hslToRgb(h, satMid, 0.33);
  const rgb4 = vibrantHex ? hexToRgb(vibrantHex) : hslToRgb(h, satVibrant, clamp(l, 0.48, 0.62));
  const rgb5 = hslToRgb(h, satLight, 0.90);

  const sRgbList = [rgb0, rgb1, rgb2, rgb3, rgb4, rgb5];
  const swatches = sRgbList.map(c => rgbToHex(c.r, c.g, c.b));

  const [c0, c1, c2, c3, c4, c5] = sRgbList;
  const accentHex = swatches[4];
  const accentLightHex = swatches[5];
  const accentDarkHex = swatches[3];
  const accentRgbStr = `${c4.r}, ${c4.g}, ${c4.b}`;

  return {
    id,
    curatedMatchId: meta.curatedId || null,
    name,
    subtitle,
    swatches,
    shadeNames,
    darkSwatchesCount: 4,
    accent: accentHex,
    accentLight: accentLightHex,
    accentDark: accentDarkHex,
    accentRgb: accentRgbStr,
    dockGradient: `linear-gradient(180deg, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.90) 0%, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.94) 50%, rgba(${c0.r}, ${c0.g}, ${c0.b}, 0.98) 100%)`,
    dockBorder: `rgba(${c4.r}, ${c4.g}, ${c4.b}, 0.35)`,
    dockShadow: `rgba(${c0.r}, ${c0.g}, ${c0.b}, 0.55)`,
    pillBg: `linear-gradient(180deg, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.92) 0%, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.96) 100%)`,
    pillBorder: `rgba(${c4.r}, ${c4.g}, ${c4.b}, 0.35)`,
    pillDot: accentHex,
    cardGradient: `radial-gradient(ellipse 135% 95% at 50% -10%, ${swatches[5]} 0%, ${swatches[4]} 26%, ${swatches[3]} 52%, ${swatches[2]} 72%, ${swatches[1]} 88%, ${swatches[0]} 100%)`,
    ambientGlow1: `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.45)`,
    ambientGlow2: `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.65)`,
    isAuto
  };
}

/**
 * Generate a complete Studio Atmosphere Theme from any single Hex color
 */
export function generateThemeFromHex(hex, customName = 'Custom Palette', customSubtitle = 'Personalized atmosphere tint') {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return buildStudioThemeFromHsl({
    h: hsl.h,
    s: hsl.s,
    l: hsl.l,
    vibrantHex: hex,
    id: `custom_${hex.replace('#', '').toLowerCase()}`,
    customName,
    customSubtitle,
    isAuto: false
  });
}

/**
 * Find the closest curated STUDIO_THEME by hue angle
 */
export function findClosestCuratedTheme(hexOrHsl) {
  let h = 0;
  let s = 1;
  if (typeof hexOrHsl === 'string') {
    const rgb = hexToRgb(hexOrHsl);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    h = hsl.h;
    s = hsl.s;
  } else if (hexOrHsl && typeof hexOrHsl.h === 'number') {
    h = hexOrHsl.h;
    s = hexOrHsl.s !== undefined ? hexOrHsl.s : 1;
  }

  // If desaturated, closest curated is Obsidian Titanium
  if (s < 0.18) {
    return STUDIO_THEMES.find(t => t.id === 'obsidian_titanium') || STUDIO_THEMES[0];
  }

  let closest = STUDIO_THEMES[0];
  let minDiff = 360;

  for (const theme of STUDIO_THEMES) {
    if (theme.id === 'obsidian_titanium') continue;
    const tRgb = hexToRgb(theme.accent);
    const tHsl = rgbToHsl(tRgb.r, tRgb.g, tRgb.b);
    let diff = Math.abs(h - tHsl.h);
    if (diff > 180) diff = 360 - diff;
    if (diff < minDiff) {
      minDiff = diff;
      closest = theme;
    }
  }

  return closest;
}

/**
 * Clear the in-memory theme extraction cache (e.g. on setting updates)
 */
export function clearThemeExtractionCache() {
  themeExtractionCache.clear();
}

/**
 * Extract dominant colors from an image using an offscreen HTML5 canvas.
 * Accurately detects:
 * 1. Minimalist White Canvas & Line Art (selecting Obsidian Titanium)
 * 2. Dark Void / Low-Key Photography (selecting Obsidian Titanium)
 * 3. Grayscale / Desaturated Art (selecting Obsidian Titanium)
 * 4. Rich Chromatic Backgrounds (selecting harmonic atmospheric palettes)
 * 
 * Returns a Promise that resolves to the generated Studio Theme.
 */
export async function extractThemeFromImage(imageUrl) {
  if (!imageUrl) {
    return getObsidianTheme(true);
  }

  // Check cache
  if (themeExtractionCache.has(imageUrl)) {
    return themeExtractionCache.get(imageUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    // Enable cross-origin reading where allowed
    img.crossOrigin = 'anonymous';

    const handleSuccess = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64; // 64x64 = 4096 samples: fast (<5ms) and accurate
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size).data;

        // Statistics collection
        let totalValid = 0;
        let totalSat = 0;
        let whiteOrLightCount = 0;  // l >= 0.82 && s <= 0.28 (white paper, cream, off-white)
        let blackOrDarkCount = 0;   // l <= 0.14 && s <= 0.32 (black ink, black void)
        let grayNeutralCount = 0;   // s <= 0.16 && l > 0.14 && l < 0.82 (neutral grays)
        let chromaticCount = 0;     // s >= 0.20 && l >= 0.12 && l <= 0.88 (meaningful color)

        // Perimeter / Edge sampling (outer 15% margins: x < 10 || x >= 54 || y < 10 || y >= 54)
        let borderTotal = 0;
        let borderWhiteCount = 0;
        let borderBlackCount = 0;
        let borderNeutralCount = 0;
        let borderChromaticCount = 0;

        // 36 hue bins (10 deg each) for chromatic clustering
        const hueBins = Array.from({ length: 36 }, () => ({
          weight: 0,
          totalR: 0,
          totalG: 0,
          totalB: 0,
          count: 0
        }));

        let maxVibrantPixel = { r: 228, g: 228, b: 231, score: -1 };
        const borderMargin = Math.round(size * 0.15); // ~10 pixels

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const a = imgData[idx + 3];
            if (a < 128) continue; // transparent pixel

            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const { h, s, l } = rgbToHsl(r, g, b);

            totalValid++;
            totalSat += s;

            const isBorder = (x < borderMargin || x >= size - borderMargin || y < borderMargin || y >= size - borderMargin);
            if (isBorder) borderTotal++;

            // Achromatic classifications
            const isWhiteOrLight = (l >= 0.80 && s <= 0.30) || (l >= 0.88 && s <= 0.42);
            const isBlackOrDark = (l <= 0.14 && s <= 0.32) || (l <= 0.08);
            const isGrayNeutral = (s <= 0.16 && l > 0.14 && l < 0.80);
            const isAchromatic = isWhiteOrLight || isBlackOrDark || isGrayNeutral;

            if (isWhiteOrLight) {
              whiteOrLightCount++;
              if (isBorder) {
                borderWhiteCount++;
                borderNeutralCount++;
              }
            } else if (isBlackOrDark) {
              blackOrDarkCount++;
              if (isBorder) {
                borderBlackCount++;
                borderNeutralCount++;
              }
            } else if (isGrayNeutral) {
              grayNeutralCount++;
              if (isBorder) borderNeutralCount++;
            } else {
              // Chromatic pixel with perceptible color
              chromaticCount++;
              if (isBorder) borderChromaticCount++;

              // Weight chromatic pixel: balance saturation and luminance
              const lumWeight = 1 - Math.abs(l - 0.52) * 1.3;
              const weight = s * Math.max(lumWeight, 0.2);

              const binIdx = Math.floor(((h % 360) + 360) % 360 / 10) % 36;
              hueBins[binIdx].weight += weight;
              hueBins[binIdx].totalR += r;
              hueBins[binIdx].totalG += g;
              hueBins[binIdx].totalB += b;
              hueBins[binIdx].count += 1;

              if (weight > maxVibrantPixel.score) {
                maxVibrantPixel = { r, g, b, score: weight };
              }
            }
          }
        }

        if (totalValid === 0) {
          const fallback = getObsidianTheme(true);
          resolve(fallback);
          return;
        }

        const avgSat = totalSat / totalValid;
        const totalAchromatic = whiteOrLightCount + blackOrDarkCount + grayNeutralCount;
        const achromaticRatio = totalAchromatic / totalValid;
        const whiteRatio = whiteOrLightCount / totalValid;
        const chromaticRatio = chromaticCount / totalValid;
        const borderNeutralRatio = borderTotal > 0 ? borderNeutralCount / borderTotal : 0;
        const borderWhiteRatio = borderTotal > 0 ? borderWhiteCount / borderTotal : 0;
        const borderBlackRatio = borderTotal > 0 ? borderBlackCount / borderTotal : 0;

        // =================================================================
        // ACCURATE OBSIDIAN DETECTION:
        // 1. Perimeter canvas test: If image border is predominantly white canvas or black void
        //    (e.g., line art, sketches, posters, high-key/low-key art on paper/void)
        // 2. Global Achromatic majority: If > 50% of total image is white/black/neutral gray
        // 3. Low overall saturation: Grayscale / desaturated photo (avgSat < 0.18)
        // =================================================================
        const isWhiteCanvasArt = (borderWhiteRatio >= 0.50 || whiteRatio >= 0.40) && chromaticRatio < 0.45;
        const isBlackVoidArt = (borderBlackRatio >= 0.60) && chromaticRatio < 0.35;
        const isMinimalistNeutral = (borderNeutralRatio >= 0.60 && chromaticRatio < 0.38) || (achromaticRatio >= 0.50 && chromaticRatio < 0.38);
        const isGrayscale = avgSat < 0.18;

        if (isWhiteCanvasArt || isBlackVoidArt || isMinimalistNeutral || isGrayscale) {
          const obsidianTheme = getObsidianTheme(
            true, 
            isWhiteCanvasArt 
              ? 'Minimalist White Canvas & Brutalist Frame' 
              : (isBlackVoidArt ? 'Deep Void Charcoal & Brutalist Titanium' : 'Monochrome Minimalist Canvas')
          );
          themeExtractionCache.set(imageUrl, obsidianTheme);
          resolve(obsidianTheme);
          return;
        }

        // =================================================================
        // CHROMATIC THEME EXTRACTION (for rich colorful visuals)
        // =================================================================
        let bestBinIdx = 3;
        let maxBinWeight = -1;
        for (let b = 0; b < 36; b++) {
          if (hueBins[b].weight > maxBinWeight) {
            maxBinWeight = hueBins[b].weight;
            bestBinIdx = b;
          }
        }

        let finalR, finalG, finalB;
        if (hueBins[bestBinIdx].count > 0) {
          finalR = Math.round(hueBins[bestBinIdx].totalR / hueBins[bestBinIdx].count);
          finalG = Math.round(hueBins[bestBinIdx].totalG / hueBins[bestBinIdx].count);
          finalB = Math.round(hueBins[bestBinIdx].totalB / hueBins[bestBinIdx].count);
        } else {
          finalR = maxVibrantPixel.r;
          finalG = maxVibrantPixel.g;
          finalB = maxVibrantPixel.b;
        }

        const extractedHsl = rgbToHsl(finalR, finalG, finalB);
        const finalH = extractedHsl.h;
        const finalS = clamp(extractedHsl.s * 1.15, 0.35, 0.95);
        const finalL = clamp(extractedHsl.l, 0.42, 0.62);
        const vibrantHex = rgbToHex(finalR, finalG, finalB);

        const generatedTheme = buildStudioThemeFromHsl({
          h: finalH,
          s: finalS,
          l: finalL,
          vibrantHex,
          id: 'auto_from_bg',
          isAuto: true
        });

        themeExtractionCache.set(imageUrl, generatedTheme);
        resolve(generatedTheme);
      } catch (err) {
        console.warn('Canvas image analysis fallback:', err);
        // Fallback to sleek Obsidian Titanium instead of Amber
        const fallback = getObsidianTheme(true);
        resolve(fallback);
      }
    };

    const handleError = () => {
      // Fallback to sleek Obsidian Titanium
      const fallback = getObsidianTheme(true);
      resolve(fallback);
    };

    img.onload = handleSuccess;
    img.onerror = handleError;
    img.src = imageUrl;
  });
}
