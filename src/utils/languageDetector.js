/**
 * Intelligent Language Detector for Musicly
 * Automatically detects song language from Title, Artist, and Filename / YouTube metadata:
 * - Bengali (বাংলা)
 * - Hindi (हिन्दी)
 * - English
 */

// 1. Direct Unicode Script Detection
const BENGALI_SCRIPT_REGEX = /[\u0980-\u09FF]/;
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;
const GURMUKHI_SCRIPT_REGEX = /[\u0A00-\u0A7F]/;
const ARABIC_URDU_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// YouTube & Metadata Noise words to strip before linguistic evaluation
const METADATA_NOISE_REGEX = /\b(official|music|video|audio|mv|hd|4k|uhd|hq|lyric|lyrics|lyrical|visualizer|full song|full video|extended|remastered|remaster|version|album|original|soundtrack|ost|slowed|reverb|reverbed|bass boosted|8d audio|3d audio|lofi|lo-fi|remix|mix|mashup|cover|acoustic cover|unplugged|reprised|live|session|performance|raw|acoustic|teaser|trailer|clip|shorts?|edit|deluxe|t-series|tseries|zee music|sony music|speed records|yrf|tips official|saregama|svf|times music|coke studio|feat|ft|prod by|produced by|directed by|composer|singer|full|track|song|record|records)\b/gi;

// Prominent Bengali artists & bands
const BENGALI_ARTISTS = [
  'anupam roy', 'anupam', 'hemanta mukherjee', 'hemanta', 'sandhya mukherjee', 'sandhya',
  'rupankar bagchi', 'rupankar', 'nachiketa chakraborty', 'nachiketa', 'somlata acharyya', 
  'somlata', 'chandrabindoo', 'fossils', 'rupam islam', 'cactus', 'shironamhin', 
  'mohiner ghoraguli', 'mohin', 'james', 'nagar baul', 'ayub bachchu', 'lrb', 'miles', 
  'warfaze', 'tahsan', 'habib wahid', 'arnob', 'srikanto acharya', 'lopamudra mitra', 
  'lopamudra', 'swagatalakshmi', 'rezwana choudhury', 'iman chakraborty', 'raghab chatterjee', 
  'subhamita', 'kabir suman', 'salil chowdhury', 'satyaki banerjee', 'bhoomi', 'monali thakur'
];

// Prominent Hindi / Bollywood / Classical / Hindi Pop / Indian Indie artists
const HINDI_ARTISTS = [
  'arijit singh', 'arijit', 'neha kakkar', 'jubin nautiyal', 'jubin', 'darshan raval', 
  'atif aslam', 'atif', 'rahat fateh ali khan', 'rahat fateh', 'pritam', 'sonu nigam', 
  'shreya ghoshal', 'lata mangeshkar', 'kishore kumar', 'mohammed rafi', 'mohd rafi', 
  'mukesh', 'alka yagnik', 'kumar sanu', 'udit narayan', 'armaan malik', 'anuv jain', 
  'prateek kuhad', 'zaeden', 'jagjit singh', 'pankaj udhas', 'ghulam ali', 'mehdi hassan', 
  'nusrat fateh ali khan', 'kk', 'kay kay', 'shaan', 'papon', 'mohit chauhan', 'lucky ali', 
  'adnan sami', 'himesh reshammiya', 'vishal dadlani', 'shekhar ravjiani', 'vishal-shekhar', 
  'shankar ehsaan loy', 'shankar mahadevan', 'sunidhi chauhan', 'amit trivedi', 'sachin-jigar', 
  'mithoon', 'rochak kohli', 'jasleen royal', 'b praak', 'b-praak', 'ammy virk', 'jassie gill', 
  'aditya rikhari', 'vilen', 'dream note', 'the local train', 'twin strings', 'taba chake', 
  'osho jain', 'raghav meattle', 'sanam', 'falak shabir', 'anuradha paudwal', 'sadhana sargam', 
  'kavita krishnamurthy', 'amit kumar', 'suzonn', 'mitraz', 'chaar diwaari', 'the yellow diary', 
  'yellow diary', 'aditya a', 'ujwal', 'abdul hannan', 'hasan raheem', 'ali sethi', 'bayaan', 
  'kaavish', 'kavish', 'ronit vinta', 'shantanu pandey', 'ankur tewari', 'alif', 'faheem abdullah', 
  'bipul chettri', 'pawandeep rajan', 'arunita kanjilal', 'salman ali', 'kshitij tarey', 'kushagra',
  'badshah', 'yo yo honey singh', 'honey singh', 'ap dhillon', 'shubh', 'king', 'divine', 
  'raftaar', 'kr$na', 'krsna', 'seedhe maut', 'emiway bantai', 'emiway', 'mc stan', 'stan', 
  'hard kaur', 'ikka', 'lil golu', 'mika singh', 'guru randhawa', 'harrdy sandhu', 'sukh-e', 
  'the doorbeen', 'dino james', 'paradox', 'fotty seven', 'bali', 'mc square', 'gd 47', 
  'srushti tawade', 'karun', 'yungsta', 'chani nattan', 'sharn'
];

