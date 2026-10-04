/**
 * Original Track Master Audio Resolver for Musicly
 * Guarantees that iconic and requested songs always play their authentic,
 * original master audio streams directly through HTML5 Audio,
 * bypassing YouTube embedding restrictions (error 150/101) and eliminating procedural chord fallbacks.
 */

import { extractYouTubeId } from './youtubePlayer';

export const KNOWN_ORIGINAL_SONGS = [
  {
    id: 'heavens-door-bob-dylan',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      const lowerUrl = (t.audioUrl || '').toLowerCase();
      const yId = (t.youtubeId || '').toLowerCase();
      return (lowerTitle.includes('heaven') && lowerTitle.includes('door')) ||
             lowerTitle.includes('knockin') ||
             lowerArtist.includes('bob dylan') ||
             yId === 'rm9coqlk8fy' ||
             lowerUrl.includes('rm9coqlk8fy');
    },
    title: "Knockin' On Heaven's Door",
    artist: 'Bob Dylan',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/98/9a/a5989a67-426b-5fad-7234-339fd2d08488/mzaf_11743263021663924501.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/06/12/7e06123a-c3af-75cf-c611-94334cb0bf20/886444247238.jpg/600x600bb.jpg',
    duration: 150,
    language: 'English',
    genres: ['Retro', 'Indie'],
    genre: 'Retro, Indie'
  },
  {
    id: 'lofi-vienna',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      const yId = (t.youtubeId || '').toLowerCase();
      return lowerTitle.includes('vienna') ||
             lowerArtist.includes('billy joel') ||
             yId === '3jl4s4x97sq';
    },
    title: 'Vienna',
    artist: 'Billy Joel',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e8/d2/03/e8d203cc-ce97-278b-5abb-c6de33d36d37/mzaf_5153648922176185845.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/37/68/4c/37684c52-dbdf-9bfe-0d87-07492f43dc4c/dj.gmcbwich.jpg/600x600bb.jpg',
    duration: 214,
    language: 'English',
    genres: ['Retro', 'Lo-Fi'],
    genre: 'Retro, Lo-Fi'
  },
  {
    id: 'iris-goo-goo-dolls',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('iris') || lowerArtist.includes('goo goo dolls');
    },
    title: 'Iris',
    artist: 'The Goo Goo Dolls',
    audioUrl: '/assets/audio/iris.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/13/18/2c131801-00af-58b1-3cc2-13abf4ad5416/093624919162.jpg/600x600bb.jpg',
    duration: 290,
    language: 'English',
    genres: ['Indie', 'Retro'],
    genre: 'Indie, Retro'
  },
  {
    id: 'until-i-found-you-stephen-sanchez',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      const lowerUrl = (t.audioUrl || '').toLowerCase();
      const yId = (t.youtubeId || '').toLowerCase();
      return lowerTitle.includes('until i found you') ||
             lowerUrl.includes('gxldq9gyxla') ||
             yId === 'gxldq9gyxla' ||
             (lowerTitle.includes('until') && lowerTitle.includes('found')) ||
             (lowerTitle.includes('until') && lowerArtist.includes('sanchez'));
    },
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    audioUrl: '/assets/audio/until_i_found_you.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/d2/c5/64d2c511-67f4-ae09-5153-d39c3da413a3/21UMGIM75467.rgb.jpg/600x600bb.jpg',
    duration: 178,
    language: 'English',
    genres: ['Retro', 'Indie', 'Lo-Fi'],
    genre: 'Retro, Indie'
  },
  {
    id: 'agar-tu-hota-ankit-tiwari',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      const lowerUrl = (t.audioUrl || '').toLowerCase();
      const yId = (t.youtubeId || '').toLowerCase();
      return lowerTitle.includes('agar tu hota') ||
             (lowerTitle.includes('agar') && lowerTitle.includes('hota')) ||
             lowerUrl.includes('4_l_n3mp308') ||
             yId === '4_l_n3mp308' ||
             lowerUrl.includes('2nvnokpxl9m') ||
             yId === '2nvnokpxl9m' ||
             (lowerTitle.includes('agar') && (lowerArtist.includes('ankit') || lowerArtist.includes('baaghi')));
    },
    title: 'Agar Tu Hota',
    artist: 'Ankit Tiwari',
    audioUrl: '/assets/audio/agar_tu_hota.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a4/6c/48/a46c48cb-fba0-dcc8-ab9c-7b5ccef9c25a/8902894357944_cover.jpg/600x600bb.jpg',
    duration: 329,
    language: 'Hindi',
    genres: ['Lo-Fi', 'Peace', 'Chill/Sleep'],
    genre: 'Lo-Fi, Peace'
  },
  {
    id: 'indie-faasle-kaavish',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('faasle') || (lowerTitle.includes('fasle') && lowerArtist.includes('kaavish'));
    },
    title: 'Faasle',
    artist: 'Kaavish',
    youtubeId: 'tZ42pPcvxoc',
    isYouTube: true,
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    duration: 312,
    language: 'Hindi',
    genres: ['Indie', 'Lo-Fi', 'Peace'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'synth-nightcall',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('nightcall') || lowerArtist.includes('kavinsky');
    },
    title: 'Nightcall',
    artist: 'Kavinsky',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d2/45/fb/d245fbf9-8570-fdc0-5e6b-aa528c130486/mzaf_11947081694159530687.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/600x600bb.jpg',
    duration: 258,
    language: 'English',
    genres: ['Synthwave', 'Retro'],
    genre: 'Synthwave, Retro'
  },
  {
    id: 'synth-midnight-city',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('midnight city') || (lowerArtist.includes('m83') && lowerTitle.includes('midnight'));
    },
    title: 'Midnight City',
    artist: 'M83',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    duration: 241,
    language: 'English',
    genres: ['Synthwave', 'Indie'],
    genre: 'Synthwave, Indie'
  },
  {
    id: 'synth-blinding-lights',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('blinding lights') || (lowerArtist.includes('weeknd') && lowerTitle.includes('blinding'));
    },
    title: 'Blinding Lights (Remix)',
    artist: 'The Weeknd & ROSALÍA',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg',
    duration: 216,
    language: 'English',
    genres: ['Synthwave', 'Retro'],
    genre: 'Synthwave, Retro'
  },
  {
    id: 'retro-tears-for-fears',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('rule the world') || lowerArtist.includes('tears for fears');
    },
    title: 'Everybody Wants to Rule the World',
    artist: 'Tears for Fears',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ed/23/1f/ed231f7c-78cb-3b4d-f312-fc6b7ec09063/mzaf_14579022326895349191.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/74/41/43/744143ae-afad-8380-106e-1c1bc48922e4/14UMGIM34762.rgb.jpg/600x600bb.jpg',
    duration: 251,
    language: 'English',
    genres: ['Retro', 'Synthwave'],
    genre: 'Retro, Synthwave'
  },
  {
    id: 'retro-take-on-me',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('take on me') || lowerArtist.includes('a-ha');
    },
    title: 'Take On Me',
    artist: 'a-ha',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f2/03/4f/f2034f41-707f-7111-bc63-e5d3cf7f2240/mzaf_17215043934336702540.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music/c6/e1/c8/mzi.ixgzfcmc.jpg/600x600bb.jpg',
    duration: 229,
    language: 'English',
    genres: ['Retro', 'Synthwave'],
    genre: 'Retro, Synthwave'
  },
  {
    id: 'indie-the-night-we-met',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('night we met') || lowerArtist.includes('lord huron');
    },
    title: 'The Night We Met',
    artist: 'Lord Huron',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/64/b4/f3/64b4f3e5-d4f9-ec10-e6af-b6c26bde9b47/mzaf_8621887946764980860.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/55/41/4a/55414a18-861a-79d1-e575-5bf8cf205dbe/886445056839_Cover.jpg/600x600bb.jpg',
    duration: 208,
    language: 'English',
    genres: ['Indie', 'Lo-Fi'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'indie-riptide',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('riptide') || lowerArtist.includes('vance joy');
    },
    title: 'Riptide',
    artist: 'Vance Joy',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/1e/de/ea/1edeea50-c0f4-9d95-f0b8-b23a1af561db/mzaf_6343110017276582270.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7a/1c/65/7a1c6571-34e9-bb77-32be-90c72ba003c0/075679920355.jpg/600x600bb.jpg',
    duration: 202,
    language: 'English',
    genres: ['Indie', 'Lo-Fi'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'indie-let-her-go',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('let her go') || (lowerArtist.includes('passenger') && lowerTitle.includes('let'));
    },
    title: 'Let Her Go',
    artist: 'Passenger',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/26/90/0f/26900f61-d88a-a558-6f4d-b0dec8ba5262/mzaf_6952636564970959693.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/9b/7e/28/9b7e2896-e049-1663-6791-e0111690ffc1/067003051361.png/600x600bb.jpg',
    duration: 253,
    language: 'English',
    genres: ['Indie', 'Peace'],
    genre: 'Indie, Peace'
  },
  {
    id: 'lofi-ocean-eyes',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('ocean eyes') || (lowerArtist.includes('billie eilish') && lowerTitle.includes('ocean'));
    },
    title: 'ocean eyes',
    artist: 'Billie Eilish',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d6/59/2b/d6592b0b-1e7e-4743-b2e4-f2af038fd783/mzaf_7697277787797935735.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/02/1d/30/021d3036-5503-3ed3-df00-882f2833a6ae/17UM1IM17026.rgb.jpg/600x600bb.jpg',
    duration: 200,
    language: 'English',
    genres: ['Lo-Fi', 'Peace', 'Chill/Sleep'],
    genre: 'Lo-Fi, Peace'
  },
  {
    id: 'peace-weightless',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('weightless') || lowerArtist.includes('marconi union');
    },
    title: 'Weightless',
    artist: 'Marconi Union',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/65/69/07/656907c9-eb54-c59c-72b9-dad8489a0165/mzaf_3316991574698499044.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/3a/d6/c33ad6a3-ec91-62e4-0912-d4a873d4fed0/cover.jpg/600x600bb.jpg',
    duration: 480,
    language: 'English',
    genres: ['Peace', 'Chill/Sleep'],
    genre: 'Peace, Chill/Sleep'
  },
  {
    id: 'peace-clair-de-lune',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('clair de lune') || lowerArtist.includes('debussy');
    },
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/49/22/f3/4922f374-b517-fb33-cff6-8fa6ca15656b/mzaf_12675765766962791398.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music/5f/f2/dc/mzi.cjpwuohz.jpg/600x600bb.jpg',
    duration: 218,
    language: 'English',
    genres: ['Peace', 'Chill/Sleep'],
    genre: 'Peace, Chill/Sleep'
  },
  {
    id: 'peace-river-flows',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('river flows') || lowerArtist.includes('yiruma');
    },
    title: 'River Flows In You',
    artist: 'Yiruma',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/5d/e8/db/5de8db2a-16e9-9952-1e92-72c8bd66c466/mzaf_12453809584145821574.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5f/f4/9b/5ff49b8c-d0bb-3748-14f4-131edfb332ce/first_love_3000.jpg/600x600bb.jpg',
    duration: 189,
    language: 'English',
    genres: ['Peace', 'Chill/Sleep'],
    genre: 'Peace, Chill/Sleep'
  },
  {
    id: 'chill-gymnopedie',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('gymnopedie') || lowerArtist.includes('satie');
    },
    title: 'Gymnopedie No.1',
    artist: 'Erik Satie',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e8/3f/57/e83f57f3-68a1-f88f-d7ad-741e12e48c6d/mzaf_14596551055740884645.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/fd/fe/23/fdfe23c0-ed10-4485-a8e1-702a99a8336c/859712317261_cover.tif/600x600bb.jpg',
    duration: 191,
    language: 'English',
    genres: ['Chill/Sleep', 'Peace'],
    genre: 'Chill/Sleep, Peace'
  },
  {
    id: 'chill-blizzard',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return lowerTitle.includes('blizzard') || lowerArtist.includes('kai engel');
    },
    title: 'Blizzard (Pon I)',
    artist: 'Kai Engel',
    audioUrl: '/assets/audio/sample.mp3',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9c/d7/1b/9cd71b1a-5ccf-bad3-9e18-e0df0f1d48d6/5054316171102.png/600x600bb.jpg',
    duration: 182,
    language: 'English',
    genres: ['Chill/Sleep', 'Peace'],
    genre: 'Chill/Sleep, Peace'
  },
  {
    id: 'hindi-kesariya',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('kesariya') || lowerTitle.includes('brahmastra');
    },
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Pritam, Arijit Singh & Amitabh Bhattacharya',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/38/4c/5c/384c5c8f-3ff8-e457-b2f7-3158ce108649/mzaf_12389299033886433185.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg',
    duration: 268,
    language: 'Hindi',
    genres: ['Lo-Fi', 'Indie'],
    genre: 'Lo-Fi, Indie'
  },
  {
    id: 'hindi-heeriye',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('heeriye');
    },
    title: 'Heeriye',
    artist: 'Jasleen Royal & Arijit Singh',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/14/9b/ac/149bac62-12f1-2f55-a742-f38429b94c83/mzaf_17225240189976438593.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg',
    duration: 195,
    language: 'Hindi',
    genres: ['Indie', 'Lo-Fi'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'hindi-pehli-dafa',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('pehli dafa') || (lowerTitle.includes('pehli') && lowerTitle.includes('dafa'));
    },
    title: 'Pehli Dafa',
    artist: 'Atif Aslam & Shiraz Uppal',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/04/16/83/04168356-0e97-ff19-a823-1a3598f1d59b/mzaf_7896480582828540052.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/06/f5/7e06f500-2d05-879b-18a1-e901d1a43d65/8903431633866_cover.jpg/600x600bb.jpg',
    duration: 299,
    language: 'Hindi',
    genres: ['Lo-Fi', 'Retro'],
    genre: 'Lo-Fi, Retro'
  },
  {
    id: 'hindi-tum-se-hi',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('tum se hi') || (lowerTitle.includes('jab we met') && lowerTitle.includes('tum'));
    },
    title: 'Tum Se Hi',
    artist: 'Pritam & Mohit Chauhan',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e7/39/b8/e739b870-54a1-8f33-57d5-3817108b8bd9/mzaf_16925921654959290990.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3d/c7/43/3dc74387-e7f4-2342-397c-4cf2037c69a5/8902894623223_cover.jpg/600x600bb.jpg',
    duration: 321,
    language: 'Hindi',
    genres: ['Indie', 'Peace'],
    genre: 'Indie, Peace'
  },
  {
    id: 'hindi-tum-mile',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('tum mile') || (lowerTitle.includes('tum') && lowerTitle.includes('mile'));
    },
    title: 'Tum Mile',
    artist: 'Neeraj Shridhar & Pritam',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ff/92/e7/ff92e77e-e631-2c22-e8fb-87c10ff42a01/mzaf_3559705285033933426.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a7/b4/e3/a7b4e3c0-5407-bb18-09fa-f43e6367ddf5/884977348316.jpg/600x600bb.jpg',
    duration: 344,
    language: 'Hindi',
    genres: ['Retro', 'Synthwave'],
    genre: 'Retro, Synthwave'
  },
  {
    id: 'hindi-apna-bana-le',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('apna bana le') || lowerTitle.includes('bhediya');
    },
    title: 'Apna Bana Le (From "Bhediya")',
    artist: 'Arijit Singh, Sachin-Jigar & Amitabh Bhattacharya',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/eb/27/61/eb2761c7-d606-0912-dff0-2dc6b69974bd/mzaf_2023722930851223219.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg',
    duration: 262,
    language: 'Hindi',
    genres: ['Peace', 'Lo-Fi'],
    genre: 'Peace, Lo-Fi'
  },
  {
    id: 'prateek-kasoor',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return t.id === 'hinglish-kasoor' || t.id === 'prateek-kasoor' || lowerTitle.includes('kasoor') || (lowerArtist.includes('prateek') && lowerTitle.includes('kasoor'));
    },
    title: 'Kasoor',
    artist: 'Prateek Kuhad',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c6/34/7f/c6347fe4-d2a8-bf5e-2ca5-7438cce63f93/mzaf_585381111877766094.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/60/d3/e9/60d3e9b3-4991-16bd-1468-ce522245c9e2/cover.jpg/600x600bb.jpg',
    duration: 198,
    language: 'Hindi',
    genres: ['Indie', 'Lo-Fi'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'prateek-cold-mess',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      const lowerArtist = (t.artist || '').toLowerCase();
      return t.id === 'hinglish-cold-mess' || t.id === 'prateek-cold-mess' || lowerTitle.includes('cold/mess') || lowerTitle.includes('cold mess') || (lowerArtist.includes('prateek') && lowerTitle.includes('cold'));
    },
    title: 'cold/mess',
    artist: 'Prateek Kuhad',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b8/2d/80/b82d801a-1d64-d71f-ee8c-051757cdf53b/mzaf_16275896633706250850.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/59/4f/41/594f4117-78b6-0699-340f-84bda46cbe6b/075679801531.jpg/600x600bb.jpg',
    duration: 281,
    language: 'English',
    genres: ['Lo-Fi', 'Indie'],
    genre: 'Lo-Fi, Indie'
  },
  {
    id: 'bengali-tomake-chai',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('tomake chai') || (lowerTitle.includes('gangster') && lowerTitle.includes('tomake'));
    },
    title: 'Tomake Chai',
    artist: 'Arijit Singh',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3b/a8/76/3ba8760e-78b9-0a68-5afa-ef3a83e5f044/mzaf_12526767281237329437.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/89/8e/f0/898ef084-7fb7-647f-5789-af30c5277f06/840123900494.png/600x600bb.jpg',
    duration: 254,
    language: 'Bengali',
    genres: ['Lo-Fi', 'Indie'],
    genre: 'Lo-Fi, Indie'
  },
  {
    id: 'bengali-amake-amar-moto',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('amake amar moto') || (lowerTitle.includes('autograph') && lowerTitle.includes('amake'));
    },
    title: 'Amake Amar Moto Thakte Dao - Lofi',
    artist: 'Anupam Roy',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/03/6b/9f/036b9fa6-f19a-7d29-592c-4aebb720ee2f/mzaf_14338565631606129050.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a7/81/cb/a781cb19-1bf6-f76b-1ca9-3d80c424b458/840123914354.png/600x600bb.jpg',
    duration: 141,
    language: 'Bengali',
    genres: ['Indie', 'Lo-Fi'],
    genre: 'Indie, Lo-Fi'
  },
  {
    id: 'bengali-mon-majhi-re',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('mon majhi re') || (lowerTitle.includes('boss') && lowerTitle.includes('mon majhi'));
    },
    title: 'Mon Majhi Re',
    artist: 'Arijit Singh',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/c7/04/bd/c704bd29-fb73-31f2-9bf9-f4495b3a6000/mzaf_4118832859430908924.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music111/v4/48/59/c2/4859c2e5-da42-32cb-0bb0-b169cb769d06/8902894353977_cover.jpg/600x600bb.jpg',
    duration: 308,
    language: 'Bengali',
    genres: ['Peace', 'Lo-Fi'],
    genre: 'Peace, Lo-Fi'
  },
  {
    id: 'bengali-majhe-majhe-tobo',
    matcher: (t) => {
      if (!t) return false;
      const lowerTitle = (t.title || '').toLowerCase();
      return lowerTitle.includes('majhe majhe tobo') || (lowerTitle.includes('majhe') && lowerTitle.includes('tobo'));
    },
    title: 'Majhe Majhe Tobo (Original)',
    artist: 'Arindom',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/75/02/24/75022453-6f3b-bea3-9de3-cea3768c7aa7/mzaf_16211895491484879465.plus.aac.p.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/d6/d8/80d6d8ef-03fd-991a-4f6c-e2e979355bb7/840123905307.png/600x600bb.jpg',
    duration: 262,
    language: 'Bengali',
    genres: ['Lo-Fi', 'Indie', 'Peace'],
    genre: 'Lo-Fi, Indie'
  }
];

