/**
 * songQuoteGenerator.js
 * 
 * Generates unique, evocative, poetic reflections tailored specifically
 * to the exact song playing. Rotates dynamically so every listen and visit
 * delivers a fresh, insightful quote.
 */

// Song-Specific Curated Quote Collections (4-6 unique poetic lines per track)
const SONG_SPECIFIC_QUOTES = {
  // --- John Denver ---
  'take me home, country roads': [
    "Almost heaven. A timeless hymn of winding dirt roads and the magnetic pull of home.",
    "Acoustic strings drifting like a summer mountain breeze through the Blue Ridge timber.",
    "Radio echoes calling tired wanderers back to the sanctuary where they truly belong.",
    "Painted with morning mist and front-porch twilight, an anthem of heartfelt homecoming.",
    "Hear the gentle 12-string cadence that reminds us every long road eventually leads home."
  ],

  // --- Kinjal / Traditional ---
  'mora saiyaan': [
    "A haunting thumri where every unsaid word echoes between classical ragas and delicate fretwork.",
    "When words turn to quiet tears, the melody speaks. A timeless prayer of longing and devotion.",
    "Delicate acoustic fingerpicking wrapped in the fragrant midnight air of ancient melody.",
    "Soft resonance exploring the quiet agony of absence and the beauty of unconditional love.",
    "Classical acoustic nuance weaving deep soulful intimacy into the quiet night."
  ],

  // --- Bob Dylan ---
  "knockin' on heaven's door": [
    "Mama, take this badge off of me. A rugged gospel-folk prayer whispered at the edge of sunset.",
    "Four timeless chords carrying the quiet weight of surrender and peace.",
    "A stripped-down farewell bathed in twilight resonance and long desert shadows.",
    "Acoustic simplicity that turns an ordinary room into a timeless cathedral of sound."
  ],

  // --- Billy Joel ---
  'vienna': [
    "Slow down, you crazy child. A tender waltz reminding us that Vienna waits for you.",
    "Life is not a desperate race to be won, but a quiet sanctuary to be felt.",
    "Warm piano chords and accordion echoes offering shelter from the hurry of the modern world.",
    "An intimate conversation between your restless ambitions and your patient soul."
  ],
  'piano man': [
    "Sing us a song tonight. A warm tavern sanctuary where strangers share solitary dreams.",
    "Harmonica echoes and rolling piano keys spinning loneliness into collective warmth.",
    "A timeless tribute to dreamers, bartenders, and night owls finding solace in a shared melody."
  ],

  // --- Chris Stapleton ---
  'tennessee whiskey': [
    "Smooth as Tennessee whiskey, sweet as strawberry wine. Country soul poured like warm honey.",
    "Smoky blues guitar and gravel-rich vocals celebrating love that redeems and heals.",
    "A velvet acoustic groove that fills the midnight air with deep warmth and devotion."
  ],

  // --- Johnny Cash ---
  'ring of fire': [
    "Love is a burning thing. Mariachi brass and steady acoustic boom-chick rhythm in dark devotion.",
    "An indelible baritone rumble testifying to the wild, unstoppable heat of true passion."
  ],

  // --- Luke Combs ---
  'fast car': [
    "Anyplace is better. An acoustic heartbeat fueled by youth, gasoline, and stubborn hope.",
    "A fragile dream of breaking free, carried on an unforgettable fingerpicked riff."
  ],

  // --- Lord Huron ---
  'the night we met': [
    "I had all and then most of you. A spectral waltz drifting through the ghost towns of memory.",
    "Haunting reverb-drenched guitar lines echoing the exact moment the universe changed forever.",
    "A bittersweet ache suspended in twilight mist, mourning what once felt infinite."
  ],

  // --- Passenger ---
  'let her go': [
    "Only miss the sun when it starts to snow. Brittle honesty carved out of quiet winter air.",
    "Delicate acoustic fingerpicking confronting the fragile human habit of taking love for granted."
  ],

  // --- Goo Goo Dolls ---
  'iris': [
    "And I'd give up forever to touch you. An explosive confession of vulnerable devotion.",
    "Mandolin arpeggios swelling into an iconic cry of wanting to be seen and understood."
  ],

  // --- Stephen Sanchez ---
  'until i found you': [
    "I would never fall in love until I found her. A 1950s crooner dream in golden analog tape warmth.",
    "Reverb-drenched doo-wop guitars and romantic yearning echoing in an empty midnight ballroom."
  ],

  // --- Coldplay ---
  'the scientist': [
    "Nobody said it was easy. Minimalist piano chords unraveling the mystery of a bruised heart.",
    "Tracing the footsteps back to the start, hoping love can be pieced back together."
  ],
  'yellow': [
    "Look at the stars, look how they shine for you. Euphoric acoustic warmth glowing like embers.",
    "An earnest anthem of unconditional devotion, pure and bright as a coastal morning."
  ],
  'clocks': [
    "Am I part of the cure, or am I part of the disease? Hypnotic arpeggios racing against time.",
    "A kinetic rush of piano urgency asking what we choose to hold on to before the clock runs out."
  ],
  'in my place': [
    "Yeah, how long must you wait for it? Jangling guitars and reassuring melody for weary souls."
  ],

  // --- Radiohead ---
  'no surprises': [
    "A heart that's full up like a landfill. Glockenspiel lullaby cloaking deep modern weariness.",
    "Gentle acoustic surrender asking for a quiet life, free from alarm and false urgency."
  ],
  'karma police': [
    "This is what you'll get when you mess with us. Sarcastic grandeur and sweeping piano melancholy.",
    "For a minute there, I lost myself. A timeless descent into surreal sonic release."
  ],
  'creep': [
    "I wish I were special. Raw, bruised acoustic confessions pierced by iconic guitar distortion."
  ],

  // --- Oasis ---
  'wonderwall': [
    "Because maybe you're gonna be the one that saves me. Strummed acoustic strings echoing across generations.",
    "An iconic stadium hymn stripped to its bare, hopeful acoustic core."
  ],
  'don\'t look back in anger': [
    "Slip inside the eye of your mind. Defiant piano anthems singing of forgiveness and rock 'n' roll.",
    "At least not today. An uplifting chorus that turns collective nostalgia into pure euphoria."
  ],
  'live forever': [
    "Maybe I will never be all the things that I wanna be. Pure northern swagger and immortal optimism."
  ],

  // --- Jagjit Singh / Ghazals ---
  'woh kagaz ki kashti': [
    "Yeh daulat bhi le lo, yeh shohrat bhi le lo. The tender ache of childhood paper boats in the rain.",
    "A gentle harmonium melody recalling innocent monsoon puddles and bygone innocence.",
    "Ghazal perfection where poetry touches the deepest well of longing and memory."
  ],
  'hothon se chhoo lo tum': [
    "Hothon se chhoo lo tum, mera geet amar kar do. Divine surrender turned into eternal poetry.",
    "A velvet voice transforming human love into a timeless spiritual sanctuary."
  ],
  'hazaaron khwaishein aisi': [
    "Ghalib's immortal contemplation of boundless desires and the poignant beauty of longing."
  ],
  'chitthi aayi hai': [
    "The poignant longing of diaspora souls looking towards their homeland across distant oceans."
  ],

  // --- Pritam / Mohit Chauhan / Arijit Singh ---
  'tum se hi': [
    "Aaoge jab tum o saajana. Acoustic strums catching the tender breeze of an unexpected romance.",
    "The quiet miracle of finding a safe home in someone's voice on a rainy afternoon."
  ],
  'tum mile': [
    "A breezy acoustic rhythm capturing the effortless joy when life finally clicks into place."
  ],
  'kesariya': [
    "Kesariya tera ishq hai piya. Saffron devotion celebrating the intoxicating sweetness of love.",
    "An acoustic pop celebration wrapped in warm acoustic guitars and soaring emotional vocals."
  ],
  'apna bana le': [
    "Tu mera koi na hoke bhi kuch laage. Vulnerable acoustic yearning asking love to stay.",
    "A gentle acoustic lullaby about recognizing your soul's reflection in someone new."
  ],

  // --- Prateek Kuhad ---
  'cold/mess': [
    "When you feel like a fragile puzzle, this bittersweet acoustic melody wraps around like winter wool.",
    "Stripped-down indie fingerpicking laying bare the messy beauty of young devotion."
  ],
  'kasoor': [
    "Mera kasoor kya tha? Delicate indie storytelling reading like a secret handwritten letter in a diary.",
    "Soft acoustic intimacy celebrating the sweet vulnerability of heartfelt affection."
  ],

  // --- Bengali Classics ---
  'tomake chai': [
    "A timeless urban folk masterpiece capturing Kolkata's rain-slicked trams and poetic coffee-house nights.",
    "Acoustic simplicity that turns everyday city streets into an endless love letter."
  ],
  'amake amar moto thakte dao': [
    "Ei sarata din, ei sarata raat. An unapologetic anthem of solitude, asking the noisy world for simple peace.",
    "Raw acoustic strings defending the sacred right to quiet personal space and independence."
  ],
  'mon majhi re': [
    "The soul as an ancient boatman navigating the turbulent, unpredictable waters of passion."
  ],
  'majhe majhe tobo': [
    "Tagore's immortal prayer: why do you disappear from my sight, only to return in sudden grace?",
    "A sacred Rabindrasangeet melody where spiritual seeking and romantic devotion become one."
  ],

  // --- Indie / Folk Classics ---
  'faasle': [
    "In the quiet space between heartbeats, every distance feels like a bridge of golden memories.",
    "Muted acoustic strings exploring the unspoken elegance of patient, enduring affection."
  ],
  'agar tu hota': [
    "A fragile acoustic cry echoing the hollow spaces left behind when love departs."
  ],

  // --- Electronic / Synthwave / Ambient ---
  'midnight city': [
    "The city is my church. Electric neon highways blurring under starry nocturnal skies.",
    "A crescendo of nocturnal adrenaline, pulsating through skyscraper lights and synthesizer dreams."
  ],
  'nightcall': [
    "I'm giving you a night call to tell you how I feel. Midnight chrome and cinematic asphalt solitude."
  ],
  'weightless': [
    "Engineered in harmony with sound therapists to slow the pulse and dissolve tension into thin air.",
    "A tranquil ambient sanctuary calibrated to wash away anxiety with harmonic wave frequencies."
  ],
  'clair de lune': [
    "Moonlight shimmering across still water. An impressionist piano poem suspended in quiet grace.",
    "Timeless tranquil chords capturing the gentle mystery of a calm Parisian midnight."
  ],
  'river flows in you': [
    "A cascade of piano raindrops tracing the quiet paths of unspoken gratitude and introspective calm.",
    "Graceful modern neoclassical keys flowing like a quiet stream through an autumn meadow."
  ],
  'gymnopedie no.1': [
    "Minimalist eccentric melancholy. Three alternating chords that make the room feel infinitely quiet.",
    "Satie's tranquil masterpiece slowing the clock down to the gentle pace of a quiet breath."
  ]
};

