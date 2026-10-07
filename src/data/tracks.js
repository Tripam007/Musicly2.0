export const GENRES = ['All', 'Retro', 'Indie', 'Lo-Fi', 'Ghazal', 'Synthwave', 'Peace', 'Chill/Sleep'];

export const isGhazalLanguage = (lang) => {
  if (!lang) return true;
  if (Array.isArray(lang)) {
    if (lang.length === 0) return true;
    return lang.some(l => String(l).trim().toLowerCase() === 'hindi');
  }
  const l = String(lang).trim().toLowerCase();
  return l === 'all' || l === 'hindi';
};

export const getAvailableGenres = (lang) => {
  if (isGhazalLanguage(lang)) {
    return GENRES;
  }
  return GENRES.filter(g => g.toLowerCase() !== 'ghazal');
};

export const GENRE_BACKDROPS = {
  'All': '/assets/images/cozy_bedroom.jpg',
  'Retro': '/assets/images/retro_scene.jpg',
  'Indie': 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=1920&auto=format&fit=crop&q=85',
  'Lo-Fi': '/assets/images/lofi_scene.jpg',
  'Ghazal': '/assets/images/ghazals_bg.png',
  'Synthwave': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=85',
  'Peace': '/assets/images/peace_scene.jpg',
  'Chill/Sleep': '/assets/images/chill_sleep_scene.jpg'
};

export const LANGUAGES = ['English', 'Hindi', 'Bengali'];

export const LANGUAGE_LABELS = {
  English: 'English',
  Hindi: 'हिन्दी',
  Bengali: 'বাংলা'
};

