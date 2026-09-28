// Curated High-Fidelity Atmosphere Color Palettes for Musicly Studio
// Designed to match the cascading layered pill swatches (from reference palette specs)

export const STUDIO_THEMES = [
  {
    id: 'nordic_pine',
    name: 'Nordic Pine',
    subtitle: 'Deep Coniferous Forest & Morning Mist',
    swatches: ['#051F20', '#0B2B26', '#163832', '#235347', '#8EB69B', '#DAF1DE'],
    shadeNames: ['Deep Void Pine', 'Abyssal Spruce', 'Dark Forest', 'Jade Canopy', 'Sage Mist', 'Frosted Celadon'],
    darkSwatchesCount: 4,
    accent: '#8EB69B',
    accentLight: '#DAF1DE',
    accentDark: '#235347',
    accentRgb: '142, 182, 155',
    dockGradient: 'linear-gradient(180deg, rgba(22, 56, 50, 0.90) 0%, rgba(11, 43, 38, 0.94) 50%, rgba(5, 31, 32, 0.98) 100%)',
    dockBorder: 'rgba(142, 182, 155, 0.35)',
    dockShadow: 'rgba(5, 31, 32, 0.5)',
    pillBg: 'linear-gradient(180deg, rgba(22, 56, 50, 0.92) 0%, rgba(11, 43, 38, 0.96) 100%)',
    pillBorder: 'rgba(142, 182, 155, 0.35)',
    pillDot: '#8EB69B',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #DAF1DE 0%, #8EB69B 26%, #235347 52%, #163832 72%, #0B2B26 88%, #051F20 100%)',
    ambientGlow1: 'rgba(35, 83, 71, 0.45)',
    ambientGlow2: 'rgba(11, 43, 38, 0.65)'
  },
  {
    id: 'golden_amber',
    name: 'Studio Amber',
    subtitle: 'Warm Analogue Studio & Honey Glow',
    swatches: ['#1F1303', '#382206', '#5E3B0B', '#8C5710', '#F4A000', '#FFE6AA'],
    shadeNames: ['Dark Molasses', 'Roasted Bark', 'Rich Tobacco', 'Golden Ochre', 'Warm Amber', 'Honeyed Sunlight'],
    darkSwatchesCount: 4,
    accent: '#F4A000',
    accentLight: '#FFE6AA',
    accentDark: '#8C5710',
    accentRgb: '244, 160, 0',
    dockGradient: 'linear-gradient(180deg, rgba(94, 59, 11, 0.90) 0%, rgba(56, 34, 6, 0.94) 50%, rgba(31, 19, 3, 0.98) 100%)',
    dockBorder: 'rgba(255, 215, 120, 0.32)',
    dockShadow: 'rgba(31, 19, 3, 0.45)',
    pillBg: 'linear-gradient(180deg, rgba(94, 59, 11, 0.92) 0%, rgba(56, 34, 6, 0.96) 100%)',
    pillBorder: 'rgba(255, 210, 90, 0.30)',
    pillDot: '#F4A000',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #FFE6AA 0%, #F4A000 26%, #8C5710 52%, #5E3B0B 72%, #382206 88%, #1F1303 100%)',
    ambientGlow1: 'rgba(140, 87, 16, 0.42)',
    ambientGlow2: 'rgba(56, 34, 6, 0.58)'
  },
  {
    id: 'ocean_aquamarine',
    name: 'Ocean Aquamarine',
    subtitle: 'Tropical Lagoon & Crystal Waves',
    swatches: ['#03181A', '#06282B', '#0D4448', '#0D9488', '#2DD4BF', '#CCFBF1'],
    shadeNames: ['Trench Coral', 'Abyssal Lagoon', 'Deep Turquoise', 'Living Emerald', 'Neon Aquamarine', 'Seafoam Mist'],
    darkSwatchesCount: 3,
    accent: '#2DD4BF',
    accentLight: '#CCFBF1',
    accentDark: '#0D9488',
    accentRgb: '45, 212, 191',
    dockGradient: 'linear-gradient(180deg, rgba(13, 68, 72, 0.90) 0%, rgba(6, 40, 43, 0.94) 50%, rgba(3, 24, 26, 0.98) 100%)',
    dockBorder: 'rgba(45, 212, 191, 0.35)',
    dockShadow: 'rgba(3, 24, 26, 0.55)',
    pillBg: 'linear-gradient(180deg, rgba(13, 68, 72, 0.92) 0%, rgba(6, 40, 43, 0.96) 100%)',
    pillBorder: 'rgba(45, 212, 191, 0.35)',
    pillDot: '#2DD4BF',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #CCFBF1 0%, #2DD4BF 26%, #0D9488 52%, #0D4448 72%, #06282B 88%, #03181A 100%)',
    ambientGlow1: 'rgba(13, 148, 136, 0.42)',
    ambientGlow2: 'rgba(6, 40, 43, 0.65)'
  },
  {
    id: 'midnight_sapphire',
    name: 'Midnight Sapphire',
    subtitle: 'Nocturnal Deep Ocean & Cyber Neon',
    swatches: ['#040814', '#0A1428', '#14294F', '#2563EB', '#38BDF8', '#E0F2FE'],
    shadeNames: ['Abyssal Trench', 'Deep Sea Navy', 'Cobalt Depths', 'Electric Sapphire', 'Neon Cyan', 'Glacial White'],
    darkSwatchesCount: 3,
    accent: '#38BDF8',
    accentLight: '#E0F2FE',
    accentDark: '#2563EB',
    accentRgb: '56, 189, 248',
    dockGradient: 'linear-gradient(180deg, rgba(20, 41, 79, 0.90) 0%, rgba(10, 20, 40, 0.94) 50%, rgba(4, 8, 20, 0.98) 100%)',
    dockBorder: 'rgba(56, 189, 248, 0.35)',
    dockShadow: 'rgba(4, 8, 20, 0.55)',
    pillBg: 'linear-gradient(180deg, rgba(20, 41, 79, 0.92) 0%, rgba(10, 20, 40, 0.96) 100%)',
    pillBorder: 'rgba(56, 189, 248, 0.35)',
    pillDot: '#38BDF8',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #E0F2FE 0%, #38BDF8 26%, #2563EB 52%, #14294F 72%, #0A1428 88%, #040814 100%)',
    ambientGlow1: 'rgba(37, 99, 235, 0.40)',
    ambientGlow2: 'rgba(10, 20, 40, 0.65)'
  },
  {
    id: 'velvet_amethyst',
    name: 'Velvet Amethyst',
    subtitle: 'Lush Violet Nebula & Twilight Aura',
    swatches: ['#0F0617', '#1F0D30', '#3B175B', '#7E22CE', '#C084FC', '#F3E8FF'],
    shadeNames: ['Cosmic Obsidian', 'Deep Mulberry', 'Velvet Plum', 'Royal Orchid', 'Soft Lavender', 'Starlight Lilac'],
    darkSwatchesCount: 3,
    accent: '#C084FC',
    accentLight: '#F3E8FF',
    accentDark: '#7E22CE',
    accentRgb: '192, 132, 252',
    dockGradient: 'linear-gradient(180deg, rgba(59, 23, 91, 0.90) 0%, rgba(31, 13, 48, 0.94) 50%, rgba(15, 6, 23, 0.98) 100%)',
    dockBorder: 'rgba(192, 132, 252, 0.35)',
    dockShadow: 'rgba(15, 6, 23, 0.55)',
    pillBg: 'linear-gradient(180deg, rgba(59, 23, 91, 0.92) 0%, rgba(31, 13, 48, 0.96) 100%)',
    pillBorder: 'rgba(192, 132, 252, 0.35)',
    pillDot: '#C084FC',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #F3E8FF 0%, #C084FC 26%, #7E22CE 52%, #3B175B 72%, #1F0D30 88%, #0F0617 100%)',
    ambientGlow1: 'rgba(126, 34, 206, 0.42)',
    ambientGlow2: 'rgba(31, 13, 48, 0.65)'
  },
  {
    id: 'crimson_rose',
    name: 'Crimson Rose',
    subtitle: 'Dusk Horizon & Velvet Ember',
    swatches: ['#170509', '#2E0A12', '#521221', '#9F1239', '#FB7185', '#FFE4E6'],
    shadeNames: ['Dark Bloodstone', 'Midnight Merlot', 'Burgundy Velvet', 'Crimson Flare', 'Blush Bloom', 'Porcelain Petal'],
    darkSwatchesCount: 3,
    accent: '#FB7185',
    accentLight: '#FFE4E6',
    accentDark: '#9F1239',
    accentRgb: '251, 113, 133',
    dockGradient: 'linear-gradient(180deg, rgba(82, 18, 33, 0.90) 0%, rgba(46, 10, 18, 0.94) 50%, rgba(23, 5, 9, 0.98) 100%)',
    dockBorder: 'rgba(251, 113, 133, 0.35)',
    dockShadow: 'rgba(23, 5, 9, 0.55)',
    pillBg: 'linear-gradient(180deg, rgba(82, 18, 33, 0.92) 0%, rgba(46, 10, 18, 0.96) 100%)',
    pillBorder: 'rgba(251, 113, 133, 0.35)',
    pillDot: '#FB7185',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #FFE4E6 0%, #FB7185 26%, #9F1239 52%, #521221 72%, #2E0A12 88%, #170509 100%)',
    ambientGlow1: 'rgba(159, 18, 57, 0.42)',
    ambientGlow2: 'rgba(46, 10, 18, 0.65)'
  },
  {
    id: 'espresso_roast',
    name: 'Espresso Roast',
    subtitle: 'Warm Artisan Cafe & Rich Leather',
    swatches: ['#120A06', '#21130B', '#3B2215', '#673D26', '#B88B6E', '#F4ECE6'],
    shadeNames: ['Dark Espresso', 'Roasted Bean', 'Hazelnut Wood', 'Cinnamon Crema', 'Almond Foam', 'Warm Porcelain'],
    darkSwatchesCount: 4,
    accent: '#B88B6E',
    accentLight: '#F4ECE6',
    accentDark: '#673D26',
    accentRgb: '184, 139, 110',
    dockGradient: 'linear-gradient(180deg, rgba(59, 34, 21, 0.90) 0%, rgba(33, 19, 11, 0.94) 50%, rgba(18, 10, 6, 0.98) 100%)',
    dockBorder: 'rgba(184, 139, 110, 0.35)',
    dockShadow: 'rgba(18, 10, 6, 0.55)',
    pillBg: 'linear-gradient(180deg, rgba(59, 34, 21, 0.92) 0%, rgba(33, 19, 11, 0.96) 100%)',
    pillBorder: 'rgba(184, 139, 110, 0.35)',
    pillDot: '#B88B6E',
    cardGradient: 'radial-gradient(ellipse 135% 95% at 50% -10%, #F4ECE6 0%, #B88B6E 26%, #673D26 52%, #3B2215 72%, #21130B 88%, #120A06 100%)',
    ambientGlow1: 'rgba(103, 61, 38, 0.42)',
    ambientGlow2: 'rgba(33, 19, 11, 0.65)'
  },
  {
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
  }
];

