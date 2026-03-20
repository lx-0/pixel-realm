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

export interface QuestDialogue {
  greeting: string;    // NPC opening line when player approaches
  acceptance: string;  // NPC response after player accepts
  completion: string;  // NPC response when player returns having finished
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
}