// Prominent English / Western artists
const ENGLISH_ARTISTS = [
  'coldplay', 'ed sheeran', 'taylor swift', 'the weeknd', 'billie eilish', 'post malone', 
  'dua lipa', 'bruno mars', 'adele', 'justin bieber', 'maroon 5', 'imagine dragons', 
  'queen', 'the beatles', 'beatles', 'michael jackson', 'billy joel', 'oasis', 'radiohead', 
  'arctic monkeys', 'fleetwood mac', 'pink floyd', 'led zeppelin', 'nirvana', 'linkin park', 
  'eminem', 'drake', 'kendrick lamar', 'sza', 'olivia rodrigo', 'sabrina carpenter', 
  'chappell roan', 'charli xcx', 'harry styles', 'shawn mendes', 'charlie puth', 
  'camila cabello', 'ariana grande', 'selena gomez', 'rihanna', 'beyonce', 'katy perry', 
  'lady gaga', 'sia', 'sam smith', 'lewis capaldi', 'lana del rey', 'lorde', 'phoebe bridgers', 
  'clairo', 'mac demarco', 'boy pablo', 'rex orange county', 'bon iver', 'the lumineers', 
  'vance joy', 'hozier', 'cigarettes after sex', 'cavetown', 'lauv', 'troye sivan', 
  'conan gray', 'alec benjamin', 'jeremy zucker', 'joji', 'rich brian', 'steve lacy', 
  'dominic fike', 'frank ocean', 'daniel caesar', 'khalid', 'the neighbourhood', 
  'glass animals', 'bastille', 'one direction', 'zayn', 'twenty one pilots', 
  'green day', 'red hot chili peppers', 'foo fighters', 'u2', 'bon jovi', 'david bowie', 
  'elton john', 'bob dylan', 'neil young', 'john lennon', 'simon and garfunkel', 
  'eric clapton', 'lynyrd skynyrd', 'don mclean', 'avicii', 'alan walker', 'marshmello',
  'chainsmokers', 'the chainsmokers', 'calvin harris', 'david guetta', 'kygo'
];

// Distinctive Bengali transliterated vocabulary
const BENGALI_KEYWORDS = [
  'rabindra', 'sangeet', 'tagore', 'bengali', 'bangla', 'bangladesh', 'kolkata', 'calcutta',
  'tumi', 'tomar', 'tomake', 'amar', 'amake', 'amader', 'ami', 'tui', 'bhalobashi', 'bhalobasa', 
  'valobasa', 'valobasi', 'bhalobashar', 'bristi', 'brishti', 'ghat', 'majhe', 'tobo', 
  'ekla', 'cholo', 'bondhu', 'bondhure', 'kotha', 'kothay', 'gaan', 'gan', 'moner', 
  'shona', 'priyo', 'bheja', 'shondha', 'akashe', 'megh', 'megher', 'poth', 'hridoy', 
  'chena', 'ojana', 'khub', 'onek', 'golpo', 'chokh', 'chokhe', 'mukhe', 'mukh', 'alo', 
  'andhar', 'ondhokar', 'keno', 'shei', 'sei', 'hobe', 'chilo', 'ache', 'nei', 'shob', 
  'sob', 'bhalo', 'pagol', 'deho', 'pakhi', 'nodi', 'dheu', 'maya', 'mayabi', 'sohor', 
  'shohor', 'dujon', 'dujone', 'ekta', 'shunno', 'prothom', 'shesh', 'baul', 'bhatiyali', 
  'khola', 'janala', 'bikel', 'bhor', 'sokal', 'shokal', 'pran', 'jibon', 'songsar', 
  'preme', 'chuye', 'sparsho', 'monmajhi', 'hasimukh', 'hashimukh', 'sedin', 'biday', 
  'bhalobaashi', 'obelay', 'dhaka'
];

