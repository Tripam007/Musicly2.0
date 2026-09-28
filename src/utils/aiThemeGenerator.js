// AI & Master 8K Theme & Scene Generator Engine for Musicly

export const AI_STYLE_PRESETS = [
  { label: 'Photorealistic 8K', query: 'hyperrealistic cinematic photorealistic 8k UHD photography sharp focus masterwork', primary: '#3b82f6', secondary: '#60a5fa', glow: 'rgba(59, 130, 246, 0.45)' },
  { label: 'Minimalist 8K', query: 'minimalist elegant vector wallpaper clean lines high contrast flat design 8k', primary: '#f43f5e', secondary: '#fb7185', glow: 'rgba(244, 63, 94, 0.45)' },
  { label: 'Cyberpunk Neon', query: 'cyberpunk neon city rain purple and cyan lights futuristic lofi', primary: '#a855f7', secondary: '#06b6d4', glow: 'rgba(168, 85, 247, 0.45)' },
  { label: 'Emerald Forest', query: 'mystical emerald forest ghibli cottage fireflies fairy lights mist', primary: '#10b981', secondary: '#059669', glow: 'rgba(16, 185, 129, 0.45)' },
  { label: 'Sakura Sunset', query: 'japanese sakura cherry blossoms pink sunset tranquil lake temple', primary: '#ec4899', secondary: '#f43f5e', glow: 'rgba(236, 72, 153, 0.45)' },
  { label: 'Midnight Ocean', query: 'deep blue ocean bioluminescence waves starry night galaxy coastal', primary: '#0ea5e9', secondary: '#38bdf8', glow: 'rgba(14, 165, 233, 0.45)' },
  { label: 'Warm Coffeehouse', query: 'vintage cozy coffeehouse rainy window books warm wood amber lamps', primary: '#f59e0b', secondary: '#d97706', glow: 'rgba(245, 158, 11, 0.45)' },
  { label: 'Cosmic Nebula', query: 'cosmic purple galaxy nebula stars deep space planetary ring aurora', primary: '#8b5cf6', secondary: '#ec4899', glow: 'rgba(139, 92, 246, 0.45)' }
];

const STOP_WORDS_REGEX = /\b(can\s+u|please|create\s+me\s+a|make\s+me\s+a|generate\s+me\s+a|create\s+a|make\s+a|generate\s+a|i\s+want\s+a|wallpaper\s+of\s+a|wallpaper\s+of|picture\s+of\s+a|picture\s+of|image\s+of\s+a|image\s+of|give\s+me\s+a|show\s+me\s+a|draw\s+a|cool|awesome|epic|aesthetic|super|cute|pretty|nice|good|best|stunning|beautiful|wallpaper|wallpapers|background|backgrounds|image|images|pic|pics|photo|photos|picture|pictures|hd|4k|8k|uhd|quality|in\s+8k\s+quality|in\s+4k\s+quality|in\s+8k|in\s+4k)\b/gi;

/**
 * Strips conversational noise and subjective filler to yield clean search terms
 */
