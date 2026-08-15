// @improved-by-ai
import { vi, beforeEach } from 'vitest';

export const campaignName = 'test-campaign';

export const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { class_levels: [{ level: 5, focus_points: 2 }] },
    abilities: [
        { name: 'Strength', bonus: 4 },
        { name: 'Dexterity', bonus: 2 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Charisma', bonus: 0 },
    ],
    skills: [],
    feats: [],
    automation: { passives: [] },
};

export function createHooks(overrides = {}) {
    const {
        cannotAct = false,
        getRuntimeValue: customGRV,
        setRuntimeValue: customSRV,
        playerStats = basePlayerStats,
        campaignName: cn = campaignName,
        activeBuffs = [],
        focusPoints = 3,
        rollDamage: customRollDamage,
        rollAttack: customRollAttack,
        executeHandler: customExecuteHandler,
        addEntry: customAddEntry,
        setPopupHtml: customSetPopupHtml,
        setModalState: customSetModalState,
        onBuffsChange: customOnBuffsChange,
        modalState: customModalState,
        mapName: customMapName,
        characters: customCharacters,
    } = overrides;

    const baseGRV = vi.fn((charKey, key, _cn) => {
        if (key === 'activeBuffs') return activeBuffs;
        if (key === 'focusPoints') return focusPoints;
        if (key === 'lastActionSpellCast') return null;
        return undefined;
    });

    const grv = customGRV || baseGRV;
    const srw = customSRV || vi.fn();

    return {
        cannotAct,
        getRuntimeValue: grv,
        setRuntimeValue: srw,
        rollDamage: customRollDamage || vi.fn(),
        rollAttack: customRollAttack || vi.fn(),
        executeHandler: customExecuteHandler || vi.fn(),
        addEntry: customAddEntry || vi.fn().mockResolvedValue(undefined),
        setPopupHtml: customSetPopupHtml || vi.fn(),
        setModalState: customSetModalState || vi.fn(),
        modalState: customModalState || {},
        playerStats,
        campaignName: cn,
        mapName: customMapName || 'test-map',
        characters: customCharacters || [],
        onBuffsChange: customOnBuffsChange || vi.fn(),
    };
}

export function setupBeforeEach() {
    beforeEach(() => {
        vi.clearAllMocks();
    });
}