// Distinctive Hindi / Urdu transliterated vocabulary (avoiding ambiguous common English words)
const HINDI_KEYWORDS = [
  'dil', 'pyaar', 'pyar', 'tum', 'tera', 'teri', 'hum', 'humko', 'meri', 'mere', 'mera', 
  'ishq', 'mohabbat', 'zindagi', 'saath', 'deewana', 'tere', 'hona', 'raha', 'rahi', 'rahe', 
  'aaj', 'dhadkan', 'aankhon', 'aankhein', 'khuda', 'tujhe', 'mujhe', 'apna', 'apni', 'apne', 
  'yaad', 'yaadein', 'baarish', 'sanam', 'chale', 'aao', 'jiyo', 'chura', 'sukoon', 'baatein', 
  'baat', 'khwabon', 'khwab', 'rooh', 'musafir', 'safarnama', 'jaana', 'bekhayali', 'shayari', 
  'aashiqui', 'kahani', 'hawayein', 'duniya', 'raataan', 'kesariya', 'shayad', 'qaafirana', 
  'mann', 'kehne', 'laga', 'humsafar', 'humnava', 'saajna', 'yaari', 'kasoor', 'choo', 
  'aaoge', 'kabhi', 'alvida', 'aadat', 'jeena', 'chahein', 'chahne', 'thodi', 'jagah', 
  'mastani', 'deewani', 'jawaani', 'bewafa', 'pachtaoge', 'channa', 'mereya', 'bulleya', 
  'zaalima', 'ranjha', 'besharam', 'rang', 'jhoome', 'pathaan', 'jawan', 'dunki', 'chaleya', 
  'satranga', 'kamleya', 'heeriye', 'baarishon', 'baarishein', 'aasman', 'mishri', 'faasle', 
  'samjho', 'dhunde', 'iraaday', 'bikhra', 'masakali', 'rehna', 'iktara', 'labon', 'beete', 
  'lamhein', 'sach', 'mitwa', 'suraj', 'maddham', 'chudiyan', 'chaiyya', 'jiya', 'satrangi', 
  'nazneen', 'suhana', 'safar', 'mausam', 'chand', 'sitare', 'roshni', 'parwana', 'shama', 
  'mehfil', 'dard', 'tanhai', 'intezaar', 'khamoshi', 'awaz', 'sargam', 'geet', 'nagme', 
  'afsaana', 'fitoor', 'junoon', 'ibadat', 'rabba', 'duaa', 'marjaavaan', 'dhun', 'kudi', 
  'munda', 'sohne', 'sohna', 'nakhre', 'ankhiyan', 'tere bina', 'tum hi', 'kuch kuch', 
  'tumhare', 'hamare', 'waqt', 'kabira', 'subhanallah', 'matargashti', 'namo namo', 'ghungroo', 
  'besharam', 'lutt putt', 'bedardeya', 'filhall', 'qismat', 'jannat', 'dholna', 'shona',
  'tu', 'jo', 'paas', 'tu jo paas', 'tu jo', 'paas aao', 'dekh', 'dekha', 'dekho', 'sun', 
  'suno', 'sunona', 'bol', 'bolo', 'jaane', 'jaan', 'meri jaan', 'jaaneman', 'khudaya', 
  'rab', 'piya', 'o re piya', 'saiyan', 'saiyaan', 'naino', 'naina', 'akhiyan', 'subah', 
  'shaam', 'raat', 'chaand', 'sitara', 'aashiq', 'nazar', 'nazrein', 'door', 'dooriyaan', 
  'dooriyan', 'tasveer', 'bhula', 'bhulado', 'sapna', 'sapne', 'neend', 'chain', 'bepanah', 
  'saans', 'saansein', 'badal', 'zameen', 'falak'
];

