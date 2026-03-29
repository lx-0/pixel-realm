"use strict";
/**
 * Client-side territory wars configuration.
 * Mirrors the server-side territory definitions for UI rendering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERRITORY_LEADERBOARD_BONUS = exports.TERRITORY_DROP_MULTIPLIER = exports.TERRITORY_XP_MULTIPLIER = exports.CAPTURE_POINTS_PER_OBJECTIVE = exports.CAPTURE_POINTS_PER_KILL = exports.WAR_WINDOW_DURATION_MS = exports.WAR_WINDOW_HOURS_UTC = exports.TERRITORY_MAP = exports.TERRITORIES = void 0;
exports.nextWarWindow = nextWarWindow;
exports.TERRITORIES = [
    {
        id: "ironhold",
        name: "Ironhold Fortress",
        description: "An ancient fortress carved into the mountainside. Controls the northern trade routes.",
        xpBonusPct: 15,
        dropBonusPct: 5,
        mapX: 160,
        mapY: 80,
        color: 0x8888aa,
    },
    {
        id: "shadow_peaks",
        name: "Shadow Peaks",
        description: "Treacherous passes shrouded in perpetual mist. Deadly shortcuts for those who dare.",
        xpBonusPct: 10,
        dropBonusPct: 10,
        mapX: 320,
        mapY: 60,
        color: 0x445566,
    },
    {
        id: "golden_nexus",
        name: "Golden Nexus",
        description: "A thriving marketplace hub where all major trade routes converge.",
        xpBonusPct: 10,
        dropBonusPct: 5,
        mapX: 480,
        mapY: 120,
        color: 0xddaa22,
    },
    {
        id: "crystal_caverns",
        name: "Crystal Caverns",
        description: "Shimmering underground caves rich with rare ore deposits and glowing crystals.",
        xpBonusPct: 5,
        dropBonusPct: 15,
        mapX: 200,
        mapY: 220,
        color: 0x44ccee,
    },
    {
        id: "dragons_rest",
        name: "Dragon's Rest",
        description: "Scorched ruins where an ancient dragon once slept. Power radiates from the charred earth.",
        xpBonusPct: 20,
        dropBonusPct: 5,
        mapX: 400,
        mapY: 250,
        color: 0xcc4422,
    },
    {
        id: "storm_crossing",
        name: "Storm Crossing",
        description: "A vital bridge over the Thunderfall River, choked with lightning-charged air.",
        xpBonusPct: 10,
        dropBonusPct: 8,
        mapX: 560,
        mapY: 280,
        color: 0x6699cc,
    },
];
exports.TERRITORY_MAP = new Map(exports.TERRITORIES.map((t) => [t.id, t]));
/** War windows open at these UTC hours. Each window lasts 2 hours. */
exports.WAR_WINDOW_HOURS_UTC = [8, 16, 22];
exports.WAR_WINDOW_DURATION_MS = 2 * 60 * 60 * 1000;
/** Points awarded per kill/objective in a contested zone during a war window. */
exports.CAPTURE_POINTS_PER_KILL = 3;
exports.CAPTURE_POINTS_PER_OBJECTIVE = 10;
/** Territory bonus multiplier applied on top of base XP / drop rates. */
const TERRITORY_XP_MULTIPLIER = (pct) => 1 + pct / 100;
exports.TERRITORY_XP_MULTIPLIER = TERRITORY_XP_MULTIPLIER;
const TERRITORY_DROP_MULTIPLIER = (pct) => 1 + pct / 100;
exports.TERRITORY_DROP_MULTIPLIER = TERRITORY_DROP_MULTIPLIER;
/** Leaderboard bonus per owned territory (matches server-side 50 000). */
exports.TERRITORY_LEADERBOARD_BONUS = 50000;
/**
 * Returns the start and end of the next upcoming war window from `now`.
 * If `now` falls inside a window, returns the *next* window (not the current).
 * Pure function — safe to use in both client and server contexts.
 */
function nextWarWindow(now = new Date()) {
    const ms = now.getTime();
    const todayMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const candidates = [];
    for (let day = 0; day <= 1; day++) {
        for (const hour of exports.WAR_WINDOW_HOURS_UTC) {
            const start = new Date(todayMidnight + day * 86400000 + hour * 3600000);
            // Only include windows that haven't started yet (skip the currently open window)
            if (start.getTime() > ms) {
                candidates.push(start);
            }
        }
    }
    candidates.sort((a, b) => a.getTime() - b.getTime());
    const start = candidates[0];
    const end = new Date(start.getTime() + exports.WAR_WINDOW_DURATION_MS);
    return { start, end };
}
