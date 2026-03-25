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
  {
    zoneId: "zone8",
    questType: "kill",
    title: "Frost Elemental Purge",
    description: "Frost elementals are shattering the highland pass, blocking all travel. Destroy them before the blizzard traps everyone.",
    objectives: [{ type: "kill", target: "frost_elemental", count: 5, description: "Destroy 5 frost elementals in the Frostpeak Highlands" }],
    dialogue: {
      greeting: "Those frost elementals appeared with the last storm and they haven't stopped freezing everything in sight!",
      acceptance: "They shatter when hit hard enough — but move fast, their ice blasts will slow you down.",
      completion: "The pass is clear! I saw you cutting through them like they were made of nothing. Remarkable.",
      choices: [
        { id: "accept", label: "I'll destroy those frost elementals.", response: "Strike fast and don't let their freeze shots land — they slow you to a crawl.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Where did they come from?", response: "The Frost Titan summons them. Defeat enough and you may weaken his hold over the highlands.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The highlands are too dangerous right now.", response: "I understand. The pass will remain frozen until someone stops them.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "frost_elemental", count: 5 },
  },
  {
    zoneId: "zone8",
    questType: "fetch",
    title: "Glacial Shards",
    description: "A highland smith needs glacial shards embedded in the summit ice to forge cold-resistant armour. Retrieve them before the wolves find you.",
    objectives: [{ type: "fetch", target: "glacial shard", count: 4, description: "Collect 4 glacial shards from the Frostpeak summit" }],
    dialogue: {
      greeting: "I need glacial shards — the pure kind, from the summit ice — to temper armour that can withstand the Titan's cold.",
      acceptance: "They catch the light like blue diamonds. Move quickly — the snow wolves hunt in packs up there.",
      completion: "Perfect shards! Pure as the summit itself. This armour will protect many lives against the Frost Titan.",
      choices: [
        { id: "accept", label: "I'll find those glacial shards for you.", response: "They catch the light — bright blue in the snow. The summit caves are your best bet, but watch for wolves.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are snow wolves so dangerous?", response: "Speed and pack tactics. They'll circle you and freeze you with their bite. Stay near the cliff walls.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The summit is beyond me.", response: "No shame in knowing your limits. Come back stronger.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "glacial shard", count: 4 },
  },
  {
    zoneId: "zone8",
    questType: "explore",
    title: "The Frozen Citadel",
    description: "Legends speak of a frozen citadel near the Frostpeak summit where the Frost Titan was first imprisoned. Find it.",
    objectives: [{ type: "explore", target: "frozen citadel", description: "Discover the frozen citadel at the Frostpeak summit" }],
    dialogue: {
      greeting: "My order's records mention a citadel frozen at the peak — built by those who imprisoned the Frost Titan. It must still be there.",
      acceptance: "Follow the ice archers — they nest near the citadel's walls. Look for carved stone beneath the frost.",
      completion: "You found it! The seal-runes are still intact. If we can read them, we may find the Titan's weakness.",
      choices: [
        { id: "accept", label: "I'll find the frozen citadel.", response: "The ice archers patrol its perimeter — follow their patrol routes inward. The carved stone beneath the frost will mark it.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who imprisoned the Frost Titan?", response: "An ancient order of warmage scholars. They paid dearly for it. Their knowledge sealed within the citadel may be our only hope.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The summit is too dangerous.", response: "The citadel has waited centuries. It can wait a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "frozen citadel" },
  },
  {
    zoneId: "zone8",
    questType: "escort",
    title: "Highland Scholar",
    description: "A scholar studying the Frost Titan's magic became separated from their expedition in the blizzard. Escort them to safety.",
    objectives: [{ type: "escort", target: "Highland Scholar", description: "Escort the Highland Scholar safely off the Frostpeak summit" }],
    dialogue: {
      greeting: "My instruments led me straight into a snow wolf den. I've been hiding here for hours — can you get me down safely?",
      acceptance: "I'll keep recording data as we move — this blizzard cycle is unprecedented. Just keep those wolves away.",
      completion: "Safe at last! My research survived — and with your protection, so did I. The Frost Titan's patterns are clearer now.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you out of here.", response: "Thank you! I'll keep to your left — I've mapped the patrol routes of the ice archers, I can guide us clear.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you studying?", response: "The Frost Titan's breath patterns — they match the blizzard cycle perfectly. He IS the blizzard, in a way.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll keep hiding then. Please — if you see another traveller, send them my way.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Highland Scholar" },
  },
  {
    zoneId: "zone8",
    questType: "puzzle",
    title: "The Titan's Ward",
    description: "An ancient ward of ice-runes bars the path to the Frost Titan's summit throne. Solve the constellation puzzle to shatter it.",
    objectives: [{ type: "puzzle", target: "titan ward", description: "Solve the ice-rune constellation puzzle to break the Titan's ward" }],
    dialogue: {
      greeting: "The Titan's ward is a puzzle of star-runes carved into the ice. No weapon can break it — only the correct sequence will.",
      acceptance: "The constellations must align: winter star, frost moon, glacier peak, then the void between — in that order.",
      completion: "The ward shatters! The path to the summit throne lies open. The Frost Titan cannot hide now.",
      choices: [
        { id: "accept", label: "I'll break the Titan's ward.", response: "The rune sequence mirrors the winter sky: winter star, frost moon, glacier peak, the void. Do not rush the final step.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this ward?", response: "The Frost Titan created it himself — to keep challengers away. That it can be broken at all is due to an ancient scholar's intervention.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Ancient rune puzzles are beyond me.", response: "The ward will hold until you understand the winter sky. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "titan ward" },
  },
  {
    zoneId: "zone9",
    questType: "kill",
    title: "Star Sentinel Purge",
    description: "Star sentinels are blasting the spire's lower platforms with stellar energy, sealing all ascent routes. Destroy them before the Arbiter calls more.",
    objectives: [{ type: "kill", target: "star_sentinel", count: 5, description: "Destroy 5 star sentinels on the Celestial Spire" }],
    dialogue: {
      greeting: "Those star sentinels appeared at dawn and haven't stopped firing. They'll seal off the entire spire if you don't act fast.",
      acceptance: "Their projectiles stun on contact — keep moving and don't let them line you up.",
      completion: "The sentinels are down! The platforms are accessible again. You made that look effortless.",
      choices: [
        { id: "accept", label: "I'll destroy the star sentinels.", response: "Stay mobile — they track movement patterns. Break line of sight behind the floating stones to avoid their stun blasts.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who commands these sentinels?", response: "The Celestial Arbiter. Defeat enough and you may disrupt his sentinel network — weakening his hold over the spire.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The spire is too dangerous right now.", response: "I understand. The platforms will remain sealed until someone stops them.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "star_sentinel", count: 5 },
  },
  {
    zoneId: "zone9",
    questType: "fetch",
    title: "Astral Crystals",
    description: "An arcanist needs astral crystals grown in the spire's upper reaches to calibrate a void-detection array. Retrieve them before the void mages harvest them all.",
    objectives: [{ type: "fetch", target: "astral crystal", count: 4, description: "Collect 4 astral crystals from the upper Celestial Spire" }],
    dialogue: {
      greeting: "Astral crystals — the pure kind, grown where starlight meets void energy — are exactly what I need to track the Arbiter's movements.",
      acceptance: "They pulse with a faint golden light. Move quickly — the void mages drain them to fuel their spells.",
      completion: "Perfect specimens! Still resonating. With these calibrated, I can predict the Arbiter's next conduit opening.",
      choices: [
        { id: "accept", label: "I'll retrieve those astral crystals.", response: "They cluster near the spire's star vents — look for the golden glow. But void mages patrol there, and they flee while shooting.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are void mages so dangerous?", response: "They strike from range and vanish before you close in. Their void bolts stun — if they land, you're helpless while the astral beasts close in.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The upper spire is beyond me.", response: "No shame in knowing your limits. Come back stronger.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "astral crystal", count: 4 },
  },
  {
    zoneId: "zone9",
    questType: "explore",
    title: "The Void Conduit",
    description: "Legends speak of a void conduit near the spire's apex — a rift the Celestial Arbiter uses to draw power from beyond the stars. Find it.",
    objectives: [{ type: "explore", target: "void conduit", description: "Discover the void conduit at the Celestial Spire apex" }],
    dialogue: {
      greeting: "My research points to a conduit near the apex — a tear in reality itself that feeds the Arbiter. It must still be open.",
      acceptance: "Follow the void mages — they gather near the conduit to recharge. Look for the shimmer where starlight bends unnaturally.",
      completion: "You found it! The conduit is larger than I feared. If we can seal it, we cut off the Arbiter's power source entirely.",
      choices: [
        { id: "accept", label: "I'll find the void conduit.", response: "The void mages orbit it — follow their patrol routes inward. The air distortion will mark it before you see the light.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who opened this conduit?", response: "The Celestial Arbiter himself, centuries ago. He has drawn power from it so long he may not survive its closure — which is exactly why we must try.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The apex is too dangerous.", response: "The conduit has pulsed for centuries. It can wait a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "void conduit" },
  },
  {
    zoneId: "zone9",
    questType: "escort",
    title: "Celestial Cartographer",
    description: "A cartographer mapping the spire's shifting platforms became separated from their team after an astral beast attack. Escort them to safety.",
    objectives: [{ type: "escort", target: "Celestial Cartographer", description: "Escort the Celestial Cartographer safely off the Celestial Spire" }],
    dialogue: {
      greeting: "An astral beast knocked me clean off the platform — I've been clinging to this ledge for an hour. Can you get me down safely?",
      acceptance: "I'll keep sketching as we move — these platform formations shift every few minutes. My maps may be our only way back.",
      completion: "Safe at last! My survey survived, and so did I. These platform charts will help future climbers reach the Arbiter — and come back.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you out of here.", response: "Thank you! I've mapped three platform cycles already — I can guide us between the astral beast patrols if you handle the sentinels.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you mapping?", response: "The spire's platform drift — they orbit the apex on a twelve-minute cycle. Understanding it is the key to reaching the Arbiter without triggering his sentinels.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll hold on then. If you see anyone else up here, please send them my way.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Celestial Cartographer" },
  },
  {
    zoneId: "zone9",
    questType: "puzzle",
    title: "The Arbiter's Seal",
    description: "An ancient celestial seal bars the path to the Arbiter's throne at the spire's apex. Align the star-rune constellation to shatter it.",
    objectives: [{ type: "puzzle", target: "arbiter seal", description: "Solve the star-rune constellation puzzle to break the Arbiter's seal" }],
    dialogue: {
      greeting: "The Arbiter's seal is carved in celestial runes — no weapon can break it, only the correct star alignment will open the path.",
      acceptance: "The constellations must align: dawn star, the void arc, twin moons, then the apex shard — in that order.",
      completion: "The seal shatters! The path to the throne lies open. The Celestial Arbiter cannot hide behind his wards any longer.",
      choices: [
        { id: "accept", label: "I'll break the Arbiter's seal.", response: "The rune sequence mirrors the celestial calendar: dawn star, void arc, twin moons, apex shard. Do not rush the final alignment.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this seal?", response: "The Arbiter created it himself — a failsafe against challengers. That it can be solved at all is an ancient scholar's gift to those brave enough to reach this height.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Celestial rune puzzles are beyond me.", response: "The seal will hold until you understand the star calendar. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "arbiter seal" },
  },
  {
    zoneId: "zone17",
    questType: "kill",
    title: "Twilight Sentinel Purge",
    description: "Twilight sentinels have locked down the citadel's outer gates, sealing escape routes between the light and shadow wings. Destroy them before the Twilight Warden completes his dimensional convergence ritual.",
    objectives: [{ type: "kill", target: "twilight_sentinel", count: 5, description: "Destroy 5 twilight sentinels in the Twilight Citadel" }],
    dialogue: {
      greeting: "Those sentinels appeared at every gate arch at once — they burn with dusk energy and won't let anyone through. If the Warden finishes his ritual, the whole citadel merges with the shadow dimension.",
      acceptance: "Their armor absorbs light-side energy, so strike from the shadow angles. Fast and hard before their dusk cores overheat and detonate.",
      completion: "The gates are clear! The convergence ritual has faltered. The Dusk Scholar will want to know — your work here may have bought us the time we need.",
      choices: [
        { id: "accept", label: "I'll destroy the twilight sentinels.", response: "They recharge near the amber pillars — pull them away from the light sources before engaging or their armor will regenerate faster than you can damage it.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who commands these sentinels?", response: "The Twilight Warden himself. They are living extensions of his convergence will — destroy enough and you fracture his grip on the citadel's dimensional anchor.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The citadel is too dangerous right now.", response: "Then the gates remain sealed. Return when you are strong enough to face what waits beyond them.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "twilight_sentinel", count: 5 },
  },
  {
    zoneId: "zone17",
    questType: "fetch",
    title: "Twilight Shards",
    description: "The Dusk Scholar needs twilight shards crystallised at the boundary between the light and shadow wings to calibrate a dimensional stabiliser. Retrieve them before rift stalkers phase them into the shadow dimension.",
    objectives: [{ type: "fetch", target: "twilight shard", count: 4, description: "Collect 4 twilight shards from the Twilight Citadel boundary chambers" }],
    dialogue: {
      greeting: "Twilight shards only form where the citadel's light half meets the shadow half — they're extraordinarily rare and exactly what I need to anchor my stabiliser array. I need four.",
      acceptance: "They glow amber and violet at once. Move quickly — rift stalkers phase through the boundary and drag them into the shadow wing to fuel their own existence.",
      completion: "Still oscillating at full resonance! Both light and shadow frequencies intact. With these I can begin stabilising the boundary before the Warden tears it open entirely.",
      choices: [
        { id: "accept", label: "I'll retrieve those twilight shards.", response: "Look for where the amber stonework meets the shadow-blackened walls — the shards cluster at those junctions. Rift stalkers phase in and out nearby; keep moving.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are rift stalkers so dangerous?", response: "They phase between dimensions on instinct, striking from angles you cannot guard. They always attack from the shadow side — keep an amber light source on you if you can.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The boundary chambers are too dangerous.", response: "The shards will keep their resonance a while longer. Come back stronger and I will still be here.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "twilight shard", count: 4 },
  },
  {
    zoneId: "zone17",
    questType: "explore",
    title: "The Warden's Convergence Chamber",
    description: "Deep within the Twilight Citadel lies the Warden's convergence chamber — the nexus point where he is merging the light and shadow dimensions into one. Locate it before the merger becomes irreversible.",
    objectives: [{ type: "explore", target: "convergence chamber", description: "Discover the Twilight Warden's convergence chamber in the depths of the Twilight Citadel" }],
    dialogue: {
      greeting: "My dimensional readings indicate a massive convergence point somewhere in the citadel's deepest level — a chamber where light and shadow are actively being fused. It must still be accessible.",
      acceptance: "Follow the echo wraiths — they drift toward the convergence to amplify their voices in both dimensions. Look for where the amber and violet light blend into white and reality itself shimmers.",
      completion: "You found it! The convergence chamber is far more advanced than my models predicted. If we can disrupt the dimensional weave here, the Warden loses his anchor for the merger entirely.",
      choices: [
        { id: "accept", label: "I'll find the Warden's convergence chamber.", response: "Echo wraiths orbit the chamber on irregular drift cycles. Track their echoes inward — the harmonic distortion will intensify as you close in.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What happens if the convergence finishes?", response: "The Twilight Citadel merges with the shadow dimension permanently — every soul here trapped between worlds, neither fully alive nor fully dead. It cannot be allowed.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The deep citadel is beyond my reach.", response: "The convergence has been building for centuries. A little longer will not matter — but do not wait too long.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "convergence chamber" },
  },
  {
    zoneId: "zone17",
    questType: "escort",
    title: "The Citadel Archivist",
    description: "A citadel archivist who mapped the boundary between the light and shadow wings became trapped when a rift stalker ambush collapsed the path behind them. Escort them to a stable light-side exit before the shadow wing expands.",
    objectives: [{ type: "escort", target: "Citadel Archivist", description: "Escort the Citadel Archivist safely out of the Twilight Citadel" }],
    dialogue: {
      greeting: "A rift stalker phased through the wall directly behind me — I barely escaped into this alcove. I've been watching the shadow wing creep closer for what feels like hours. Please, I need to reach the light side.",
      acceptance: "I'll keep sketching the boundary shifts as we move — the shadow wing advances in patterns. My notes could be the key to predicting where the Warden strikes next.",
      completion: "Solid amber stonework. Finally. My archive survived — the boundary shift diagrams I recorded will help the Dusk Scholar understand how the Warden is accelerating the convergence.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you to the light side.", response: "Thank you. I've mapped two boundary shifts already — I can guide us between echo wraith patrols if you handle the rift stalkers ahead.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you mapping?", response: "The boundary shift cycles — the shadow wing advances each time the Warden completes a convergence pulse. Understanding the rhythm is the key to disrupting it.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll hold this alcove as long as I can. If you find another route, please send help.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Citadel Archivist" },
  },
  {
    zoneId: "zone17",
    questType: "puzzle",
    title: "The Dusk Seal",
    description: "An ancient dusk seal bars the inner sanctum where the Twilight Warden performs his convergence ritual. Align the amber and violet rune sequence to shatter it and force a confrontation.",
    objectives: [{ type: "puzzle", target: "dusk seal", description: "Solve the dusk rune sequence to open the path to the Twilight Warden" }],
    dialogue: {
      greeting: "The Warden's seal is woven from dusk runes — equal parts light and shadow energy bound into a ward that no force alone can break. Only the correct resonance sequence will open the sanctum.",
      acceptance: "The dusk runes must align: amber anchor, shadow pulse, twilight convergence, then the dual null — light and shadow simultaneously, or the ward resets.",
      completion: "The seal shatters! The inner sanctum lies open. The Twilight Warden cannot complete his convergence ritual behind his dimensional wards any longer.",
      choices: [
        { id: "accept", label: "I'll break the Dusk Seal.", response: "The sequence mirrors the boundary resonance cycle: amber anchor, shadow pulse, twilight convergence, dual null. You must hold both light and shadow energies at the final step — do not let one overwhelm the other.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this seal?", response: "The Warden himself — it is a fragment of the dimensional boundary shaped into a ward. That it can be solved at all is because all boundary constructs must be passable from both sides, if you know the resonance key.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Dusk rune puzzles are beyond me.", response: "The seal will hold until you understand the boundary resonance. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "dusk seal" },
  },
  {
    zoneId: "zone16",
    questType: "kill",
    title: "Nexus Guardian Suppression",
    description: "Nexus guardians are sealing the dimensional conduits, cutting off all retreat paths. Destroy them before the Overseer locks down the entire nexus.",
    objectives: [{ type: "kill", target: "nexus_guardian", count: 5, description: "Destroy 5 nexus guardians in the Ethereal Nexus" }],
    dialogue: {
      greeting: "Those nexus guardians appeared at the conduit junctions and they haven't stopped sealing exits. We'll be trapped here if you don't act now.",
      acceptance: "Their energy fields freeze on contact — strike fast and pull back before they can lock onto you.",
      completion: "The guardians are down! The conduits are open again. That was precise work — the Dimensional Weaver will want to hear of this.",
      choices: [
        { id: "accept", label: "I'll destroy the nexus guardians.", response: "Stay aggressive — they absorb energy over time and grow more resilient. Hit them before their shields cycle back up.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who commands these guardians?", response: "The Nexus Overseer. They are extensions of his will — destroy enough and you disrupt his dimensional lock on this zone entirely.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The nexus is too dangerous right now.", response: "The conduits will remain sealed then. Return when you are ready.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "nexus_guardian", count: 5 },
  },
  {
    zoneId: "zone16",
    questType: "fetch",
    title: "Nexus Crystals",
    description: "The Dimensional Weaver needs nexus crystals from the deepest conduit chambers to calibrate a rift-sealing array. Retrieve them before the energy parasites drain them dry.",
    objectives: [{ type: "fetch", target: "nexus crystal", count: 4, description: "Collect 4 nexus crystals from the Ethereal Nexus conduit chambers" }],
    dialogue: {
      greeting: "Nexus crystals — grown where dimensional energy converges — are the only material that can anchor my rift-sealing array. I need four of them.",
      acceptance: "They pulse with cold blue light in the conduit chambers. Move quickly — energy parasites are draining them to fuel their own existence.",
      completion: "Extraordinary specimens. Still resonating at full amplitude. With these I can begin sealing the Overseer's conduit network from the inside.",
      choices: [
        { id: "accept", label: "I'll retrieve those nexus crystals.", response: "They cluster near the conduit cores — look for the blue glow. Energy parasites patrol there and will freeze you from range if you linger.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are energy parasites so dangerous?", response: "They drain dimensional energy on contact, freezing their targets solid. If one latches onto you, break free fast before the phase striders close in.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The conduit chambers are too dangerous.", response: "No shame in knowing your limits. The crystals will keep — for now. Come back stronger.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "nexus crystal", count: 4 },
  },
  {
    zoneId: "zone16",
    questType: "explore",
    title: "The Overseer's Conduit",
    description: "Deep within the Ethereal Nexus lies the Overseer's prime conduit — the source of his power over dimensional fabric. Locate it before it finishes consuming this plane of existence.",
    objectives: [{ type: "explore", target: "overseer conduit", description: "Discover the Nexus Overseer's prime conduit in the depths of the Ethereal Nexus" }],
    dialogue: {
      greeting: "My readings point to a prime conduit somewhere in the deepest reaches — a nexus point the Overseer uses to pull dimensional fabric apart. It must still be active.",
      acceptance: "Follow the phase striders — they phase toward it to recharge. Look for where the light bends completely inward and reality distorts.",
      completion: "You found it! The prime conduit is far larger than my models predicted. If we can collapse it, the Overseer loses his anchor to this dimension entirely.",
      choices: [
        { id: "accept", label: "I'll find the Overseer's prime conduit.", response: "Phase striders orbit the conduit on irregular cycles. Track their movement inward — the distortion of space itself will guide you when you are close.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What happens if the conduit isn't closed?", response: "The Overseer consumes this entire plane — every piece of matter reduced to raw energy and fed into his nexus. It cannot be allowed.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The deep nexus is beyond my reach.", response: "The conduit has been expanding for centuries. It can wait a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "overseer conduit" },
  },
  {
    zoneId: "zone16",
    questType: "escort",
    title: "Dimensional Researcher",
    description: "A researcher mapping the nexus conduit network became separated from their team after a phase strider ambush. Escort them to a stable exit rift before the nexus collapses around them.",
    objectives: [{ type: "escort", target: "Dimensional Researcher", description: "Escort the Dimensional Researcher safely out of the Ethereal Nexus" }],
    dialogue: {
      greeting: "A phase strider phased through the wall directly behind me — I barely escaped. I've been pinned in this conduit loop for what feels like hours. Please, I need to get out.",
      acceptance: "I'll keep documenting as we move — the conduit cycles repeat every few minutes. My notes may be the only map through here.",
      completion: "Solid ground. Finally. My survey data survived — the conduit resonance patterns I recorded will help the Dimensional Weaver understand how the Overseer is expanding his reach.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you out of here.", response: "Thank you. I've mapped two conduit cycles already — I can guide us between energy parasite patrols if you handle the phase striders ahead.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you mapping?", response: "The conduit resonance network — it expands every time the Overseer absorbs a new dimensional fragment. Understanding the pattern is the key to predicting his next target.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll hold out as long as I can. If you find another way through, please send help.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Dimensional Researcher" },
  },
  // ── Zone 18 — Oblivion Spire ─────────────────────────────────────────────
  {
    zoneId: "zone18",
    questType: "kill",
    title: "Spire Sentinel Purge",
    description: "Spire sentinels have sealed every ascent path with impenetrable void-gold wards. Shatter enough of them to break the Keeper's lock on the upper platforms before the void closes in entirely.",
    objectives: [{ type: "kill", target: "spire_sentinel", count: 5, description: "Destroy 5 spire sentinels on the Oblivion Spire platforms" }],
    dialogue: {
      greeting: "Those sentinels appeared at every ascent junction the moment the Keeper sensed your presence. They freeze everything they touch — the whole spire will be sealed off if you don't act now.",
      acceptance: "Strike fast and pull back before their wards reset. They absorb reality energy over time — the longer you wait, the harder they become to break.",
      completion: "The sentinels are down! The ascent paths are open again. The Keeper's lock is fracturing — press upward before it reseals.",
      choices: [
        { id: "accept", label: "I'll destroy the spire sentinels.", response: "They block rather than dodge — find the cracks in their void-gold plating and hit those weak points. A frozen fighter is a dead fighter up here.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who commands these sentinels?", response: "The Spire Keeper. They are extensions of his will — crystallized void-gold shaped into guardians. Destroy enough and you disrupt his hold on the entire ascent.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The spire is too dangerous right now.", response: "The ascent will remain locked then. Return when you are ready to break them.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "spire_sentinel", count: 5 },
  },
  {
    zoneId: "zone18",
    questType: "fetch",
    title: "Void-Gold Shards",
    description: "A Voidwright researcher needs void-gold shards from the shattered platform cores to calibrate a reality-anchor array. Retrieve them before the reality shards drain them into oblivion.",
    objectives: [{ type: "fetch", target: "void-gold shard", count: 4, description: "Collect 4 void-gold shards from the Oblivion Spire platform cores" }],
    dialogue: {
      greeting: "Void-gold shards — crystallized where celestial and void energies converge — are the only material that can anchor my reality array. I need four of them before this entire platform dissolves.",
      acceptance: "They pulse with cold gold light at the platform cores. Move fast — reality shards are draining them to fuel their own existence, and every moment they lose more coherence.",
      completion: "Extraordinary specimens. Still resonating at full void-gold amplitude. With these I can begin anchoring the Keeper's conduit network from the inside.",
      choices: [
        { id: "accept", label: "I'll retrieve those void-gold shards.", response: "They cluster near the platform core fractures — look for the gold glow against the void-black. Reality shards patrol there and will burn you from range if you linger.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are reality shards so dangerous?", response: "They fire crystallized energy that burns on contact. If one pins you down, the oblivion wraiths will phase in around you — break free fast.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The platform cores are too dangerous.", response: "No shame in knowing your limits. The shards will keep degrading. Come back stronger.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "void-gold shard", count: 4 },
  },
  {
    zoneId: "zone18",
    questType: "explore",
    title: "The Keeper's Sanctum",
    description: "Deep within the Oblivion Spire lies the Keeper's inner sanctum — the focal point of his void-gold conduit and the source of his power over reality's edge. Locate it before it finishes consuming this fragment of existence.",
    objectives: [{ type: "explore", target: "keeper sanctum", description: "Discover the Spire Keeper's inner sanctum at the apex of the Oblivion Spire" }],
    dialogue: {
      greeting: "My readings point to a focal sanctum somewhere at the spire's apex — a convergence point where void-gold energy collapses inward. It must still be active or reality here would already be gone.",
      acceptance: "Follow the oblivion wraiths — they phase toward the sanctum to recharge. Look for where the void-gold glow intensifies and reality distorts completely.",
      completion: "You found it! The sanctum is far larger than I calculated. The Keeper's conduit is fully exposed — if we can collapse it, his hold on this edge of reality ends entirely.",
      choices: [
        { id: "accept", label: "I'll find the Keeper's sanctum.", response: "Oblivion wraiths orbit the sanctum on phase cycles. Track their movement inward — the distortion of space itself will guide you when you are close.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What happens if the sanctum isn't destroyed?", response: "The Keeper unmakes this entire plane — every fragment of matter dissolved into void-gold energy and fed into his conduit. It cannot be allowed.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The upper spire is beyond my reach.", response: "The sanctum has been consuming reality for eons. It can endure a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "keeper sanctum" },
  },
  {
    zoneId: "zone18",
    questType: "escort",
    title: "The Voidwright Cartographer",
    description: "A Voidwright cartographer mapping the Spire's platform topology was cut off when a reality shard barrage collapsed the path behind them. Escort them to a stable anchor point before the void claims the platform entirely.",
    objectives: [{ type: "escort", target: "Voidwright Cartographer", description: "Escort the Voidwright Cartographer safely to a stable anchor point on the Oblivion Spire" }],
    dialogue: {
      greeting: "A reality shard volley took out the platform behind me — I barely made it to this ledge. I've been watching the void creep closer for what feels like hours. Please, I need to reach a stable anchor.",
      acceptance: "I'll keep sketching the platform fracture patterns as we move — the void advances in cycles tied to the Keeper's conduit pulses. My notes could be the key to predicting where he strikes next.",
      completion: "Solid void-gold lattice beneath me. Finally. My survey data survived — the platform dissolution patterns I recorded will help the Voidwright understand how the Keeper is accelerating the unmaking.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you to a stable anchor.", response: "Thank you. I've mapped two dissolution cycles already — I can guide us between reality shard patrols if you handle the oblivion wraiths ahead.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you mapping?", response: "The platform dissolution cycles — the void advances each time the Keeper completes a conduit pulse. Understanding the rhythm is the key to disrupting it.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll hold this ledge as long as I can. If you find another route, please send help.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Voidwright Cartographer" },
  },
  {
    zoneId: "zone18",
    questType: "puzzle",
    title: "The Void-Gold Seal",
    description: "An ancient void-gold seal bars the inner sanctum where the Spire Keeper performs his unmaking ritual. Align the void and celestial rune sequence to shatter it and force a confrontation.",
    objectives: [{ type: "puzzle", target: "void-gold seal", description: "Solve the void-gold rune sequence to open the path to the Spire Keeper" }],
    dialogue: {
      greeting: "The Keeper's seal is woven from void-gold runes — crystallized void energy bound into celestial architecture that no force alone can break. Only the correct resonance sequence will open the sanctum.",
      acceptance: "The void-gold runes must align: void anchor, celestial pulse, oblivion convergence, then the null fracture — void and gold simultaneously, or the seal resets and the void expands.",
      completion: "The seal shatters! The inner sanctum lies open. The Spire Keeper cannot complete his unmaking ritual behind his void-gold wards any longer.",
      choices: [
        { id: "accept", label: "I'll break the Void-Gold Seal.", response: "The sequence mirrors the conduit resonance cycle: void anchor, celestial pulse, oblivion convergence, null fracture. You must hold both void and gold energies at the final step — do not let one overwhelm the other.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this seal?", response: "The Keeper himself — it is a fragment of the reality boundary shaped into a ward using void-gold. That it can be solved at all is because all boundary constructs must be passable from both sides, if you know the resonance key.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Void-gold rune puzzles are beyond me.", response: "The seal will hold until you understand the conduit resonance. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "void-gold seal" },
  },

  // ── Zone 19 — Astral Pinnacle ─────────────────────────────────────────────
  {
    zoneId: "zone19",
    questType: "kill",
    title: "Astral Warden Breach",
    description: "Astral wardens have sealed every approach to the Sovereign's apex with impenetrable stellar wards. Destroy enough of them to break the Sovereign's lock on the pinnacle before the cosmic fabric closes forever.",
    objectives: [{ type: "kill", target: "astral_warden", count: 5, description: "Destroy 5 astral wardens on the Astral Pinnacle platforms" }],
    dialogue: {
      greeting: "Those wardens materialized at every ascent point the moment the Sovereign sensed your presence. They freeze anything that touches them — the entire pinnacle will be sealed if you don't act now.",
      acceptance: "Strike at their crystalline cores — they block rather than evade. The stellar wards regenerate over time, so move fast and don't give them a moment to rebuild.",
      completion: "The wardens are broken! The ascent paths are open. The Sovereign's seal is fracturing — press upward before it reseals around you.",
      choices: [
        { id: "accept", label: "I'll destroy the astral wardens.", response: "Their stellar plating is dense but brittle at the joints. Find the fracture lines and hammer them — a frozen fighter never reaches the apex.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who commands these wardens?", response: "The Astral Sovereign. They are crystallized extensions of her will — star-forged constructs shaped to guard the pinnacle. Break enough and her hold on the ascent collapses.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The pinnacle is too dangerous right now.", response: "The ascent will remain sealed then. Return when you are prepared to shatter them.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "kill", target: "astral_warden", count: 5 },
  },
  {
    zoneId: "zone19",
    questType: "fetch",
    title: "Stellar Essence Fragments",
    description: "A Star Weaver scholar needs stellar essence fragments from the pinnacle's core clusters to calibrate a cosmic anchor array. Retrieve them before the nebula wisps drain the last of their radiance.",
    objectives: [{ type: "fetch", target: "stellar essence fragment", count: 4, description: "Collect 4 stellar essence fragments from the Astral Pinnacle core clusters" }],
    dialogue: {
      greeting: "Stellar essence — crystallized where cosmic and astral energies converge at the pinnacle's core — is the only material that can anchor my array against the Sovereign's weave. I need four fragments before the wisps drain them.",
      acceptance: "They pulse with cold blue light at the cluster cores. Move fast — nebula wisps feed on them to sustain their existence, and every moment the fragments lose their coherence.",
      completion: "Magnificent specimens. Still resonating at full stellar amplitude. With these I can begin anchoring the Sovereign's weave from within and unravel her control over the cosmic fabric.",
      choices: [
        { id: "accept", label: "I'll retrieve those stellar fragments.", response: "They cluster near the core fractures — look for the cold blue glow against the deep space dark. Nebula wisps patrol there and will burn you from range if you linger.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Why are nebula wisps so dangerous?", response: "They fire condensed nebula energy that burns on contact. If one pins you down, the cosmic devourers phase in around you — break free immediately.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The core clusters are too dangerous.", response: "The fragments will keep degrading. Come back when you are strong enough to hold the wisps at bay.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "fetch", target: "stellar essence fragment", count: 4 },
  },
  {
    zoneId: "zone19",
    questType: "explore",
    title: "The Sovereign's Apex",
    description: "At the very crown of the Astral Pinnacle lies the Sovereign's apex sanctum — the focal point of her cosmic weave and the source of her power over the fabric of existence. Locate it before the weave completes and reality is remade in her image.",
    objectives: [{ type: "explore", target: "sovereign apex", description: "Discover the Astral Sovereign's apex sanctum at the crown of the Astral Pinnacle" }],
    dialogue: {
      greeting: "My readings converge on a focal sanctum at the pinnacle's very crown — a convergence point where stellar and cosmic energies collapse into pure creation. It must still be active or existence here would already be rewritten.",
      acceptance: "Follow the cosmic devourers — they phase toward the apex to recharge. Look for where the stellar glow intensifies and the fabric of space itself visibly bends.",
      completion: "You found it! The apex is even grander than I calculated. The Sovereign's weave is fully exposed — if we can collapse it, her power over cosmic creation ends here.",
      choices: [
        { id: "accept", label: "I'll find the Sovereign's apex.", response: "Cosmic devourers orbit the apex on phase cycles. Track their movement inward — the bending of space itself will guide you when you are near.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What happens if the apex isn't destroyed?", response: "The Sovereign remakes this entire plane — every thread of existence rewoven into her vision of the cosmos. It cannot be allowed.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "The apex crown is beyond my reach.", response: "The weave has been building for eons. It can endure a little longer.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "explore", target: "sovereign apex" },
  },
  {
    zoneId: "zone19",
    questType: "escort",
    title: "The Star Weaver Cartographer",
    description: "A Star Weaver cartographer mapping the pinnacle's platform topology was cut off when a nebula wisp barrage collapsed the path behind them. Escort them to a stable stellar anchor before the cosmic current claims the platform.",
    objectives: [{ type: "escort", target: "Star Weaver Cartographer", description: "Escort the Star Weaver Cartographer safely to a stable stellar anchor on the Astral Pinnacle" }],
    dialogue: {
      greeting: "A nebula wisp volley took out the platform behind me — I barely reached this outcrop. I've been watching the stellar current advance for what feels like an eternity. Please, I need to reach a stable anchor.",
      acceptance: "I'll keep mapping the platform resonance patterns as we move — the cosmic current advances in cycles tied to the Sovereign's weave pulses. My notes could be the key to predicting where she reshapes the pinnacle next.",
      completion: "Solid stellar lattice beneath me. Finally. My survey data survived — the platform resonance patterns I recorded will help the Star Weavers understand how the Sovereign is accelerating the cosmic rewrite.",
      choices: [
        { id: "accept", label: "Stay close — I'll get you to a stable anchor.", response: "Thank you. I've mapped two weave cycles already — I can guide us between nebula wisp patrols if you handle the cosmic devourers ahead.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "What were you mapping?", response: "The platform resonance cycles — the cosmic current advances each time the Sovereign completes a weave pulse. Understanding the rhythm is the key to disrupting her creation sequence.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "I can't spare the time right now.", response: "I'll hold this outcrop as long as I can. If you find another route, please send help.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "escort", target: "Star Weaver Cartographer" },
  },
  {
    zoneId: "zone19",
    questType: "puzzle",
    title: "The Stellar Seal",
    description: "An ancient stellar seal bars the inner apex where the Astral Sovereign performs her cosmic weave ritual. Align the star and nebula rune sequence to shatter it and force a confrontation.",
    objectives: [{ type: "puzzle", target: "stellar seal", description: "Solve the stellar rune sequence to open the path to the Astral Sovereign" }],
    dialogue: {
      greeting: "The Sovereign's seal is woven from stellar runes — crystallized cosmic energy bound into astral architecture that no force alone can break. Only the correct resonance sequence will open the apex.",
      acceptance: "The stellar runes must align: cosmic anchor, nebula pulse, astral convergence, then the null radiance — stellar and cosmic simultaneously, or the seal resets and the weave expands.",
      completion: "The seal shatters! The inner apex lies open. The Astral Sovereign cannot complete her cosmic weave ritual behind her stellar wards any longer.",
      choices: [
        { id: "accept", label: "I'll break the Stellar Seal.", response: "The sequence mirrors the weave resonance cycle: cosmic anchor, nebula pulse, astral convergence, null radiance. You must hold both stellar and cosmic energies at the final step — do not let one overwhelm the other.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this seal?", response: "The Sovereign herself — it is a fragment of the cosmic fabric shaped into a ward using stellar energy. That it can be solved at all is because all creation constructs must be passable from both sides, if you know the resonance key.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Stellar rune puzzles are beyond me.", response: "The seal will hold until you understand the weave resonance. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "stellar seal" },
  },
  {
    zoneId: "zone16",
    questType: "puzzle",
    title: "The Nexus Lock",
    description: "An ancient dimensional lock bars the path to the Overseer's sanctum at the nexus core. Align the phase-rune sequence to shatter it and force a confrontation.",
    objectives: [{ type: "puzzle", target: "nexus lock", description: "Solve the phase-rune dimensional lock to open the path to the Nexus Overseer" }],
    dialogue: {
      greeting: "The Overseer's lock is woven from phase-runes — dimensional anchors that no physical force can break. Only the correct resonance sequence will open the path.",
      acceptance: "The phase-runes must align: void anchor, rift pulse, energy convergence, then the null point — in that exact order.",
      completion: "The lock shatters! The sanctum lies open. The Nexus Overseer cannot retreat behind his dimensional wards any longer.",
      choices: [
        { id: "accept", label: "I'll break the Nexus Lock.", response: "The sequence mirrors the conduit resonance cycle: void anchor, rift pulse, energy convergence, null point. Do not rush the final alignment — the null point is unstable.", outcome: "accept", repDelta: 0 },
        { id: "ask_more", label: "Who created this lock?", response: "The Overseer himself — it is a fragment of dimensional fabric shaped into a ward. That it can be solved at all is because all dimensional constructs have a resonance flaw, if you know where to look.", outcome: "neutral", repDelta: 0 },
        { id: "decline", label: "Phase-rune puzzles are beyond me.", response: "The lock will hold until you understand the conduit resonance. Return when you do.", outcome: "decline", repDelta: 0 },
      ],
    },
    completionConditions: { type: "puzzle", target: "nexus lock" },
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
