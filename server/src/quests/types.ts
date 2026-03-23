/** Quest type enum matching the GDD quest categories. */
export type QuestType = "kill" | "fetch" | "explore" | "escort" | "puzzle";

export interface QuestObjective {
  type: QuestType;
  target: string;   // e.g. "goblin", "ancient scroll", "abandoned watchtower"
  count?: number;   // for kill / fetch quests
  description: string;
}

export interface QuestReward {
  gold: number;
  xp: number;
  items?: Array<{ itemId: string; quantity: number }>;
}

/** A single branching response option shown to the player during NPC dialogue. */
export interface DialogueChoice {
  /** Stable identifier: 'accept' | 'decline' | 'ask_more' | 'negotiate' */
  id: string;
  /** Player-facing label shown on the choice button (max 60 chars). */
  label: string;
  /** NPC's follow-up response after the player selects this choice (max 120 chars). */
  response: string;
  /** What happens when this choice is selected. */
  outcome: "accept" | "decline" | "neutral" | "rep_bonus";
  /** Optional faction reputation delta applied on selection (positive or negative). */
  repDelta?: number;
}

export interface QuestDialogue {
  greeting: string;    // NPC opening line when player approaches
  acceptance: string;  // NPC response after player accepts
  completion: string;  // NPC response when player returns having finished
  /** 2-3 branching player response options. Present when contextually appropriate. */
  choices?: DialogueChoice[];
}

export interface QuestCompletionConditions {
  type: QuestType;
  target: string;
  count?: number;
}

/** Full quest record returned to clients and stored in the DB. */
export interface GeneratedQuest {
  id: string;
  zoneId: string;
  playerLevelBucket: number;
  questType: QuestType;
  /** Faction that issued this quest — used for reputation awards on completion. */
  factionId: string | null;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  dialogue: QuestDialogue;
  completionConditions: QuestCompletionConditions;
  cacheKey: string;
  generatedAt: string; // ISO timestamp
  expiresAt: string;   // ISO timestamp
}

/** Context fed to the LLM when generating a quest. */
export interface QuestGenerationContext {
  zoneId: string;
  zoneName: string;
  zoneBiome: string;
  zoneDescription: string;
  playerLevel: number;
  levelBucket: number;
  questType: QuestType;
  enemyTypes: string[];
  factionId: string | null;
  factionName: string | null;
  /** Player's current standing with this faction ("neutral", "friendly", etc.) */
  playerStanding: string | null;
  /** Up to 3 prior NPC interaction summaries for memory continuity. */
  npcMemory?: string[];
  /** Active season name + story prompt template for seasonal theming. */
  seasonName?: string | null;
  seasonTheme?: string | null;
  /** Whether this quest belongs to a chain and the chain's overarching theme. */
  chainTheme?: string | null;
  /** Step number within the chain (1-indexed). */
  chainStep?: number;
  chainTotalSteps?: number;
}

/** Extended quest with chain metadata. */
export interface GeneratedQuestWithChain extends GeneratedQuest {
  chainId?:         string;
  chainStep?:       number;
  chainTotalSteps?: number;
  chainTitle?:      string;
}
