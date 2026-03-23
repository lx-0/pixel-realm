/**
 * Hand-crafted fallback quests.
 *
 * Served when the LLM is unavailable or rate-limited AND no cached quest
 * exists in the database.  One fallback per zone × quest-type pair ensures
 * every zone always has at least one quest to offer.
 */

import type { QuestType } from "./types";
import type { RawQuestData } from "./generate";

// A fallback record without rewards (rewards are computed by calcRewards).
type FallbackRecord = {
  zoneId: string;
  questType: QuestType;
  title: string;
  description: string;
  objectives: RawQuestData["objectives"];
  dialogue: RawQuestData["dialogue"];
  completionConditions: RawQuestData["completionConditions"];
};

const FALLBACKS: FallbackRecord[] = [
  // ── Zone 1 — Verdant Hollow (Forest) ───────────────────────────────────────
  {
    zoneId: "zone1",
    questType: "kill",
    title: "Slime Infestation",
    description: "Slimes have been multiplying and are blocking the forest paths. Help thin their numbers!",
    objectives: [{ type: "kill", target: "slime", count: 5, description: "Defeat 5 slimes in Verdant Hollow" }],
    dialogue: {
      greeting: "Traveler, our paths are overrun with slimes. Could you help clear a few out?",
      acceptance: "Wonderful! The forest folk will be very grateful.",
      completion: "The paths are clear again — you have our deepest thanks!",
    },
    completionConditions: { type: "kill", target: "slime", count: 5 },
  },
  {
    zoneId: "zone1",
    questType: "fetch",
    title: "Mossy Mushroom Hunt",
    description: "A rare mossy mushroom grows deep in the hollow. The village healer needs one urgently.",
    objectives: [{ type: "fetch", target: "mossy mushroom", count: 1, description: "Find a mossy mushroom in Verdant Hollow" }],
    dialogue: {
      greeting: "I need a mossy mushroom for my remedy — could you gather one from the hollow?",
      acceptance: "Be careful out there; slimes lurk nearby!",
      completion: "A perfect specimen! My remedy will be ready by morning. Thank you!",
    },
    completionConditions: { type: "fetch", target: "mossy mushroom", count: 1 },
  },
  {
    zoneId: "zone1",
    questType: "explore",
    title: "The Ancient Glade",
    description: "Legends speak of an ancient glade hidden deep in Verdant Hollow. Go find it!",
    objectives: [{ type: "explore", target: "ancient glade", description: "Discover the ancient glade in Verdant Hollow" }],
    dialogue: {
      greeting: "My grandfather told stories of a hidden glade in these woods. Would you look for it?",
      acceptance: "Follow the moss-covered stones east — they'll guide you.",
      completion: "You found it! The elders will be thrilled. Here's a reward for your curiosity.",
    },
    completionConditions: { type: "explore", target: "ancient glade" },
  },
  {
    zoneId: "zone1",
    questType: "escort",
    title: "Safe Passage",
    description: "A young herbalist needs to cross Verdant Hollow but fears the mushroom creeps. Escort her safely.",
    objectives: [{ type: "escort", target: "herbalist Lina", description: "Escort herbalist Lina through Verdant Hollow" }],
    dialogue: {
      greeting: "Please, could you walk with me? Those mushroom creeps have been very active lately.",
      acceptance: "Thank you! I'll follow your lead — just stay close!",
      completion: "We made it! I couldn't have done it without you. Please take this as thanks.",
    },
    completionConditions: { type: "escort", target: "herbalist Lina" },
  },
  {
    zoneId: "zone1",
    questType: "puzzle",
    title: "The Mossy Riddle Stones",
    description: "Ancient riddle stones have appeared in the hollow. Solve the moss-covered puzzle to unlock the forest's secret.",
    objectives: [{ type: "puzzle", target: "riddle stones", description: "Solve the riddle stones puzzle in Verdant Hollow" }],
    dialogue: {
      greeting: "Strange stones with runes appeared overnight. Can you figure out what they mean?",
      acceptance: "The carvings seem to tell a story — read them in order!",
      completion: "Incredible! You solved the ancient riddle. The forest thanks you.",
    },
    completionConditions: { type: "puzzle", target: "riddle stones" },
  },

  // ── Zone 2 — Dusty Trail (Plains / Desert) ─────────────────────────────────
  {
    zoneId: "zone2",
    questType: "kill",
    title: "Beetle Roundup",
    description: "Giant beetles have been harassing caravans on the Dusty Trail. Drive them away!",
    objectives: [{ type: "kill", target: "beetle", count: 5, description: "Defeat 5 beetles on the Dusty Trail" }],
    dialogue: {
      greeting: "Those blasted beetles keep attacking our wagons. Can you deal with a few?",
      acceptance: "Show those beetles who owns this trail!",
      completion: "The caravans are safe again. You have my thanks and this reward!",
    },
    completionConditions: { type: "kill", target: "beetle", count: 5 },
  },
  {
    zoneId: "zone2",
    questType: "fetch",
    title: "Canyon Herb Run",
    description: "Sun-dried canyon herbs are scattered across the trail. Collect some for the traveling merchant.",
    objectives: [{ type: "fetch", target: "canyon herb", count: 3, description: "Collect 3 canyon herbs on Dusty Trail" }],
    dialogue: {
      greeting: "I pay well for canyon herbs. Mind gathering some while you're out there?",
      acceptance: "They grow near the canyon walls — look for yellow-tipped leaves.",
      completion: "Excellent quality! Here's your payment — fair and square.",
    },
    completionConditions: { type: "fetch", target: "canyon herb", count: 3 },
  },
  {
    zoneId: "zone2",
    questType: "explore",
    title: "Scout the Canyon",
    description: "Nobody has checked the far end of the canyon in weeks. Make sure it's still safe for travelers.",
    objectives: [{ type: "explore", target: "canyon overlook", description: "Reach the canyon overlook on Dusty Trail" }],
    dialogue: {
      greeting: "We need someone to scout the far canyon. Too many bandits spotted lately.",
      acceptance: "Stay sharp out there. Report back once you reach the overlook!",
      completion: "Good intel — no major threats for now. Here's your pay.",
    },
    completionConditions: { type: "explore", target: "canyon overlook" },
  },
  {
    zoneId: "zone2",
    questType: "escort",
    title: "Caravan Guard",
    description: "A small supply caravan needs safe escort through the bandit-patrolled Dusty Trail.",
    objectives: [{ type: "escort", target: "supply caravan", description: "Escort the supply caravan through Dusty Trail" }],
    dialogue: {
      greeting: "Our regular guard fell ill. Could you escort our caravan through the trail?",
      acceptance: "Wonderful! Watch out for bandits near the canyon walls.",
      completion: "We made it through in one piece! The traders are in your debt.",
    },
    completionConditions: { type: "escort", target: "supply caravan" },
  },
  {
    zoneId: "zone2",
    questType: "puzzle",
    title: "The Dusty Sundial",
    description: "An ancient sundial near the oasis has stopped working. Realign its pieces to restore it.",
    objectives: [{ type: "puzzle", target: "ancient sundial", description: "Realign the sundial pieces near the Dusty Trail oasis" }],
    dialogue: {
      greeting: "This sundial once guided caravans — can you restore it?",
      acceptance: "The pieces are scattered nearby. Try matching the shadow markers!",
      completion: "It works again! Caravans will find their way safely now. Thank you!",
    },
    completionConditions: { type: "puzzle", target: "ancient sundial" },
  },

  // ── Zone 3 — Ironveil Ruins (Dungeon) ──────────────────────────────────────
  {
    zoneId: "zone3",
    questType: "kill",
    title: "Wraith Warding",
    description: "Wraiths haunt the old archive tower. Banish several to restore peace to the ruins.",
    objectives: [{ type: "kill", target: "wraith", count: 4, description: "Banish 4 wraiths in Ironveil Ruins" }],
    dialogue: {
      greeting: "The wraiths grow bolder each night. Would you help banish a few?",
      acceptance: "Your courage is appreciated. May light guide your path!",
      completion: "The archive feels quieter already. Take this reward — you've earned it.",
    },
    completionConditions: { type: "kill", target: "wraith", count: 4 },
  },
  {
    zoneId: "zone3",
    questType: "fetch",
    title: "Lost Tome Recovery",
    description: "A precious tome was lost somewhere in the ruins. The scholars need it returned.",
    objectives: [{ type: "fetch", target: "ancient tome", count: 1, description: "Recover the ancient tome from Ironveil Ruins" }],
    dialogue: {
      greeting: "Our most precious tome was scattered during the last golem incident. Please find it!",
      acceptance: "It has a green cover with silver runes — you'll recognise it.",
      completion: "You found it! This tome is irreplaceable. Here is your well-earned reward.",
    },
    completionConditions: { type: "fetch", target: "ancient tome", count: 1 },
  },
  {
    zoneId: "zone3",
    questType: "explore",
    title: "Map the Lower Archive",
    description: "The lower archive is unmapped and dangerous. Brave explorers are needed to chart it.",
    objectives: [{ type: "explore", target: "lower archive", description: "Reach the lower archive in Ironveil Ruins" }],
    dialogue: {
      greeting: "We need a brave soul to map the lower archive. Are you up for the task?",
      acceptance: "Take this lantern — the lower levels are very dark.",
      completion: "Remarkable! Your map will help the scholars enormously. Thank you.",
    },
    completionConditions: { type: "explore", target: "lower archive" },
  },
  {
    zoneId: "zone3",
    questType: "escort",
    title: "Scholar's Guardian",
    description: "A scholar wants to examine the golem chambers but cannot defend herself. Escort her safely.",
    objectives: [{ type: "escort", target: "scholar Mira", description: "Escort scholar Mira through Ironveil Ruins" }],
    dialogue: {
      greeting: "I must study the golems, but I'm no fighter. Would you be my guardian?",
      acceptance: "Excellent! Stay alert — golems can activate without warning.",
      completion: "My research is complete thanks to you! Please take this from the archives.",
    },
    completionConditions: { type: "escort", target: "scholar Mira" },
  },
  {
    zoneId: "zone3",
    questType: "puzzle",
    title: "The Runic Lock",
    description: "A runic lock seals the archive vault. Decode the mage's cipher to open it.",
    objectives: [{ type: "puzzle", target: "runic lock", description: "Solve the runic lock puzzle in Ironveil Ruins" }],
    dialogue: {
      greeting: "This vault has been sealed for a century. Can you decode the runic lock?",
      acceptance: "The symbols follow a pattern — study the wall carvings for clues.",
      completion: "The vault is open! Your sharp mind is a gift. Take something from inside.",
    },
    completionConditions: { type: "puzzle", target: "runic lock" },
  },

  // ── Zone 4 — Saltmarsh Harbor (Ocean / Coastal) ────────────────────────────
  {
    zoneId: "zone4",
    questType: "kill",
    title: "Crab Clearance",
    description: "Giant crabs have taken over the dockside. Help the fishers reclaim their pier.",
    objectives: [{ type: "kill", target: "crab", count: 5, description: "Defeat 5 crabs at Saltmarsh Harbor" }],
    dialogue: {
      greeting: "Those crabs pinched three of my workers today! Can you drive them off the pier?",
      acceptance: "Show them what happens when they mess with our harbor!",
      completion: "The pier is ours again! Here — you've more than earned this.",
    },
    completionConditions: { type: "kill", target: "crab", count: 5 },
  },
  {
    zoneId: "zone4",
    questType: "fetch",
    title: "Sunken Cargo Retrieval",
    description: "A storm sank a crate of supplies near the docks. Brave the shallows and retrieve it.",
    objectives: [{ type: "fetch", target: "sunken supply crate", count: 1, description: "Retrieve the sunken supply crate at Saltmarsh Harbor" }],
    dialogue: {
      greeting: "A crate of our finest goods sank in last night's storm. Could you fetch it?",
      acceptance: "It's in the shallows, not deep — watch out for wisps though!",
      completion: "Everything's intact! You've saved us a fortune. Here is your share.",
    },
    completionConditions: { type: "fetch", target: "sunken supply crate", count: 1 },
  },
  {
    zoneId: "zone4",
    questType: "explore",
    title: "Lighthouse Survey",
    description: "The old lighthouse hasn't been checked in weeks. Make sure it's still operational.",
    objectives: [{ type: "explore", target: "old lighthouse", description: "Reach the old lighthouse at Saltmarsh Harbor" }],
    dialogue: {
      greeting: "The lighthouse keeper hasn't signalled in days. Could you check on it?",
      acceptance: "Take the coastal path east — mind the tide!",
      completion: "All clear! The light is still burning. Ships will be safe tonight.",
    },
    completionConditions: { type: "explore", target: "old lighthouse" },
  },
  {
    zoneId: "zone4",
    questType: "escort",
    title: "Safe Harbor Run",
    description: "A young sailor needs to reach the far dock safely through corsair-infested waters.",
    objectives: [{ type: "escort", target: "sailor Finn", description: "Escort sailor Finn to the far dock at Saltmarsh Harbor" }],
    dialogue: {
      greeting: "The corsairs have been bold lately. Could you walk with me to the far dock?",
      acceptance: "I'll stay close — lead the way, brave one!",
      completion: "Made it! I'll buy you a warm meal next time I'm in port. Thank you!",
    },
    completionConditions: { type: "escort", target: "sailor Finn" },
  },
  {
    zoneId: "zone4",
    questType: "puzzle",
    title: "The Tide Compass",
    description: "A magical tide compass was disassembled by a curious wisp. Put it back together!",
    objectives: [{ type: "puzzle", target: "tide compass", description: "Reassemble the tide compass at Saltmarsh Harbor" }],
    dialogue: {
      greeting: "A wisp knocked apart my tide compass. Can you help me put it back together?",
      acceptance: "Each piece is magnetised — try following the arrows.",
      completion: "It's reading true north again! Perfect work. Here is your reward.",
    },
    completionConditions: { type: "puzzle", target: "tide compass" },
  },
];

/**
 * Returns a hand-crafted fallback quest for the given zone and quest type.
 *
 * Match priority:
 *   1. Exact zone + quest-type match
 *   2. Any quest in the same zone
 *   3. The first record in the list (absolute last resort)
 */
export function getFallbackQuest(
  zoneId: string,
  questType: QuestType,
): Omit<RawQuestData, "rewards"> {
  const match =
    FALLBACKS.find((f) => f.zoneId === zoneId && f.questType === questType) ??
    FALLBACKS.find((f) => f.zoneId === zoneId) ??
    FALLBACKS[0];

  // Strip the zoneId / questType index fields — caller only needs quest data
  const { zoneId: _z, questType: _qt, ...data } = match;
  return data;
}