// True English language title and lyrical keywords (avoiding generic metadata words)
const TRUE_ENGLISH_KEYWORDS = [
  'the', 'you', 'me', 'we', 'they', 'my', 'your', 'our', 'his', 'her', 'with', 'for', 'from', 
  'and', 'or', 'in', 'on', 'at', 'to', 'by', 'about', 'into', 'through', 'after', 'over', 
  'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 
  'what', 'where', 'when', 'why', 'who', 'how', 'which', 'this', 'that', 'these', 'those', 
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 
  'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'yellow', 'coldplay', 
  'scientist', 'someone', 'rolling', 'deep', 'blinding', 'lights', 'starboy', 'perfect', 
  'photograph', 'summer', 'winter', 'spring', 'autumn', 'wonderwall', 'yesterday', 
  'bohemian', 'rhapsody', 'champion', 'champions', 'hotel', 'california', 'sweet', 
  'child', 'mine', 'stairway', 'heaven', 'knockin', 'door', 'smells', 'spirit', 
  'billie', 'jean', 'thriller', 'piano', 'man', 'vienna', 'uptown', 'girl', 'country', 
  'roads', 'take', 'home', 'radioactive', 'believer', 'demons', 'thunder', 'memories', 
  'sugar', 'levitating', 'sunflower', 'rockstar', 'lovely', 'ocean', 'eyes', 'free', 
  'bird', 'pie', 'code', 'coffee', 'midnight', 'dont', 'cant', 'wont', 'aint'
];

/**
 * Detect language based on song title, artist, and optional metadata context.
 * Returns: 'Bengali' | 'Hindi' | 'English'
 */