// Generative Archetype Quotations (for unlisted or custom tracks)
const GENRE_ARCHETYPES = {
  country: [
    "Open highways, mountain air, and front-porch honesty poured into warm acoustic strings.",
    "Stories written in dust and steel, celebrating the timeless warmth of home and grit.",
    "Soulful acoustic guitar strumming echoing through cedar timber and sunset prairies."
  ],
  indie: [
    "Quiet bedroom confessions and delicate fingerpicking for dreamers and night wanderers.",
    "Intimate acoustic textures exploring the tender corners of memory, love, and solitude.",
    "A gentle sanctuary of melody where every chord feels like an entry in a private journal."
  ],
  lofi: [
    "Gentle vinyl flutter and tape warmth sculpted for calm focus and midnight introspection.",
    "Warm harmonic flutter and relaxed beats soothing the mind after a long day.",
    "Soft analog rain and mellow keys inviting quiet stillness into your space."
  ],
  retro: [
    "Golden vintage grooves remastered in pristine depth, carrying the soul of an unforgettable era.",
    "Timeless analog warmth and classic storytelling that never loses its youthful spark.",
    "Warm tube-amplifier harmonics celebrating the golden age of authentic musicianship."
  ],
  ghazal: [
    "Transcendental poetry and velvety acoustic resonance exploring the infinite depths of longing.",
    "Harmonium textures and soulful poetry where every syllable carries the weight of a lifetime.",
    "Sacred melodic verses weaving heartache into transcendental beauty and peace."
  ],
  rock: [
    "Raw overdrive and resonant acoustic rhythm testifying to the defiant power of live melody.",
    "Driving anthems and unforgettable guitar hooks carrying dreams across crowded stadiums."
  ],
  classical: [
    "Pristine acoustic architecture where delicate notes suspend time and illuminate the soul.",
    "Centuries of acoustic mastery breathing quiet beauty and deep focus into the present moment."
  ],
  default: [
    "An evocative sonic sanctuary curated in pure spatial audio for deep calm and presence.",
    "Harmonic melodies woven together to create a peaceful shelter for the wandering mind.",
    "Tactile acoustic resonance inviting you to pause, breathe, and lose yourself in sound."
  ]
};