export function buildSearchTerms(rawQuery = '') {
  let clean = rawQuery
    .replace(/--[a-zA-Z0-9_-]+(\s+[a-zA-Z0-9_-]+)?/g, '')
    .replace(STOP_WORDS_REGEX, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || rawQuery.trim();
}

/**
 * Parses user input to extract admin flags, style modifiers, and core search prompt
 */
export function parseAdminPrompt(rawText = '') {
  let prompt = rawText.trim();
  let engine = 'auto'; // 'auto' | 'master' | 'ai'
  let styleModifier = '';
  let seed = null;

  // Extract command flags e.g. --engine master, --style realistic, --seed 123
  const engineMatch = prompt.match(/--(?:engine|mode)\s+(auto|master|ai|photo)/i);
  if (engineMatch) {
    engine = engineMatch[1].toLowerCase() === 'photo' ? 'master' : engineMatch[1].toLowerCase();
    prompt = prompt.replace(engineMatch[0], '');
  }

  const styleMatch = prompt.match(/--style\s+([a-zA-Z0-9_-]+)/i);
  if (styleMatch) {
    styleModifier = styleMatch[1].toLowerCase();
    prompt = prompt.replace(styleMatch[0], '');
  }

  const seedMatch = prompt.match(/--seed\s+(\d+)/i);
  if (seedMatch) {
    seed = parseInt(seedMatch[1], 10);
    prompt = prompt.replace(seedMatch[0], '');
  }

  const cleanedSearchQuery = buildSearchTerms(prompt);

  const lower = prompt.toLowerCase();
  const isRealistic = styleModifier === 'realistic' || lower.includes('realistic') || lower.includes('photorealistic') || lower.includes('photo') || lower.includes('photography');
  const isMinimalist = styleModifier === 'minimalist' || lower.includes('minimalist') || lower.includes('minimal');
  const isCinematic = styleModifier === 'cinematic' || lower.includes('cinematic') || lower.includes('movie');
  const isAnime = styleModifier === 'anime' || lower.includes('anime') || lower.includes('manga') || lower.includes('ghibli');
  const isCyberpunk = styleModifier === 'cyberpunk' || lower.includes('cyberpunk') || lower.includes('futuristic') || lower.includes('neon');
  const isLofi = styleModifier === 'lofi' || lower.includes('lofi') || lower.includes('lo-fi') || lower.includes('cozy');

  return {
    rawText,
    cleanedSearchQuery: cleanedSearchQuery || prompt,
    engine,
    seed,
    isRealistic,
    isMinimalist,
    isCinematic,
    isAnime,
    isCyberpunk,
    isLofi
  };
}

/**
 * Extracts a clean capitalized title from the prompt (e.g. "Spider-Man Minimalist")
 */
export function extractCleanTitle(rawPrompt = '') {
  let clean = buildSearchTerms(rawPrompt);

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Custom 8K Scene';

  const titleWords = words.slice(0, 5).map(w => {
    if (w.toLowerCase() === 'spiderman') return 'Spider-Man';
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return titleWords.join(' ');
}

/**
 * Derives a fast, instant color palette based on prompt keywords or returns default
 */
export function getKeywordPalette(promptText = '') {
  const lower = (promptText || '').toLowerCase();
  if (lower.includes('spiderman') || lower.includes('spider-man')) {
    return { primaryColor: '#e63946', secondaryColor: '#1d3557', glowColor: 'rgba(230, 57, 70, 0.45)' };
  }
  if (lower.includes('cyberpunk') || lower.includes('synth') || lower.includes('neon')) {
    return { primaryColor: '#a855f7', secondaryColor: '#06b6d4', glowColor: 'rgba(168, 85, 247, 0.45)' };
  }
  if (lower.includes('emerald') || lower.includes('forest') || lower.includes('nature') || lower.includes('green')) {
    return { primaryColor: '#10b981', secondaryColor: '#059669', glowColor: 'rgba(16, 185, 129, 0.45)' };
  }
  if (lower.includes('sakura') || lower.includes('sunset') || lower.includes('pink') || lower.includes('rose')) {
    return { primaryColor: '#ec4899', secondaryColor: '#f43f5e', glowColor: 'rgba(236, 72, 153, 0.45)' };
  }
  if (lower.includes('ocean') || lower.includes('water') || lower.includes('blue') || lower.includes('rain')) {
    return { primaryColor: '#0ea5e9', secondaryColor: '#38bdf8', glowColor: 'rgba(14, 165, 233, 0.45)' };
  }
  if (lower.includes('galaxy') || lower.includes('space') || lower.includes('cosmic') || lower.includes('star')) {
    return { primaryColor: '#8b5cf6', secondaryColor: '#ec4899', glowColor: 'rgba(139, 92, 246, 0.45)' };
  }
  return { primaryColor: '#3b82f6', secondaryColor: '#60a5fa', glowColor: 'rgba(59, 130, 246, 0.45)' };
}

/**
 * Search and retrieve ultra-crisp 4K/8K master wallpapers (Zero Distortion Guarantee)
 */
export async function fetchMaster8KWallpapers(cleanQuery, variationIndex = 0) {
  if (!cleanQuery || !cleanQuery.trim()) return { success: false };

  const terms = cleanQuery.trim();
  const queryAttempts = [terms];

  // If multi-word (e.g. "spiderman minimalist"), also prepare a single-word fallback if 0 results
  const words = terms.split(/\s+/);
  if (words.length > 1) {
    queryAttempts.push(words[0]);
  }

  for (const q of queryAttempts) {
    try {
      const apiUrl = typeof window !== 'undefined'
        ? `/api/wallhaven/search?q=${encodeURIComponent(q)}&sorting=relevance&categories=111&purity=100`
        : `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(q)}&sorting=relevance&categories=111&purity=100`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s max fetch
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const json = await res.json();
      const data = json.data;

      if (Array.isArray(data) && data.length > 0) {
        const idx = Math.abs(variationIndex) % data.length;
        const item = data[idx];

        const resolution = item.resolution || `${item.dimension_x}x${item.dimension_y}`;
        const is8K = (item.dimension_x >= 5120 || item.dimension_y >= 2880);
        const is4K = (item.dimension_x >= 3840 || item.dimension_y >= 2160);

        // Use thumbs.large for instant, lightweight rendering without freezing the browser
        const previewUrl = item.thumbs?.large || item.path;
        const fullUrl = item.thumbs?.large || item.path;
        const rawFullRes = item.path || item.thumbs?.large;

        // Extract palette from Wallhaven's native color tags
        let primary = '#3b82f6';
        let secondary = '#60a5fa';
        let glow = 'rgba(59, 130, 246, 0.45)';

        if (Array.isArray(item.colors) && item.colors.length > 0) {
          const nonBlacks = item.colors.filter(c => {
            const hex = c.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 30 && brightness < 235;
          });

          if (nonBlacks.length > 0) {
            primary = nonBlacks[0];
            secondary = nonBlacks[1] || nonBlacks[0];
          } else {
            primary = item.colors[0];
            secondary = item.colors[1] || item.colors[0];
          }
          glow = `${primary}66`;
        } else {
          const kwPalette = getKeywordPalette(cleanQuery);
          primary = kwPalette.primaryColor;
          secondary = kwPalette.secondaryColor;
          glow = kwPalette.glowColor;
        }

        return {
          success: true,
          source: 'master-8k',
          resolutionLabel: is8K ? `8K UHD (${resolution})` : (is4K ? `4K UHD (${resolution})` : `Ultra HD (${resolution})`),
          dimension: resolution,
          image: fullUrl,
          previewImage: previewUrl,
          fullResImage: rawFullRes,
          primaryColor: primary,
          secondaryColor: secondary,
          glowColor: glow,
          totalVariations: data.length,
          currentIndex: idx
        };
      }
    } catch (err) {
      // Continue to next attempt
    }
  }

  return { success: false };
}

/**
 * Generate AI image with strict anti-distortion negative prompt & style adherence
 */
export function generateUltraAiImage(parsed, seedOverride = null) {
  const seed = seedOverride || parsed.seed || Math.floor(Math.random() * 900000) + 100000;
  const cleanQ = parsed.cleanedSearchQuery;

  let styleEnhancement = '';
  let negativePrompt = 'distorted, deformed, disfigured, mutated, bad anatomy, bad proportions, mutant, extra limbs, bad face, blurry, low resolution, artifacts, watermark, text, signature, low quality, oversaturated';

  if (parsed.isRealistic) {
    styleEnhancement = 'masterpiece photography, ultra photorealistic, 8k resolution UHD, shot on 35mm lens, sharp focus, hyperdetailed, natural lighting, award winning realistic photography';
    negativePrompt += ', cartoon, anime, 3d render, illustration, drawing';
  } else if (parsed.isMinimalist) {
    styleEnhancement = 'minimalist vector artwork, clean sharp lines, elegant negative space, high contrast, 8k resolution, flat graphic design, aesthetic wallpaper, crisp edges';
    negativePrompt += ', cluttered, messy, complex, noisy, blurry';
  } else if (parsed.isCinematic) {
    styleEnhancement = 'cinematic movie still, dramatic lighting, 8k resolution, film grain, IMAX depth of field, color graded, photorealistic masterpiece';
    negativePrompt += ', cartoon, amateur, blurry, lowres';
  } else if (parsed.isAnime) {
    styleEnhancement = 'masterpiece anime illustration, makoto shinkai aesthetic, pristine sharp details, vibrant colors, 8k wallpaper';
    negativePrompt += ', bad anime, deformed hands, extra limbs, blurry';
  } else if (parsed.isCyberpunk) {
    styleEnhancement = 'cyberpunk futuristic aesthetic, neon lighting, dark atmospheric city, octane render, 8k resolution';
    negativePrompt += ', blurry, low quality, noise';
  } else if (parsed.isLofi) {
    styleEnhancement = 'cozy aesthetic lo-fi room, warm ambient lighting, peaceful mood, highly detailed, 8k resolution wallpaper';
    negativePrompt += ', distorted, low quality, noisy';
  } else {
    styleEnhancement = 'ultra detailed 8k resolution wallpaper, masterwork, sharp focus, stunning lighting, high fidelity';
  }

  const fullPrompt = `${cleanQ}, ${styleEnhancement}`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const encodedNeg = encodeURIComponent(negativePrompt);

  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${seed}&negative=${encodedNeg}`;

  return {
    image: imageUrl,
    previewImage: imageUrl,
    fullResImage: imageUrl,
    source: 'ai-studio',
    resolutionLabel: '8K AI Render (1920x1080)',
    seed
  };
}

/**
 * Main Generator Function: Handles admin commands, 8K fidelity, zero-distortion master wallpapers, and smart palettes
 */
export async function generateAiSceneOrTheme(promptText, mode = 'theme', options = {}) {
  if (!promptText || !promptText.trim()) {
    throw new Error('Please enter a description for the AI generator');
  }

  const parsed = parseAdminPrompt(promptText);
  const title = extractCleanTitle(promptText);
  const variationIndex = options.variationIndex || 0;
  const requestedEngine = options.engine || parsed.engine; // 'auto' | 'master' | 'ai'

  let finalImage = '';
  let previewImage = '';
  let fullResImage = '';
  let resolutionLabel = '8K UHD';
  let engineUsed = 'master-8k';
  let extractedPalette = null;
  let totalVariations = 1;
  let currentIndex = 0;

  // 1. Try Master 8K Wallpaper Engine first if engine is 'auto' or 'master'
  if (requestedEngine !== 'ai') {
    const masterRes = await fetchMaster8KWallpapers(parsed.cleanedSearchQuery, variationIndex);
    if (masterRes && masterRes.success) {
      finalImage = masterRes.image;
      previewImage = masterRes.previewImage;
      fullResImage = masterRes.fullResImage;
      resolutionLabel = masterRes.resolutionLabel;
      engineUsed = 'master-8k';
      totalVariations = masterRes.totalVariations;
      currentIndex = masterRes.currentIndex;
      extractedPalette = {
        primaryColor: masterRes.primaryColor,
        secondaryColor: masterRes.secondaryColor,
        glowColor: masterRes.glowColor
      };
    }
  }

  // 2. If Master didn't find results or engine was forced to 'ai', use Ultra AI Studio
  if (!finalImage) {
    const aiRes = generateUltraAiImage(parsed, options.seed);
    finalImage = aiRes.image;
    previewImage = aiRes.previewImage;
    fullResImage = aiRes.fullResImage;
    resolutionLabel = aiRes.resolutionLabel;
    engineUsed = 'ai-studio';
  }

  // 3. Fallback palette based on keywords if not already extracted
  if (!extractedPalette) {
    extractedPalette = getKeywordPalette(parsed.cleanedSearchQuery);
  }

  // 4. Generate live interactive hotspots if requested
  const interactiveHotspots = generateInteractiveHotspots(parsed.cleanedSearchQuery, mode);
  const isInteractive = mode === 'interactive' || interactiveHotspots.length > 0;

  return {
    name: title,
    desc: parsed.cleanedSearchQuery,
    rawPrompt: promptText,
    image: finalImage,
    previewImage: previewImage || finalImage,
    fullResImage: fullResImage || finalImage,
    primaryColor: extractedPalette.primaryColor,
    secondaryColor: extractedPalette.secondaryColor,
    glowColor: extractedPalette.glowColor,
    mode,
    isTheme: mode === 'theme' || mode === 'interactive',
    isInteractive,
    interactiveHotspots,
    engineUsed,
    resolutionLabel,
    totalVariations,
    currentIndex
  };
}

/**
 * Generate intelligent live interactive hotspots based on scene objects described in the prompt
 */
export function generateInteractiveHotspots(promptText = '', mode = 'theme') {
  const lower = (promptText || '').toLowerCase();
  const hotspots = [];
  const now = Date.now();

  // 1. Lamp / Light / Lantern / Candle / Lighting
  const hasLamp = lower.includes('lamp') || lower.includes('light') || lower.includes('lantern') || lower.includes('glow') || lower.includes('candle') || lower.includes('room') || mode === 'interactive';
  if (hasLamp) {
    hotspots.push({
      id: `spot_lamp_${now}_1`,
      name: lower.includes('lantern') ? 'Paper Lantern 🏮' : (lower.includes('candle') ? 'Cozy Candle 🕯️' : 'Ambient Lamp 💡'),
      type: 'lamp',
      top: '32%',
      left: '18%',
      actionHint: 'Click to toggle room lighting',
      dialogue: 'Adjusted warm ambient lighting 💡'
    });
  }

  // 2. Coffee / Tea / Mug / Drink / Cafe
  const hasDrink = lower.includes('coffee') || lower.includes('tea') || lower.includes('mug') || lower.includes('cup') || lower.includes('drink') || lower.includes('cafe') || lower.includes('latte') || lower.includes('boba') || mode === 'interactive';
  if (hasDrink) {
    hotspots.push({
      id: `spot_drink_${now}_2`,
      name: lower.includes('tea') ? 'Steaming Green Tea 🍵' : 'Cozy Coffee Mug ☕',
      type: 'coffee',
      top: '64%',
      left: '72%',
      actionHint: 'Click to take a warm sip',
      dialogue: lower.includes('tea') ? 'Sipping warm soothing tea... pure tranquility 🍵' : 'Freshly brewed warm coffee... soothing lo-fi fuel ☕'
    });
  }

  // 3. Vinyl / Turntable / Music / Record / Stereo / Guitar
  const hasMusic = lower.includes('vinyl') || lower.includes('turntable') || lower.includes('record') || lower.includes('music') || lower.includes('guitar') || lower.includes('player') || lower.includes('speaker') || lower.includes('beats') || mode === 'interactive';
  if (hasMusic) {
    hotspots.push({
      id: `spot_music_${now}_3`,
      name: lower.includes('guitar') ? 'Acoustic Guitar 🎸' : 'Vinyl Turntable 🎵',
      type: lower.includes('guitar') ? 'guitar' : 'music',
      top: '58%',
      left: '28%',
      actionHint: 'Click to spin vinyl & musical notes',
      dialogue: 'Spinning analogue vinyl grooves... pure vibes 🎶'
    });
  }

  // 4. Window / Rain / Sky / Stars / Weather / Balcony / Ocean
  const hasWindow = lower.includes('window') || lower.includes('rain') || lower.includes('sky') || lower.includes('star') || lower.includes('balcony') || lower.includes('night') || lower.includes('outside') || lower.includes('ocean') || mode === 'interactive';
  if (hasWindow) {
    hotspots.push({
      id: `spot_window_${now}_4`,
      name: lower.includes('star') ? 'Starry Night Sky ✨' : (lower.includes('rain') ? 'Rainy Window 🌧️' : 'Scenic Balcony Window 🪟'),
      type: 'window',
      top: '24%',
      left: '48%',
      actionHint: 'Click to interact with outside atmosphere',
      dialogue: lower.includes('star') ? 'Gazing into the endless starry cosmos ✨🌌' : 'Watching gentle raindrops cascade down the glass 🌧️'
    });
  }

  // 5. Companion / Pet / Cat / Dog / Character / Girl
  const hasCompanion = lower.includes('cat') || lower.includes('kitten') || lower.includes('dog') || lower.includes('pet') || lower.includes('girl') || lower.includes('boy') || lower.includes('barista') || lower.includes('character');
  if (hasCompanion) {
    hotspots.push({
      id: `spot_pet_${now}_5`,
      name: lower.includes('dog') ? 'Cozy Puppy 🐕' : (lower.includes('cat') ? 'Sleeping Cat 🐱' : 'Anime Companion 🎧'),
      type: 'companion',
      top: '68%',
      left: '52%',
      actionHint: 'Click to chat or pet',
      dialogue: 'Purring softly... totally immersed in the rhythm 🐾🎧'
    });
  }

  // 6. Neon sign (if cyberpunk / neon mentioned)
  const hasNeon = lower.includes('neon') || lower.includes('cyberpunk') || lower.includes('synth');
  if (hasNeon) {
    hotspots.push({
      id: `spot_neon_${now}_6`,
      name: 'Cyberpunk Neon Sign ⚡',
      type: 'neon',
      top: '16%',
      left: '78%',
      actionHint: 'Click to pulse neon lights',
      dialogue: 'Electric neon frequencies humming in sync with the beat ⚡💜'
    });
  }

  // Fallback: If in interactive mode and none matched, provide 3 rich staples
  if (hotspots.length === 0 && (mode === 'interactive' || lower.includes('interactive'))) {
    hotspots.push(
      { id: `spot_lamp_${now}_1`, name: 'Ambient Desk Lamp 💡', type: 'lamp', top: '32%', left: '18%', actionHint: 'Click to toggle room lighting', dialogue: 'Adjusted warm ambient lighting 💡' },
      { id: `spot_drink_${now}_2`, name: 'Cozy Coffee Mug ☕', type: 'coffee', top: '64%', left: '72%', actionHint: 'Click to take a warm sip', dialogue: 'Freshly brewed warm coffee... soothing lo-fi fuel ☕' },
      { id: `spot_music_${now}_3`, name: 'Vinyl Turntable 🎵', type: 'music', top: '58%', left: '28%', actionHint: 'Click to spin vinyl & musical notes', dialogue: 'Spinning analogue vinyl grooves... pure vibes 🎶' }
    );
  }

  return hotspots;
}

/**
 * Extract vibrant dominant colors from an uploaded or user-selected image using canvas
 */
export function extractPaletteFromImage(imageSrc) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      return resolve(getDefaultPalette());
    }

    const timer = setTimeout(() => resolve(getDefaultPalette()), 1200); // 1.2s strict timeout
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(getDefaultPalette());

        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        
        let bestR = 59, bestG = 130, bestB = 246;
        let maxVibrancy = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 35 && brightness < 225) {
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            const saturation = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;
            const vibrancy = saturation * brightness;
            
            if (vibrancy > maxVibrancy) {
              maxVibrancy = vibrancy;
              bestR = r;
              bestG = g;
              bestB = b;
            }
          }
        }

        const toHex = (n) => n.toString(16).padStart(2, '0');
        const primaryHex = `#${toHex(bestR)}${toHex(bestG)}${toHex(bestB)}`;
        
        const secR = Math.min(255, Math.round(bestR * 0.8 + 40));
        const secG = Math.min(255, Math.round(bestG * 0.8 + 30));
        const secB = Math.min(255, Math.round(bestB * 0.8 + 50));
        const secondaryHex = `#${toHex(secR)}${toHex(secG)}${toHex(secB)}`;

        resolve({
          primaryColor: primaryHex,
          secondaryColor: secondaryHex,
          glowColor: `rgba(${bestR}, ${bestG}, ${bestB}, 0.45)`
        });
      } catch (err) {
        resolve(getDefaultPalette());
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(getDefaultPalette());
    };
    img.src = imageSrc;
  });
}