export const TRACKS = [
  // Iconic Master Classics
  {
    id: 'heavens-door-bob-dylan',
    title: "Knockin' On Heaven's Door",
    artist: 'Bob Dylan',
    genre: 'Retro',
    genres: ['Retro', 'Indie'],
    language: 'English',
    duration: 150,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/06/12/7e06123a-c3af-75cf-c611-94334cb0bf20/886444247238.jpg/600x600bb.jpg',
    audioUrl: '/assets/audio/sample.mp3',
    youtubeId: 'rm9coqlk8fY',
    isYouTube: false,
    isOriginalAudio: true
  },
  {
    id: 'lofi-vienna',
    title: 'Vienna',
    artist: 'Billy Joel',
    genre: 'Retro',
    genres: ['Retro', 'Lo-Fi'],
    language: 'English',
    duration: 214,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/37/68/4c/37684c52-dbdf-9bfe-0d87-07492f43dc4c/dj.gmcbwich.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=3jL4S4X97sQ',
    youtubeId: '3jL4S4X97sQ',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'iris-goo-goo-dolls',
    title: 'Iris',
    artist: 'The Goo Goo Dolls',
    genre: 'Indie',
    genres: ['Indie', 'Retro'],
    language: 'English',
    duration: 290,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/13/18/2c131801-00af-58b1-3cc2-13abf4ad5416/093624919162.jpg/600x600bb.jpg',
    audioUrl: '/assets/audio/iris.m4a',
    isYouTube: false,
    isOriginalAudio: true
  },
  {
    id: 'until-i-found-you-stephen-sanchez',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    genre: 'Retro',
    genres: ['Retro', 'Indie', 'Lo-Fi'],
    language: 'English',
    duration: 178,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/d2/c5/64d2c511-67f4-ae09-5153-d39c3da413a3/21UMGIM75467.rgb.jpg/600x600bb.jpg',
    audioUrl: '/assets/audio/until_i_found_you.m4a',
    youtubeId: 'GhQxrCrVSyw',
    isYouTube: false,
    isOriginalAudio: true
  },
  {
    id: 'agar-tu-hota-ankit-tiwari',
    title: 'Agar Tu Hota',
    artist: 'Ankit Tiwari',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Peace', 'Chill/Sleep'],
    language: 'Hindi',
    duration: 329,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a4/6c/48/a46c48cb-fba0-dcc8-ab9c-7b5ccef9c25a/8902894357944_cover.jpg/600x600bb.jpg',
    audioUrl: '/assets/audio/agar_tu_hota.m4a',
    youtubeId: '2nVNoKpXl9M',
    isYouTube: false,
    isOriginalAudio: true
  },
  {
    id: 'indie-faasle-kaavish',
    title: 'Faasle',
    artist: 'Kaavish',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi', 'Peace'],
    language: 'Hindi',
    duration: 312,
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    youtubeId: 'tZ42pPcvxoc',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Synthwave & Outrun Hits
  {
    id: 'synth-nightcall',
    title: 'Nightcall',
    artist: 'Kavinsky',
    genre: 'Synthwave',
    genres: ['Synthwave', 'Retro'],
    language: 'English',
    duration: 258,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=MV_3Dpw-BRY',
    youtubeId: 'MV_3Dpw-BRY',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'synth-midnight-city',
    title: 'Midnight City',
    artist: 'M83',
    genre: 'Synthwave',
    genres: ['Synthwave', 'Indie'],
    language: 'English',
    duration: 241,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=dX3k_QDnzHE',
    youtubeId: 'dX3k_QDnzHE',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'synth-blinding-lights',
    title: 'Blinding Lights (Remix)',
    artist: 'The Weeknd & ROSALÍA',
    genre: 'Synthwave',
    genres: ['Synthwave', 'Retro'],
    language: 'English',
    duration: 216,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    youtubeId: '4NRXx6U8ABQ',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Retro 80s Classics
  {
    id: 'retro-tears-for-fears',
    title: 'Everybody Wants to Rule the World',
    artist: 'Tears for Fears',
    genre: 'Retro',
    genres: ['Retro', 'Synthwave'],
    language: 'English',
    duration: 251,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/74/41/43/744143ae-afad-8380-106e-1c1bc48922e4/14UMGIM34762.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=aGCdLKXNF3w',
    youtubeId: 'aGCdLKXNF3w',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'retro-take-on-me',
    title: 'Take On Me',
    artist: 'a-ha',
    genre: 'Retro',
    genres: ['Retro', 'Synthwave'],
    language: 'English',
    duration: 229,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music/c6/e1/c8/mzi.ixgzfcmc.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=djV11Xbc914',
    youtubeId: 'djV11Xbc914',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Indie Soul
  {
    id: 'indie-the-night-we-met',
    title: 'The Night We Met',
    artist: 'Lord Huron',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'English',
    duration: 208,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/55/41/4a/55414a18-861a-79d1-e575-5bf8cf205dbe/886445056839_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=KtlgYxa6BMU',
    youtubeId: 'KtlgYxa6BMU',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'indie-riptide',
    title: 'Riptide',
    artist: 'Vance Joy',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'English',
    duration: 202,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7a/1c/65/7a1c6571-34e9-bb77-32be-90c72ba003c0/075679920355.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=uJ_1HMAGb4k',
    youtubeId: 'uJ_1HMAGb4k',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'indie-let-her-go',
    title: 'Let Her Go',
    artist: 'Passenger',
    genre: 'Indie',
    genres: ['Indie', 'Peace'],
    language: 'English',
    duration: 253,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/9b/7e/28/9b7e2896-e049-1663-6791-e0111690ffc1/067003051361.png/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=RBumgq5yVrA',
    youtubeId: 'RBumgq5yVrA',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Lo-Fi Vibes
  {
    id: 'lofi-ocean-eyes',
    title: 'ocean eyes',
    artist: 'Billie Eilish',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Peace', 'Chill/Sleep'],
    language: 'English',
    duration: 200,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/02/1d/30/021d3036-5503-3ed3-df00-882f2833a6ae/17UM1IM17026.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=viimfQi_pUw',
    youtubeId: 'viimfQi_pUw',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Peace & Ambient
  {
    id: 'peace-weightless',
    title: 'Weightless',
    artist: 'Marconi Union',
    genre: 'Peace',
    genres: ['Peace', 'Chill/Sleep'],
    language: 'English',
    duration: 480,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/3a/d6/c33ad6a3-ec91-62e4-0912-d4a873d4fed0/cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU',
    youtubeId: 'UfcAVejslrU',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'peace-clair-de-lune',
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    genre: 'Peace',
    genres: ['Peace', 'Chill/Sleep'],
    language: 'English',
    duration: 218,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music/5f/f2/dc/mzi.cjpwuohz.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=WNcsUNKlAKw',
    youtubeId: 'WNcsUNKlAKw',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'peace-river-flows',
    title: 'River Flows In You',
    artist: 'Yiruma',
    genre: 'Peace',
    genres: ['Peace', 'Chill/Sleep'],
    language: 'English',
    duration: 189,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5f/f4/9b/5ff49b8c-d0bb-3748-14f4-131edfb332ce/first_love_3000.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=7maJOI3QMu0',
    youtubeId: '7maJOI3QMu0',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'chill-gymnopedie',
    title: 'Gymnopedie No.1',
    artist: 'Erik Satie',
    genre: 'Chill/Sleep',
    genres: ['Chill/Sleep', 'Peace'],
    language: 'English',
    duration: 191,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/fd/fe/23/fdfe23c0-ed10-4485-a8e1-702a99a8336c/859712317261_cover.tif/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=S-Xm7s9eGuU',
    youtubeId: 'S-Xm7s9eGuU',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'chill-blizzard',
    title: 'Blizzard (Pon I)',
    artist: 'Kai Engel',
    genre: 'Chill/Sleep',
    genres: ['Chill/Sleep', 'Peace'],
    language: 'English',
    duration: 182,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9c/d7/1b/9cd71b1a-5ccf-bad3-9e18-e0df0f1d48d6/5054316171102.png/600x600bb.jpg',
    audioUrl: '/assets/audio/sample.mp3',
    isYouTube: false,
    isOriginalAudio: true
  },

  // Hindi Hits
  {
    id: 'hindi-kesariya',
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Pritam, Arijit Singh & Amitabh Bhattacharya',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie'],
    language: 'Hindi',
    duration: 268,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=BddP6PYo2gs',
    youtubeId: 'BddP6PYo2gs',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'hindi-heeriye',
    title: 'Heeriye',
    artist: 'Jasleen Royal & Arijit Singh',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'Hindi',
    duration: 195,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=RLzC55ai0eo',
    youtubeId: 'RLzC55ai0eo',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'hindi-pehli-dafa',
    title: 'Pehli Dafa',
    artist: 'Atif Aslam & Shiraz Uppal',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Retro'],
    language: 'Hindi',
    duration: 299,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/06/f5/7e06f500-2d05-879b-18a1-e901d1a43d65/8903431633866_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=1o2a_25XW1Q',
    youtubeId: '1o2a_25XW1Q',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'hindi-tum-se-hi',
    title: 'Tum Se Hi',
    artist: 'Pritam & Mohit Chauhan',
    genre: 'Indie',
    genres: ['Indie', 'Peace'],
    language: 'Hindi',
    duration: 321,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3d/c7/43/3dc74387-e7f4-2342-397c-4cf2037c69a5/8902894623223_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=mt9xg0mmt28',
    youtubeId: 'mt9xg0mmt28',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'hindi-tum-mile',
    title: 'Tum Mile',
    artist: 'Neeraj Shridhar & Pritam',
    genre: 'Retro',
    genres: ['Retro', 'Synthwave'],
    language: 'Hindi',
    duration: 344,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a7/b4/e3/a7b4e3c0-5407-bb18-09fa-f43e6367ddf5/884977348316.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=6p_B2_U8rC4',
    youtubeId: '6p_B2_U8rC4',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'hindi-apna-bana-le',
    title: 'Apna Bana Le (From "Bhediya")',
    artist: 'Arijit Singh, Sachin-Jigar & Amitabh Bhattacharya',
    genre: 'Peace',
    genres: ['Peace', 'Lo-Fi'],
    language: 'Hindi',
    duration: 262,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=ElZfdU54Cp8',
    youtubeId: 'ElZfdU54Cp8',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Prateek Kuhad Tracks
  {
    id: 'prateek-kasoor',
    title: 'Kasoor',
    artist: 'Prateek Kuhad',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'Hindi',
    duration: 198,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/60/d3/e9/60d3e9b3-4991-16bd-1468-ce522245c9e2/cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=BmUe3-7WcTU',
    youtubeId: 'BmUe3-7WcTU',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'prateek-cold-mess',
    title: 'cold/mess',
    artist: 'Prateek Kuhad',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie'],
    language: 'English',
    duration: 281,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/59/4f/41/594f4117-78b6-0699-340f-84bda46cbe6b/075679801531.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=Il7nv242zUs',
    youtubeId: 'Il7nv242zUs',
    isYouTube: true,
    isOriginalAudio: false
  },

  // Bengali Tracks
  {
    id: 'bengali-tomake-chai',
    title: 'Tomake Chai',
    artist: 'Arijit Singh',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie'],
    language: 'Bengali',
    duration: 254,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/89/8e/f0/898ef084-7fb7-647f-5789-af30c5277f06/840123900494.png/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=w9h2X7Yk8X4',
    youtubeId: 'w9h2X7Yk8X4',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'bengali-amake-amar-moto',
    title: 'Amake Amar Moto Thakte Dao - Lofi',
    artist: 'Anupam Roy',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'Bengali',
    duration: 141,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a7/81/cb/a781cb19-1bf6-f76b-1ca9-3d80c424b458/840123914354.png/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=z_1Xb7rX0H0',
    youtubeId: 'z_1Xb7rX0H0',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'bengali-mon-majhi-re',
    title: 'Mon Majhi Re',
    artist: 'Arijit Singh',
    genre: 'Peace',
    genres: ['Peace', 'Lo-Fi'],
    language: 'Bengali',
    duration: 308,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music111/v4/48/59/c2/4859c2e5-da42-32cb-0bb0-b169cb769d06/8902894353977_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=jR4nUo9z7yE',
    youtubeId: 'jR4nUo9z7yE',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'bengali-majhe-majhe-tobo',
    title: 'Majhe Majhe Tobo (Original)',
    artist: 'Arindom',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie', 'Peace'],
    language: 'Bengali',
    duration: 262,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/d6/d8/80d6d8ef-03fd-991a-4f6c-e2e979355bb7/840123905307.png/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=tNq0g06uJ_0',
    youtubeId: 'tNq0g06uJ_0',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'ghazal-woh-kagaz-ki-kashti',
    title: 'Woh Kagaz Ki Kashti',
    artist: 'Jagjit Singh',
    genre: 'Ghazal',
    genres: ['Ghazal', 'Retro', 'Peace'],
    language: 'Hindi',
    duration: 242,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/09/a3/a409a341-3b7c-0cfa-628d-17e923e42c26/886445587784.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=qjT89QZ_w90',
    youtubeId: 'qjT89QZ_w90',
    isYouTube: true,
    isOriginalAudio: false
  },
  {
    id: 'ghazal-hothon-se-chhoo-lo',
    title: 'Hothon Se Chhoo Lo Tum',
    artist: 'Jagjit Singh',
    genre: 'Ghazal',
    genres: ['Ghazal', 'Retro', 'Chill/Sleep'],
    language: 'Hindi',
    duration: 298,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/8a/be/b98abee7-d5d1-93c6-946a-73b3e8c9735d/886443491403.jpg/600x600bb.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=p2vT10-y6OQ',
    youtubeId: 'p2vT10-y6OQ',
    isYouTube: true,
  }
].map(track => ({
  ...track,
  isPublic: true,
  isOfficial: true,
  publishedBy: 'Musicly'
}));

export const SCENES = [
  {
    id: 'cozy_bedroom',
    name: 'Cozy Bedroom Studio',
    image: '/assets/images/cozy_bedroom.jpg',
    desc: 'Warm glow, neon sign, guitar, candle & coding monitors'
  },
  {
    id: 'vibe_carousel',
    name: 'After Hours',
    image: '/assets/images/after_hours_scene.jpg',
    desc: '3D cylindrical glass card gallery with reflections, vibe exploration & instant play',
    isInteractive: true,
    isTheme: true,
    isPremium: true,
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    glowColor: 'rgba(245, 158, 11, 0.35)'
  },
  {
    id: 'minimal_studio',
    name: 'Minimal',
    image: '/assets/images/vibe_room_background.jpg',
    desc: 'Calm, architectural, editorial music workstation with tactile asymmetric composition',
    isInteractive: true,
    isTheme: true,
    isPremium: true,
    primaryColor: '#f59e0b',
    secondaryColor: '#e0a96d',
    glowColor: 'rgba(245, 158, 11, 0.25)'
  }
];