export const DEFAULT_THEME_ID = 'obsidian_titanium';

export function getSavedStudioTheme() {
  try {
    const saved = localStorage.getItem('musicly_studio_theme');
    if (saved) {
      if (saved.startsWith('{')) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.swatches) && parsed.swatches.length === 6) {
          // If it was the legacy auto_from_bg amber theme, don't keep returning stale amber!
          if (parsed.id === 'auto_from_bg' && (parsed.name?.includes('Amber') || parsed.name?.includes('Solar'))) {
            return STUDIO_THEMES.find(t => t.id === 'obsidian_titanium') || STUDIO_THEMES[0];
          }
          return parsed;
        }
      }
      const found = STUDIO_THEMES.find(t => t.id === saved);
      if (found) return found;
    }
  } catch (e) {}
  // Default to sleek Obsidian Titanium
  return STUDIO_THEMES.find(t => t.id === DEFAULT_THEME_ID) || STUDIO_THEMES[0];
}

export function saveStudioTheme(themeOrId) {
  try {
    if (typeof themeOrId === 'string') {
      localStorage.setItem('musicly_studio_theme', themeOrId);
    } else if (themeOrId && typeof themeOrId === 'object') {
      if (themeOrId.id && STUDIO_THEMES.some(t => t.id === themeOrId.id)) {
        localStorage.setItem('musicly_studio_theme', themeOrId.id);
      } else {
        localStorage.setItem('musicly_studio_theme', JSON.stringify(themeOrId));
      }
    }
  } catch (e) {}
}

export function getIsAutoThemeEnabled() {
  try {
    const val = localStorage.getItem('musicly_auto_theme_enabled');
    // Default to true so theme automatically chooses according to background!
    return val === null ? true : val === 'true';
  } catch (e) {
    return true;
  }
}

export function setIsAutoThemeEnabled(enabled) {
  try {
    localStorage.setItem('musicly_auto_theme_enabled', String(enabled));
  } catch (e) {}
}