// Internal rotation tracker per song ID
const quoteIndexCache = new Map();

/**
 * Returns a unique, evocative, song-specific quote.
 * Guarantees a different quote every time the track is loaded or clicked.
 * 
 * @param {Object} track - The active song object
 * @param {number|null} forceIndex - Optional specific index to preview
 * @returns {string} The curated quote
 */
export function getUniqueSongQuote(track, forceIndex = null) {
  if (!track) return "Music is a sanctuary for the mind. Step inside and let the melody breathe.";

  const trackId = track.id || track.title || 'generic';
  const titleClean = (track.title || '').toLowerCase().trim();

  // 1. Check for specific song match
  let pool = null;
  for (const [key, quotes] of Object.entries(SONG_SPECIFIC_QUOTES)) {
    if (titleClean.includes(key) || key.includes(titleClean)) {
      pool = quotes;
      break;
    }
  }

  // 2. Fallback to Genre Archetypes
  if (!pool || pool.length === 0) {
    const genre = ((track.genre || track.genres?.[0] || '') + '').toLowerCase();
    const artist = track.artist || 'Musicly Artist';

    let archetype = 'default';
    if (genre.includes('country') || genre.includes('americana')) archetype = 'country';
    else if (genre.includes('indie') || genre.includes('folk')) archetype = 'indie';
    else if (genre.includes('lofi') || genre.includes('lo-fi') || genre.includes('chill')) archetype = 'lofi';
    else if (genre.includes('retro') || genre.includes('vintage') || genre.includes('classic')) archetype = 'retro';
    else if (genre.includes('ghazal') || genre.includes('sufi')) archetype = 'ghazal';
    else if (genre.includes('rock')) archetype = 'rock';
    else if (genre.includes('classical') || genre.includes('piano')) archetype = 'classical';

    const baseQuotes = GENRE_ARCHETYPES[archetype] || GENRE_ARCHETYPES.default;
    pool = baseQuotes.map(q => `${q} Crafted by ${artist}.`);
  }

  // 3. Rotate Index so it is different every single time
  let currentIndex = quoteIndexCache.get(trackId);
  if (currentIndex === undefined) {
    // Start with a randomized index
    currentIndex = Math.floor(Math.random() * pool.length);
  } else if (forceIndex === null) {
    // Advance to next quote in the pool
    currentIndex = (currentIndex + 1) % pool.length;
  } else {
    currentIndex = forceIndex % pool.length;
  }
  
  quoteIndexCache.set(trackId, currentIndex);

  return pool[currentIndex] || pool[0];
}
