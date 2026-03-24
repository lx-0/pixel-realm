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
      choices: [
        { id: "accept", label: "I'll handle those slimes right away!", response: "Wonderful! The forest folk will be very grateful.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How many slimes are we talking?", response: "Oh, about five should make a real difference. They cluster near the east path.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Sorry, I'm a bit busy right now.", response: "I understand. Safe travels — and watch your step on the slippery paths!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Of course, I'll find one for you.", response: "Be careful out there — slimes lurk nearby, but the mushrooms are worth it!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Where do these mushrooms grow?", response: "Look for glowing green patches near the old oak roots — they prefer the shade.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Foraging isn't really my thing.", response: "No worries, traveler. Perhaps another adventurer will pass by soon.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "An ancient glade? I'd love to find it!", response: "Follow the moss-covered stones heading east — they'll lead you true.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What's so special about this glade?", response: "Legend says ancient magic still lingers there, keeping the trees alive for centuries.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Exploring isn't for me today.", response: "Another time, perhaps. The forest will still hold its secrets.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Stay close — I'll keep you safe.", response: "Oh, thank you so much! I'll follow right behind you.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How dangerous are these mushroom creeps?", response: "They're startling more than truly dangerous, but they move in groups. Best not to face them alone.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I'm heading the other direction, sorry.", response: "Oh dear. I'll wait a little longer then. Travel safe!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Riddles are my specialty — I'll solve it!", response: "Wonderful! The carvings seem to tell a story — read them in the order they glow.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What kind of runes are they?", response: "They look like old nature-script. The forest sprites used it ages ago to mark sacred places.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Ancient runes are beyond me, I'm afraid.", response: "No shame in that! Maybe a scholar will wander by. Thank you anyway.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Beetles won't bother your wagons anymore.", response: "That's what I like to hear! Show them who owns this trail!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How big are these beetles exactly?", response: "Big enough to knock a crate off a wagon. Five ought to scatter the rest if you deal with them firmly.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Bug-hunting isn't really my forte.", response: "Fair enough. I'll put the word out to the next passing guard.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Sure, I'll grab some herbs for you.", response: "Splendid! Look near the canyon walls for yellow-tipped leaves — can't miss them.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What do you use canyon herbs for?", response: "Spice trade, mostly. They fetch a fine price in the city. Three bundles is all I need.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I'm not really a forager.", response: "No trouble. Another traveler may oblige. Safe trails to you!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll scout the canyon overlook for you.", response: "Stay sharp out there! Report back once you've reached the overlook.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What exactly am I looking for up there?", response: "Bandit camps, blocked paths, anything unusual. Just eyes on the terrain is enough.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Scouting is a bit risky for me today.", response: "Understood. I'll ask around for someone else. Keep your wits about you regardless.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll guard your caravan through safely.", response: "Wonderful! Keep your eyes on the canyon walls — that's where they like to hide.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How many guards are already with you?", response: "Just me and old Bertram the driver. We really could use a third pair of eyes.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I'm travelling light and fast, sorry.", response: "We'll manage somehow. Thank you for hearing us out, at least.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll put the sundial back together.", response: "Excellent! The pieces are scattered nearby — match them to the shadow markers on the base.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why does a sundial matter so much here?", response: "Caravans used it to navigate by sun position. Without it, they lose hours crossing the trail.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Puzzles aren't my strong suit.", response: "No worries. Maybe a clever merchant will figure it out eventually.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll banish those wraiths for you.", response: "Your courage honours us. May light guide your every step!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What's causing the wraiths to appear?", response: "We believe an old seal in the lower vault is broken. For now, reducing their numbers helps enormously.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Wraiths are a bit beyond my comfort.", response: "Understandable. They are fearsome. Stay safe in these halls, traveler.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll recover the tome from the ruins.", response: "Bless you! It has a green cover with silver runes — you'll know it the moment you see it.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Where did the golem incident happen?", response: "Near the eastern chamber. The tome was last seen near the reading alcove before the chaos began.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The ruins sound too dangerous for me.", response: "Stay safe then. Knowledge must wait if safety is at risk. Farewell.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll map the lower archive for you.", response: "Splendid! Take this lantern — the lower levels are very dark indeed.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What dangers lurk in the lower archive?", response: "Wraiths, collapsed floors, old golem sentinels. But nothing a careful explorer can't navigate.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Unmapped dungeons aren't for me.", response: "Wisdom is knowing one's limits. Be well, traveler.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll protect you through the ruins.", response: "Wonderful! Stay alert — golems can activate without warning. I'll be quick, I promise.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What are you hoping to discover?", response: "The activation patterns of the old sentinel golems. Understanding them could prevent future incidents.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Golem chambers sound too perilous.", response: "A measured response. I'll seek a more seasoned escort. Take care!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "A runic cipher? I'll crack it open.", response: "Brilliant! The symbols follow a sequence — study the wall carvings near the entrance for clues.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who sealed this vault originally?", response: "Archmage Velthor sealed it three centuries ago. The key was lost, so the cipher is all that remains.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Ancient ciphers are beyond my skill.", response: "Perhaps a scholar will take interest. Thank you for looking, at least.", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll drive those crabs off your pier.", response: "Ha! Show them what happens when they mess with our harbor! Five ought to send them packing.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How big are these crabs?", response: "Big as a barrel! They snap through ropes like thread. Five of them are terrorising the whole dock.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Giant crabs are a bit much for me.", response: "Fair enough. I'll post a notice for a bounty hunter. Mind your fingers at the docks!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll dive in and grab that crate for you.", response: "You're a lifesaver! It's in the shallows, just off the north dock — watch out for wisps!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What was in the crate?", response: "Salted provisions and a dozen bottles of highland spice. Worth a pretty coin — hence the urgency.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Wading into the sea isn't for me.", response: "Understandable. The wisps make it a bit treacherous. I'll manage somehow. Safe travels!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll check on the lighthouse for you.", response: "Wonderful! Take the coastal path east — and mind the tide, it rises quick out there.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "When did you last hear from the keeper?", response: "Three days past. Old Marta is reliable — silence from her worries me greatly.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The coastal path is too risky for me.", response: "I hope someone checks soon. Ships are counting on that light. Stay safe!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "Stick with me — I'll get you there safely.", response: "Oh, thank you! I'll stay right at your heels — just lead the way!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How bold have the corsairs been lately?", response: "They robbed a fisherman in broad daylight yesterday! Numbers in groups keeps them at bay.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I need to head the other way, sorry.", response: "It's alright. I'll wait for a larger group heading that way. Be safe out there!", outcome: "decline", repDelta: 0 },
      ],
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
      choices: [
        { id: "accept", label: "I'll reassemble the compass for you.", response: "Perfect! Each piece is magnetised — just follow where the arrows point and they'll click into place.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What does a tide compass actually do?", response: "It reads both sea currents and magnetic north. Sailors use it to navigate even in dense fog.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Mechanical puzzles aren't my strength.", response: "No bother! I'll puzzle it out myself eventually. Bon voyage, traveler!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "tide compass" },
  },

  // ── Zone 5 — Ice Caverns (Ice / Cave) ──────────────────────────────────────
  {
    zoneId: "zone5",
    questType: "kill",
    title: "Frost Wolf Cull",
    description: "Frost wolves have been ambushing travellers near the cavern entrance. Drive them back.",
    objectives: [{ type: "kill", target: "frost_wolf", count: 5, description: "Defeat 5 frost wolves in the Ice Caverns" }],
    dialogue: {
      greeting: "Those frost wolves have been hunting in packs again. Could you thin their numbers?",
      acceptance: "Watch out — they're fast and their bite freezes you solid.",
      completion: "The pack is broken! The pass should be safe again. Here, take this.",
      choices: [
        { id: "accept", label: "I'll drive those wolves off.", response: "Be careful — they hunt in pairs and their bite will freeze you solid.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How many are in the pack?", response: "At least five, maybe more. They roam the upper tunnels near the icefall.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Those wolves sound too dangerous.", response: "I understand. Perhaps when you're better equipped. Safe travels!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "frost_wolf", count: 5 },
  },
  {
    zoneId: "zone5",
    questType: "fetch",
    title: "Glacial Shard Collection",
    description: "A researcher needs glacial shards that form deep in the caverns. Help gather some.",
    objectives: [{ type: "fetch", target: "glacial shard", count: 3, description: "Collect 3 glacial shards from the Ice Caverns" }],
    dialogue: {
      greeting: "The glacial shards form only in the deep tunnels. Could you bring me three?",
      acceptance: "They glow faintly blue — hard to miss against the dark ice.",
      completion: "Perfect specimens! These will fund my research for months. My thanks!",
      choices: [
        { id: "accept", label: "I'll gather those shards for you.", response: "Wonderful! They glow faintly blue against the dark ice — hard to miss.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What are you researching?", response: "The resonance between glacial ice and magical energy. It could revolutionise cold-forging.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The deep tunnels are too far for me.", response: "No matter. I'll wait for the next brave soul. Stay warm!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "glacial shard", count: 3 },
  },
  {
    zoneId: "zone5",
    questType: "explore",
    title: "The Frozen Archive",
    description: "Legends speak of an ancient archive sealed in ice. Find it deep in the caverns.",
    objectives: [{ type: "explore", target: "frozen archive", description: "Discover the frozen archive in the Ice Caverns" }],
    dialogue: {
      greeting: "The old maps show a library sealed in ice centuries ago. Would you look for it?",
      acceptance: "Follow the blue veins in the ice wall — they lead deeper into the mountain.",
      completion: "You found it! The knowledge in those frozen tomes is priceless. Well done!",
      choices: [
        { id: "accept", label: "An archive sealed in ice? I'll find it.", response: "Follow the blue veins in the ice wall — they spiral toward the mountain's heart.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What knowledge is in this archive?", response: "Ancient cold-magic formulae, sealed away before the great frost. Invaluable stuff.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Exploring deep caves isn't for me.", response: "Another time, perhaps. The archive has waited centuries — it can wait a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "frozen archive" },
  },
  {
    zoneId: "zone5",
    questType: "escort",
    title: "Expedition Safe Return",
    description: "A wounded scout needs to reach the cavern exit before the ice elementals regroup.",
    objectives: [{ type: "escort", target: "scout Rylan", description: "Escort scout Rylan to the Ice Caverns exit" }],
    dialogue: {
      greeting: "My leg is frozen stiff. Could you help me reach the exit before those elementals return?",
      acceptance: "I'll keep up as best I can — just keep them off me!",
      completion: "Made it! I owe you my life. Take whatever I have — it's yours.",
      choices: [
        { id: "accept", label: "Lean on me — we'll get you out.", response: "Thank you! I'll keep up as best I can. Just keep those elementals at bay!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How badly are you hurt?", response: "The frost-bite has slowed me down badly. I can move, but slowly.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't risk slowing down for you.", response: "I understand. I'll rest here and hope the cold isn't too cruel.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "scout Rylan" },
  },
  {
    zoneId: "zone5",
    questType: "puzzle",
    title: "The Crystal Resonance",
    description: "A magical crystal array has locked the inner vault. Tune the crystals to the correct frequency.",
    objectives: [{ type: "puzzle", target: "crystal array", description: "Tune the crystal array in the Ice Caverns" }],
    dialogue: {
      greeting: "This crystal array controls the inner vault. Can you tune it to the right frequency?",
      acceptance: "Strike the crystals in order from smallest to largest. They'll hum when correct.",
      completion: "The vault is open! The resonance was perfect. Here is your reward.",
      choices: [
        { id: "accept", label: "I'll tune those crystals for you.", response: "Strike them smallest to largest — each will hum when correctly tuned.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What's inside the vault?", response: "Old relics from the glacial mages. Dangerous, but very valuable to the right people.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Crystal puzzles are beyond me.", response: "No matter. I'll find another way in eventually. Thank you for looking!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "crystal array" },
  },

  // ── Zone 6 — Volcanic Highlands (Volcanic) ──────────────────────────────────
  {
    zoneId: "zone6",
    questType: "kill",
    title: "Lava Slime Purge",
    description: "Lava slimes have been blocking the highland paths and burning everything they touch. Clear them out.",
    objectives: [{ type: "kill", target: "lava_slime", count: 5, description: "Defeat 5 lava slimes in the Volcanic Highlands" }],
    dialogue: {
      greeting: "Those lava slimes are destroying everything — they leave trails of fire wherever they go!",
      acceptance: "Hit them hard and fast. Staying close too long will burn you.",
      completion: "The paths are clear! We can finally move supplies through again. Thank you!",
      choices: [
        { id: "accept", label: "I'll clear those lava slimes out.", response: "Hit them fast — staying too close to their burning trails will roast you.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How dangerous are these slimes?", response: "They leave trails of molten rock and their touch burns through armour. Very dangerous.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Molten slimes are a bit much for me.", response: "I understand. I'll find another way around. Stay cool out there!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "lava_slime", count: 5 },
  },
  {
    zoneId: "zone6",
    questType: "fetch",
    title: "Magma Core Sample",
    description: "A forge-master needs raw magma cores from deep in the highlands to craft fire-resistant armour.",
    objectives: [{ type: "fetch", target: "magma core", count: 3, description: "Collect 3 magma cores from the Volcanic Highlands" }],
    dialogue: {
      greeting: "The best armour needs magma cores — they harden to something stronger than iron. Bring me three?",
      acceptance: "They glow orange near active vents. Use tongs if you have them!",
      completion: "These are perfect! I'll have fire-resistant armour ready by morning. Here's your payment.",
      choices: [
        { id: "accept", label: "I'll gather those magma cores for you.", response: "They glow bright orange near active vents. Handle carefully — they're hot as the forge itself!", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What makes magma cores special?", response: "When cooled and worked, they become harder than steel and naturally resist heat. Perfect for armour.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Lava fields are too risky for me.", response: "Fair enough. I'll try to source them another way. Safe travels!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "magma core", count: 3 },
  },
  {
    zoneId: "zone6",
    questType: "explore",
    title: "The Ancient Forge",
    description: "Legends say a great forge predating the current age is hidden in the highland caldera. Find it.",
    objectives: [{ type: "explore", target: "ancient forge", description: "Discover the ancient forge in the Volcanic Highlands" }],
    dialogue: {
      greeting: "The old records mention a primordial forge in the caldera. Would you find it for me?",
      acceptance: "Follow the heat — the temperature rises as you approach. Trust your instincts.",
      completion: "You found it! The craftsmanship is unlike anything I've seen. This changes everything!",
      choices: [
        { id: "accept", label: "An ancient forge? I'll find it.", response: "Follow the heat — the temperature rises steadily as you get closer. Trust your instincts.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who built this forge?", response: "No one knows. The stonework predates all known civilisations. Very mysterious.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "That caldera sounds far too dangerous.", response: "Perhaps another time. The forge has waited millennia — it can wait a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "ancient forge" },
  },
  {
    zoneId: "zone6",
    questType: "escort",
    title: "Researcher Rescue",
    description: "The Volcanic Researcher got cut off by a lava flow. Escort them safely back to camp.",
    objectives: [{ type: "escort", target: "Volcanic Researcher", description: "Escort the Volcanic Researcher to base camp" }],
    dialogue: {
      greeting: "The lava flows cut off my retreat! Could you help me get back to base camp?",
      acceptance: "I know a route around the active vents — follow me and I'll guide you.",
      completion: "We made it! I thought I was finished back there. Here — take everything in my pack.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you to camp.", response: "Thank goodness! Follow me around the active vents — it's longer but much safer.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How far is base camp?", response: "Perhaps ten minutes if we avoid the main lava channels. The fire imps are the real problem.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't take the detour right now.", response: "I understand. I'll find another way. Be careful around those lava flows!", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Volcanic Researcher" },
  },
  {
    zoneId: "zone6",
    questType: "puzzle",
    title: "The Infernal Seal",
    description: "An infernal seal blocks the path to the Warden's sanctum. Solve the fire-rune puzzle to break it.",
    objectives: [{ type: "puzzle", target: "infernal seal", description: "Unlock the infernal seal in the Volcanic Highlands" }],
    dialogue: {
      greeting: "That infernal seal is blocking the sanctum path. Do you think you can break it?",
      acceptance: "The fire runes must be activated in sequence. Red first, then orange, then white.",
      completion: "The seal is broken! Your understanding of fire-runes is impressive. Here's your reward.",
      choices: [
        { id: "accept", label: "I'll break that seal open.", response: "The fire runes activate in sequence — red first, then orange, then the white core rune.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What is behind the seal?", response: "The Infernal Warden's sanctum. The seal was placed to keep intruders out — and the Warden in.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Fire puzzles are beyond my expertise.", response: "No matter. The seal will wait. Perhaps you'll be back once you've faced the highlands more.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "infernal seal" },
  },

  // ── Zone 7 — Shadowmire Swamp (Swamp) ────────────────────────────────────────
  {
    zoneId: "zone7",
    questType: "kill",
    title: "Bog Crawler Cull",
    description: "Bog crawlers have overrun the swamp paths, making travel near impossible. Thin their numbers.",
    objectives: [{ type: "kill", target: "bog_crawler", count: 5, description: "Defeat 5 bog crawlers in the Shadowmire Swamp" }],
    dialogue: {
      greeting: "Those bog crawlers are everywhere — you can't take three steps without one snapping at your heels!",
      acceptance: "They're tough, but slow. Get in fast and hit hard before they drag you into the mire.",
      completion: "The paths are clear! I haven't seen that many gone at once. You've done us a real service.",
      choices: [
        { id: "accept", label: "I'll clear out those bog crawlers.", response: "They're tough but slow — stay light on your feet and strike before they drag you into the mud.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What makes bog crawlers dangerous?", response: "Their grip. Once they latch on, they drag you under. Keep moving and don't let them surround you.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The swamp is too risky for me right now.", response: "I understand. Travel safe — stay to the higher ground where the fog is thinner.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "bog_crawler", count: 5 },
  },
  {
    zoneId: "zone7",
    questType: "fetch",
    title: "Swamp Root Harvest",
    description: "An alchemist needs rare swamp roots for a powerful antidote. Collect them from deep in the mire.",
    objectives: [{ type: "fetch", target: "swamp root", count: 4, description: "Collect 4 swamp roots from the Shadowmire" }],
    dialogue: {
      greeting: "I need swamp roots from the deep mire — they only grow where the fog is thickest. Risky, but I'll pay well.",
      acceptance: "They glow faint green in the dark. Dig fast — the wraiths do not like anyone disturbing their grounds.",
      completion: "Four perfect roots! This antidote will save lives. I can't thank you enough.",
      choices: [
        { id: "accept", label: "I'll fetch those swamp roots for you.", response: "They glow faint green even in the dark fog. Get them fast — the wraiths patrol that area.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What is the antidote for?", response: "The swamp's toxic toads have been poisoning the water supply. This antidote will cure the afflicted.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The deep mire is beyond me.", response: "No matter. Stay safe — the outer swamp is dangerous enough.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "swamp root", count: 4 },
  },
  {
    zoneId: "zone7",
    questType: "explore",
    title: "The Sunken Shrine",
    description: "Old maps show a sunken shrine hidden in the deepest part of the Shadowmire. Find it before it sinks further.",
    objectives: [{ type: "explore", target: "sunken shrine", description: "Discover the sunken shrine in the Shadowmire Swamp" }],
    dialogue: {
      greeting: "My grandfather's maps mark a sunken shrine somewhere in the deepest mire. Would you find it? It could answer many questions.",
      acceptance: "Follow the fireflies — they seem drawn to old magic. Don't stray from the firm ground.",
      completion: "You found it! The stonework matches the old maps exactly. This changes our understanding of the swamp's history.",
      choices: [
        { id: "accept", label: "I'll find the sunken shrine.", response: "Follow the fireflies — the old stories say they're drawn to ancient magic. Trust them over the paths.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who built the shrine?", response: "Unknown. The stonework predates any known swamp settlement. Perhaps those the Mire Queen once served.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The deep mire is too dangerous.", response: "I feared as much. The shrine may remain lost for another generation.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "sunken shrine" },
  },
  {
    zoneId: "zone7",
    questType: "escort",
    title: "Lost in the Mire",
    description: "A swamp herbalist got turned around in the fog. Escort them safely back to the settlement.",
    objectives: [{ type: "escort", target: "Swamp Herbalist", description: "Escort the Swamp Herbalist back to the settlement" }],
    dialogue: {
      greeting: "The fog came in fast and I lost the path completely. Could you guide me back? I know these plants, not these paths.",
      acceptance: "Stay close — the mire plays tricks on the eyes. What looks like solid ground often isn't.",
      completion: "Home at last! I thought I'd be wandering until the wraiths found me. You've saved my life.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you back safely.", response: "Thank the roots you found me! The fog distorts everything. I'll follow your lead.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "How long have you been lost?", response: "Since midday. The swamp wraiths kept driving me deeper. I daren't stop moving.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I understand. I'll try to wait out the fog here. Please — if you see anyone else, send them my way.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Swamp Herbalist" },
  },
  {
    zoneId: "zone7",
    questType: "puzzle",
    title: "The Mire Seal",
    description: "An ancient ward seals the passage to the Mire Queen's lair. Solve the toad-rune puzzle to break it.",
    objectives: [{ type: "puzzle", target: "mire seal", description: "Break the mire seal blocking the path to the Mire Queen" }],
    dialogue: {
      greeting: "The mire seal blocks the path forward. No blade can cut it — only those who understand the old runes can break it.",
      acceptance: "The toad runes must be pressed in the order of the seasons: growth, decay, sleep, then rebirth.",
      completion: "The seal crumbles! Your understanding of the swamp's old magic is remarkable. The path is clear.",
      choices: [
        { id: "accept", label: "I'll break the mire seal.", response: "The toad runes activate in seasonal order — growth, decay, sleep, rebirth. Don't rush it.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who placed this seal?", response: "The Mire Queen herself, long ago — to keep the outside world from her domain. Now she uses it to trap others inside.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Ancient rune puzzles are beyond me.", response: "Perhaps another time. The seal will hold until you're ready to face what lies beyond.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "mire seal" },
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
