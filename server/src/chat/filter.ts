/**
 * Profanity filter for in-game chat.
 *
 * Uses a configurable word blocklist.
 * Blocked words are replaced with asterisks (e.g. "hell" → "****").
 *
 * The list can be overridden at runtime by setting the
 * PROFANITY_BLOCKLIST env var to a comma-separated list of words.
 */

// Default blocklist — common profanity and slurs
const DEFAULT_BLOCKLIST = [
  "damn", "hell", "ass", "crap", "shit", "fuck", "bitch", "bastard",
  "piss", "cock", "dick", "pussy", "whore", "slut", "fag", "nigger",
  "nigga", "cunt", "twat", "wank", "bollocks", "arse", "prick",
  "douche", "retard",
];

interface FilterPattern {
  re: RegExp;
  len: number;
}

function buildPatterns(words: string[]): FilterPattern[] {
  return words
    .filter(Boolean)
    .map((w) => ({
      // Word-boundary match, case-insensitive
      re: new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
      len: w.length,
    }));
}

// Load blocklist once at module initialisation
const envList = process.env.PROFANITY_BLOCKLIST;
const words = envList
  ? envList.split(",").map((w) => w.trim()).filter(Boolean)
  : DEFAULT_BLOCKLIST;

const PATTERNS = buildPatterns(words);

/**
 * Filters profanity in a chat message.
 *
 * @returns `filtered` — the cleaned text
 * @returns `violated` — true if at least one word was replaced
 */
export function filterProfanity(text: string): { filtered: string; violated: boolean } {
  let filtered = text;
  let violated = false;

  for (const { re } of PATTERNS) {
    const replaced = filtered.replace(re, (match) => "*".repeat(match.length));
    if (replaced !== filtered) {
      violated = true;
      filtered = replaced;
    }
    re.lastIndex = 0; // reset stateful regex (safety for global flag)
  }

  return { filtered, violated };
}