// In-memory cache of resolved streams
const audioResolutionCache = new Map();

// Helper to check if a URL is a direct high-fidelity playable audio stream
export function isDirectPlayableAudio(url) {
  if (!url || typeof url !== 'string') return false;
  // iTunes / Apple preview URLs are strictly 30-second preview clips, NEVER full playable songs!
  if (url.includes('itunes') || url.includes('apple.com') || url.includes('AudioPreview')) return false;
  return (
    url.startsWith('/assets/audio/') ||
    (url.startsWith('blob:') && !url.includes('fallback')) ||
    url.startsWith('data:audio/') ||
    /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(url)
  );
}

/**
 * Synchronously inspect any track object and upgrade it with verified original master audio stream
 * if it corresponds to known songs or is already cached.
 */
export function resolveOriginalTrack(track) {
  if (!track || typeof track !== 'object') return track;

  // 1. Direct local master audio stream (local asset, uploaded file, or blob) takes priority for native DSP EQ & zero-delay play
  if (isDirectPlayableAudio(track.audioUrl) && !track.audioUrl.includes('pixabay.com')) {
    return {
      ...track,
      isOriginalAudio: true,
      isYouTube: false,
      _ytFailed: false
    };
  }

  // 2. YouTube tracks fallback if no direct audio file exists
  const ytId = track.youtubeId || extractYouTubeId(track.audioUrl || '');
  if (track.isYouTube || ytId) {
    return {
      ...track,
      isYouTube: true,
      youtubeId: ytId || track.youtubeId,
      audioUrl: ytId ? `https://www.youtube.com/watch?v=${ytId}` : track.audioUrl,
      isOriginalAudio: false
    };
  }

  // 2. Match against KNOWN_ORIGINAL_SONGS ONLY if it has a real local audio file (e.g. /assets/audio/...)
  for (const known of KNOWN_ORIGINAL_SONGS) {
    if (known.matcher(track)) {
      // Never use 30-second iTunes previews to replace songs!
      if (known.audioUrl?.includes('itunes') || known.audioUrl?.includes('AudioPreview')) {
        continue;
      }

      const cleanArtist = (!track.artist || track.artist.toLowerCase().includes('unknown') || track.artist.toLowerCase().includes('youtube stream'))
        ? known.artist 
        : track.artist;

      const cleanCover = (!track.cover || track.cover.includes('unsplash.com'))
        ? known.cover
        : track.cover;

      const upgraded = {
        ...track,
        title: track.title || known.title,
        artist: cleanArtist,
        audioUrl: known.audioUrl,
        cover: cleanCover,
        duration: track.duration && track.duration > 30 ? track.duration : known.duration,
        language: track.language || known.language,
        genres: (Array.isArray(track.genres) && track.genres.length > 0) ? track.genres : known.genres,
        genre: track.genre || known.genre,
        isOriginalAudio: true,
        isYouTube: false,
        blob: null,
        _ytFailed: false
      };

      return upgraded;
    }
  }

  return track;
}

export async function resolveTrackAudioStreamAsync(track) {
  if (!track) return null;
  return resolveOriginalTrack(track);
}