export function detectSongLanguage(title = '', artist = '', extraContext = '') {
  const rawCombined = `${title} ${artist} ${extraContext}`.trim();
  if (!rawCombined) return 'English';

  // 1. Script checks (Direct Unicode detection - 100% confidence)
  if (BENGALI_SCRIPT_REGEX.test(rawCombined)) {
    return 'Bengali';
  }
  if (DEVANAGARI_SCRIPT_REGEX.test(rawCombined)) {
    return 'Hindi';
  }
  if (GURMUKHI_SCRIPT_REGEX.test(rawCombined)) {
    return 'Hindi';
  }
  if (ARABIC_URDU_SCRIPT_REGEX.test(rawCombined)) {
    return 'Hindi';
  }

  // 2. Explicit Language Tags in text
  const cleanForTags = rawCombined.toLowerCase();
  if (/\b(bengali|bangla|rabindrasangeet|rabindra sangeet)\b/i.test(cleanForTags)) {
    return 'Bengali';
  }
  if (/\b(hindi song|bollywood song|hindi lyrical|hindi audio)\b/i.test(cleanForTags)) {
    return 'Hindi';
  }

  // 3. Artist Matching (Strong confidence)
  const artistLower = (artist || '').toLowerCase().trim();
  const rawCombinedLower = cleanForTags;

  // Check Bengali Artists
  for (const bArt of BENGALI_ARTISTS) {
    if (artistLower.includes(bArt) || rawCombinedLower.includes(bArt)) {
      return 'Bengali';
    }
  }

  // Check English Artists
  for (const eArt of ENGLISH_ARTISTS) {
    if (artistLower.includes(eArt) || rawCombinedLower.includes(eArt)) {
      return 'English';
    }
  }

  // Check Hindi Artists
  for (const hArt of HINDI_ARTISTS) {
    if (artistLower.includes(hArt) || rawCombinedLower.includes(hArt)) {
      return 'Hindi';
    }
  }

  // 4. Strip YouTube & file noise before vocabulary scoring
  const cleanTitle = (title || '').replace(METADATA_NOISE_REGEX, ' ');
  const cleanCombined = `${cleanTitle} ${artist}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleanCombined.split(/\s+/).filter(Boolean);

  // Scoring
  let bengaliScore = 0;
  let hindiScore = 0;
  let englishScore = 0;

  for (const w of words) {
    if (BENGALI_KEYWORDS.includes(w)) bengaliScore += 2;
    if (HINDI_KEYWORDS.includes(w)) hindiScore += 2;
    if (TRUE_ENGLISH_KEYWORDS.includes(w)) englishScore += 1.5;
  }

  // Multi-word phrase matches
  for (const k of BENGALI_KEYWORDS) {
    if (k.includes(' ') && cleanCombined.includes(k)) bengaliScore += 3;
  }
  for (const k of HINDI_KEYWORDS) {
    if (k.includes(' ') && cleanCombined.includes(k)) hindiScore += 3;
  }

  // Bengali evaluation
  if (bengaliScore > 0 && bengaliScore >= hindiScore && bengaliScore >= englishScore) {
    return 'Bengali';
  }

  // Hindi vs English
  if (hindiScore > 0 && hindiScore >= englishScore) {
    return 'Hindi';
  }

  return 'English';
}

const SECTION_KEYWORDS = {
  'Retro': [
    'retro', '80s', '70s', '60s', '90s', 'vintage', 'classic', 'oldies', 'nostalgia', 'nostalgic',
    'cassette', 'vinyl', 'disco', 'city pop', 'funk', 'groove', 'r.d. burman', 'rd burman', 
    'sd burman', 'kishore kumar', 'kishore', 'mohd rafi', 'mohammed rafi', 'rafi', 'lata mangeshkar', 'lata', 'mukesh', 
    'asha bhosle', 'asha', 'bappi lahiri', 'bappi', 'queen', 'beatles', 'the beatles', 'abba', 
    'elvis', 'michael jackson', 'madonna', 'synth-pop', 'classic rock', 'golden era', 
    'purane gaane', 'purane', 'purana', 'evergreen', 'ghazal', 'jagjit singh', 'pankaj udhas',
    'kumar sanu', 'alka yagnik', 'udit narayan', 'anuradha paudwal', 'old bollywood', 'retro vibes'
  ],
  'Indie': [
    'indie', 'acoustic', 'unplugged', 'guitar', 'folk', 'singer-songwriter', 'singer', 'songwriter',
    'indie rock', 'indie pop', 'indie folk', 'alternative', 'alt rock', 'romantic', 'love', 'ballad',
    'mann', 'kehne', 'laga', 'dil', 'ishq', 'pyar', 'pyaar', 'mohabbat', 'humsafar', 'humnava', 'tere',
    'meri', 'deewana', 'saajna', 'khuda', 'yaari', 'coke studio', 'session', 'unplug', 'cover', 'reprised',
    't-series', 'tseries', 'zee music', 'sony music', 'speed records', 'arijit singh', 'arijit', 
    'atif aslam', 'atif', 'falak shabir', 'falak', 'shreya ghoshal', 'jubin nautiyal', 'jubin', 
    'darshan raval', 'darshan', 'armaan malik', 'armaan', 'prateek kuhad', 'anuv jain', 'zaeden', 
    'when chai met toast', 'local train', 'the local train', 'osho jain', 'jasleen royal', 
    'lucky ali', 'dream note', 'lifafa', 'twin strings', 'taba chake', 'sanam', 'raghav meattle', 
    'mohit chauhan', 'papon', 'kk', 'shaan', 'ayushmann', 'rochak kohli', 'mithoon', 'pritam',
    'suzonn', 'tu jo paas', 'mitraz', 'chaar diwaari', 'the yellow diary', 'yellow diary', 
    'abdul hannan', 'hasan raheem', 'ali sethi', 'bayaan', 'kaavish', 'kavish', 'choo lo', 
    'aaoge tum kabhi', 'kasoor', 'baarishein', 'mishri', 'faasle', 'alvida', 'gul', 'cold/mess', 'waqt ki baatein',
    'coldplay', 'radiohead', 'oasis', 'arctic monkeys', 'the 1975', 'lorde', 'lana del rey', 
    'phoebe bridgers', 'clairo', 'mac demarco', 'boy pablo', 'rex orange county', 'bon iver', 
    'lumineers', 'vance joy', 'hozier', 'cigarettes after sex', 'cavetown', 'campfire', 'charlie puth', 'lauv'
  ],
  'Synthwave': [
    'synthwave', 'synth', 'retrowave', 'cyberpunk', 'neon', 'outrun', 'vaporwave', 
    'darksynth', 'future funk', 'electro', 'electronic', 'edm', 'techno', 'synthpop', 
    'kavinsky', 'the midnight', 'carpenter brut', 'gunship', 'timecop1983', 'fm-84', 
    'daft punk', 'kraftwerk', 'night drive', 'highway drive', 'arcade', 'future bass'
  ],
  'Peace': [
    'peace', 'peaceful', 'meditation', 'meditate', 'healing', 'zen', 'oasis', '432hz', 
    '528hz', 'frequency', 'solfeggio', 'bansuri', 'flute', 'sitar', 'tabla', 'classical', 
    'spa', 'yoga', 'harmony', 'serene', 'serenity', 'tranquil', 'soul peace', 'mantra', 
    'chants', 'bhajan', 'spiritual', 'sufi', 'inner peace', 'chakra', 'stress relief', 'temple', 'devotional'
  ],
  'Chill/Sleep': [
    'deep sleep', 'sleep music', 'sleeping', 'bedtime', 'insomnia', 'fall asleep', 'slumber', 
    'sleep rain', 'ambient sleep', 'lullaby', 'white noise', 'delta waves', 'soothing sleep', 
    'relaxing sleep', 'sleep sound', 'night rain', 'sleep aid', 'asmr', 'dream sleep'
  ],
  'Lo-Fi': [
    'lofi', 'lo-fi', 'lo fi', 'chillhop', 'jazzhop', 'boom bap', 'lofi girl', 'chilledcow', 
    'lofi hip hop', 'lofi beats', 'lofi remix', 'lofi study', 'sleepy fish', 'potsu', 
    'jinsang', 'kupla', 'idealism', 'slowed', 'reverb', 'slowed reverb', 'reverbed', 
    'coffee beats', 'chill beats', 'bedroom pop', 'aesthetic'
  ]
};

/**
 * Automatically detect matching section(s) from song title and artist.
 * Returns array of section names e.g. ['Indie'] or ['Lo-Fi'].
 * Always guarantees at least one well-matched section is selected automatically.
 */
export function detectSongSections(title = '', artist = '', currentGenre = 'All') {
  const combined = ` ${title} ${artist} `.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  if (!combined.trim()) {
    return (currentGenre && currentGenre !== 'All') ? [currentGenre] : ['Lo-Fi'];
  }

  const scores = {};
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    scores[section] = 0;
    for (const kw of keywords) {
      if (combined.includes(` ${kw} `) || combined.includes(kw)) {
        scores[section] += (kw.length > 5 ? 3 : 2);
      }
    }
  }

  let maxScore = 0;
  let topSection = null;
  for (const [section, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topSection = section;
    }
  }

  if (maxScore > 0 && topSection) {
    return [topSection];
  }

  // Smart contextual fallback based on language:
  // Indian pop/melodic vocal tracks with no specific tags best fit the 'Indie' section
  const lang = detectSongLanguage(title, artist);
  if (lang === 'Hindi' || lang === 'Bengali') {
    return ['Indie'];
  }

  // If in a specific genre category other than 'All', default to it
  if (currentGenre && currentGenre !== 'All' && ['Retro', 'Indie', 'Lo-Fi', 'Synthwave', 'Peace', 'Chill/Sleep'].includes(currentGenre)) {
    return [currentGenre];
  }

  // Universal cozy fallback
  return ['Lo-Fi'];
}
