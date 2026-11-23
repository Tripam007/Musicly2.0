/**
 * Dead Poets Society — Curated Iconic Quotes
 * Featured in the transparent studio canopy pill
 */
export const DEAD_POETS_QUOTES = [
  {
    quote: "O Captain! My Captain!",
    author: "Dead Poets Society"
  },
  {
    quote: "Carpe diem. Seize the day, boys. Make your lives extraordinary.",
    author: "Dead Poets Society"
  },
  {
    quote: "No matter what anybody tells you, words and ideas can change the world.",
    author: "Dead Poets Society"
  },
  {
    quote: "Poetry, beauty, romance, love, these are what we stay alive for.",
    author: "Dead Poets Society"
  },
  {
    quote: "I stand upon my desk to remind myself that we must constantly look at things in a different way.",
    author: "Dead Poets Society"
  },
  {
    quote: "You must strive to find your own voice, because the longer you wait to begin, the less likely you are to find it at all.",
    author: "Dead Poets Society"
  },
  {
    quote: "That the powerful play goes on, and you may contribute a verse. What will your verse be?",
    author: "Dead Poets Society"
  },
  {
    quote: "Two roads diverged in a wood, and I— I took the one less traveled by, and that has made all the difference.",
    author: "Dead Poets Society"
  },
  {
    quote: "Suck out all the marrow of life.",
    author: "Dead Poets Society"
  },
  {
    quote: "Most men lead lives of quiet desperation. Don't be resigned to that. Break out!",
    author: "Dead Poets Society"
  }
];

export function getRandomDeadPoetsQuote() {
  try {
    const storageKey = 'musicly_last_dps_quote_idx';
    const lastIdxStr = sessionStorage.getItem(storageKey);
    const lastIdx = lastIdxStr !== null ? parseInt(lastIdxStr, 10) : -1;

    let nextIdx = Math.floor(Math.random() * DEAD_POETS_QUOTES.length);
    if (DEAD_POETS_QUOTES.length > 1 && nextIdx === lastIdx) {
      nextIdx = (nextIdx + 1) % DEAD_POETS_QUOTES.length;
    }
    sessionStorage.setItem(storageKey, String(nextIdx));
    return DEAD_POETS_QUOTES[nextIdx];
  } catch {
    return DEAD_POETS_QUOTES[0];
  }
}
