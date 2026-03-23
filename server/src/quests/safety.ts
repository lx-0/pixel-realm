/**
 * LLM safety utilities for quest generation.
 *
 * - Input sanitization  : strips prompt-injection patterns from player-influenced strings
 * - Output validation   : verifies the LLM JSON response matches the expected schema
 * - Content moderation  : checks for age-inappropriate text before serving to players
 * - Audit logging       : structured JSON log of every LLM interaction
 */

import crypto from "crypto";
import type { QuestType } from "./types";
import type { RawQuestData } from "./generate";

// ── Input sanitization ────────────────────────────────────────────────────────

/**
 * Removes content that could override LLM instructions via prompt injection.
 * Applied to every player-influenced string before it is embedded in a prompt.
 *
 * Defence layers:
 *   1. Strip classic "ignore previous instructions" patterns
 *   2. Strip role-override attempts ("you are now", "act as")
 *   3. Remove structural characters that could break delimiter-based isolation
 *   4. Hard-cap length so large payloads can't bloat the prompt
 */
export function sanitizePromptInput(value: string): string {
  if (!value || typeof value !== "string") return "";

  let s = value
    // Layer 1 — instruction-override phrases
    .replace(
      /\b(ignore|disregard|forget|override|bypass)\b[^.!?\n]{0,80}?\b(above|previous|prior|all|any)\b[^.!?\n]{0,80}?\b(instructions?|prompt|rules?|directives?|context|system)\b/gi,
      "[filtered]",
    )
    // Layer 2 — role-persona hijack
    .replace(
      /\b(you are( now)?|act as|pretend( to be)?|your (new |true )?role( is)?|system (prompt|message|instruction))\b/gi,
      "[filtered]",
    )
    // Layer 3 — structural injection characters that break prompt delimiters
    .replace(/[<>{}\[\]\\|`~]/g, "")
    // Collapse consecutive spaces left by replacements
    .replace(/\s{2,}/g, " ")
    .trim();

  // Hard cap — faction names / standing values should never be long
  return s.slice(0, 100);
}

// ── Output schema validation ──────────────────────────────────────────────────

const VALID_QUEST_TYPES = new Set<string>(["kill", "fetch", "explore", "escort", "puzzle"]);

/**
 * Validates that a parsed LLM response matches the expected quest schema.
 *
 * Returns null when the schema is valid; returns an error description string
 * when validation fails so the caller can log it and decide whether to retry.
 */
export function validateQuestOutput(parsed: unknown, questType: QuestType): string | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "response is not a JSON object";
  }
  const q = parsed as Record<string, unknown>;

  // ── title
  if (typeof q.title !== "string" || q.title.trim().length === 0) {
    return "missing or empty title";
  }
  if (q.title.length > 80) {
    return `title too long (${q.title.length} chars, max 80)`;
  }

  // ── description
  if (typeof q.description !== "string" || q.description.trim().length === 0) {
    return "missing or empty description";
  }
  if (q.description.length > 600) {
    return `description too long (${q.description.length} chars, max 600)`;
  }

  // ── objectives
  if (!Array.isArray(q.objectives) || q.objectives.length === 0) {
    return "objectives must be a non-empty array";
  }
  for (let i = 0; i < q.objectives.length; i++) {
    const obj = q.objectives[i];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return `objectives[${i}] is not an object`;
    }
    const o = obj as Record<string, unknown>;
    if (!VALID_QUEST_TYPES.has(String(o.type))) {
      return `objectives[${i}].type is invalid: ${String(o.type)}`;
    }
    if (typeof o.target !== "string" || o.target.trim().length === 0) {
      return `objectives[${i}].target is missing or empty`;
    }
    if (o.target.length > 100) {
      return `objectives[${i}].target too long`;
    }
    if (typeof o.description !== "string" || o.description.trim().length === 0) {
      return `objectives[${i}].description is missing or empty`;
    }
    if (o.description.length > 200) {
      return `objectives[${i}].description too long`;
    }
    // count: must be a positive integer or null/undefined
    if (o.count !== undefined && o.count !== null) {
      if (typeof o.count !== "number" || !Number.isInteger(o.count) || o.count < 1 || o.count > 1000) {
        return `objectives[${i}].count must be a positive integer or null`;
      }
    }
  }

  // ── dialogue
  if (!q.dialogue || typeof q.dialogue !== "object" || Array.isArray(q.dialogue)) {
    return "missing dialogue object";
  }
  const d = q.dialogue as Record<string, unknown>;
  for (const key of ["greeting", "acceptance", "completion"] as const) {
    if (typeof d[key] !== "string" || (d[key] as string).trim().length === 0) {
      return `dialogue.${key} is missing or empty`;
    }
    if ((d[key] as string).length > 160) {
      return `dialogue.${key} too long (${(d[key] as string).length} chars, max 160)`;
    }
  }

  // ── dialogue.choices (optional, but validated when present)
  if (d.choices !== undefined) {
    if (!Array.isArray(d.choices) || d.choices.length < 2 || d.choices.length > 3) {
      return "dialogue.choices must be an array of 2-3 entries";
    }
    const VALID_OUTCOMES = new Set(["accept", "decline", "neutral", "rep_bonus"]);
    for (let i = 0; i < d.choices.length; i++) {
      const c = d.choices[i];
      if (!c || typeof c !== "object" || Array.isArray(c)) {
        return `dialogue.choices[${i}] is not an object`;
      }
      const ch = c as Record<string, unknown>;
      if (typeof ch.id !== "string" || ch.id.trim().length === 0) {
        return `dialogue.choices[${i}].id is missing`;
      }
      if (typeof ch.label !== "string" || ch.label.trim().length === 0) {
        return `dialogue.choices[${i}].label is missing`;
      }
      if ((ch.label as string).length > 60) {
        return `dialogue.choices[${i}].label too long`;
      }
      if (typeof ch.response !== "string" || ch.response.trim().length === 0) {
        return `dialogue.choices[${i}].response is missing`;
      }
      if ((ch.response as string).length > 120) {
        return `dialogue.choices[${i}].response too long`;
      }
      if (!VALID_OUTCOMES.has(String(ch.outcome))) {
        return `dialogue.choices[${i}].outcome is invalid: ${String(ch.outcome)}`;
      }
      if (ch.repDelta !== undefined && ch.repDelta !== null) {
        if (typeof ch.repDelta !== "number" || !Number.isFinite(ch.repDelta)) {
          return `dialogue.choices[${i}].repDelta must be a number`;
        }
      }
    }
  }

  // ── completionConditions
  if (
    !q.completionConditions ||
    typeof q.completionConditions !== "object" ||
    Array.isArray(q.completionConditions)
  ) {
    return "missing completionConditions object";
  }
  const cc = q.completionConditions as Record<string, unknown>;
  if (!VALID_QUEST_TYPES.has(String(cc.type))) {
    return `completionConditions.type is invalid: ${String(cc.type)}`;
  }
  if (typeof cc.target !== "string" || cc.target.trim().length === 0) {
    return "completionConditions.target is missing or empty";
  }
  if (cc.target.length > 100) {
    return "completionConditions.target too long";
  }
  if (cc.count !== undefined && cc.count !== null) {
    if (typeof cc.count !== "number" || !Number.isInteger(cc.count) || cc.count < 1 || cc.count > 1000) {
      return "completionConditions.count must be a positive integer or null";
    }
  }

  return null; // ✓ valid
}

// ── Content moderation ────────────────────────────────────────────────────────

/**
 * Patterns that must never appear in child-appropriate quest content.
 *
 * Intentionally conservative: if the LLM somehow generates content matching
 * any of these patterns the quest is discarded and a fallback is served.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  // Profanity
  /\b(fuck|shit|damn|hell|ass(?:hole)?|bitch|bastard|crap|piss|cunt|dick|cock)\b/gi,
  // Graphic violence
  /\b(blood(?:bath|shed)?|gore|gory|murder|massacre|slaughter|dismember|decapitat)\b/gi,
  // Self-harm
  /\b(kill yourself|suicide|self.harm)\b/gi,
  // Sexual
  /\b(sex(?:ual)?|naked|nude|porn(?:ography)?|adult content|erotic)\b/gi,
  // Injection artefacts that survived sanitization
  /\[filtered\]/gi,
  /ignore.*?(previous|prior|all).*?instructions?/gi,
];

/**
 * Checks all text fields in a generated quest for inappropriate content.
 * Returns { safe: true } when clean, or { safe: false, reason } when not.
 */
export function moderateQuestContent(
  quest: Pick<RawQuestData, "title" | "description" | "objectives" | "dialogue">,
): { safe: boolean; reason?: string } {
  const choiceTexts = (quest.dialogue.choices ?? []).flatMap((c) => [c.label, c.response]);
  const texts: string[] = [
    quest.title,
    quest.description,
    quest.dialogue.greeting,
    quest.dialogue.acceptance,
    quest.dialogue.completion,
    ...quest.objectives.map((o) => `${o.target} ${o.description}`),
    ...choiceTexts,
  ];

  for (const text of texts) {
    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0; // always reset stateful regex
      if (pattern.test(text)) {
        pattern.lastIndex = 0;
        return { safe: false, reason: "blocked content detected in quest text" };
      }
    }
  }
  return { safe: true };
}

// ── Audit logging ─────────────────────────────────────────────────────────────

export interface LLMAuditEvent {
  /** Unique ID for this generation attempt. */
  eventId: string;
  timestamp: string;
  zoneId: string;
  questType: QuestType;
  levelBucket: number;
  /** SHA-256 of the full prompt — allows correlation without logging raw PII. */
  promptHash: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokenBudget: number;
  overBudget: boolean;
  responseValid: boolean;
  validationError: string | null;
  moderationSafe: boolean;
  moderationReason: string | null;
  /** True if we served the hand-crafted fallback instead of an LLM response. */
  usedFallback: boolean;
  /** True if we retried after the first attempt failed validation. */
  retried: boolean;
}

/** Hashes a prompt string for audit trail without storing the raw prompt. */
export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

/** Constructs an audit event with safe defaults for all optional fields. */
export function buildAuditEvent(
  required: Pick<LLMAuditEvent, "zoneId" | "questType" | "levelBucket" | "promptHash" | "tokenBudget">,
  overrides: Partial<LLMAuditEvent> = {},
): LLMAuditEvent {
  return {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    overBudget: false,
    responseValid: false,
    validationError: null,
    moderationSafe: false,
    moderationReason: null,
    usedFallback: false,
    retried: false,
    ...required,
    ...overrides,
  };
}

/** Emits a structured JSON audit log entry. Warns to stderr on budget/moderation failures. */
export function emitAuditLog(event: LLMAuditEvent): void {
  console.log(JSON.stringify({ llm_audit: event }));

  if (event.overBudget) {
    console.warn(
      `[LLM BUDGET ALERT] ${event.zoneId}/${event.questType} used ${event.totalTokens}/${event.tokenBudget} tokens (id=${event.eventId})`,
    );
  }
  if (!event.moderationSafe && !event.usedFallback) {
    console.warn(
      `[LLM MODERATION FAIL] ${event.zoneId}/${event.questType}: ${event.moderationReason} (id=${event.eventId})`,
    );
  }
}