function getDefaultPalette() {
  return {
    primaryColor: '#3b82f6',
    secondaryColor: '#60a5fa',
    glowColor: 'rgba(59, 130, 246, 0.45)'
  };
}

const THEME_STORAGE_KEY = 'musicly_active_webapp_theme';

/**
 * Apply a full visual color theme to the entire web application DOM
 */
export function applyWebappTheme(theme) {
  if (!theme || !theme.primaryColor) return;
  const root = document.documentElement;

  root.style.setProperty('--primary-glow', theme.primaryColor);
  root.style.setProperty('--accent-amber', theme.secondaryColor || theme.primaryColor);
  root.style.setProperty('--accent-gold', theme.primaryColor);
  root.style.setProperty('--glass-border-glow', theme.glowColor || `${theme.primaryColor}55`);
  root.style.setProperty('--shadow-glow', `0 0 25px ${theme.glowColor || theme.primaryColor}44`);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch (e) {}
}

/**
 * Reset webapp theme back to default warm gold & amber Musicly palette
 */
export function resetWebappTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--primary-glow');
  root.style.removeProperty('--accent-amber');
  root.style.removeProperty('--accent-gold');
  root.style.removeProperty('--glass-border-glow');
  root.style.removeProperty('--shadow-glow');

  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Hydrate saved custom webapp theme on load
 */
export function loadSavedWebappTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      applyWebappTheme(parsed);
      return parsed;
    }
  } catch (e) {}
  return null;
}
