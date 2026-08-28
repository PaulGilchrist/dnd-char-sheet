import { vi } from 'vitest';
import * as logService from '../../services/ui/logService.js';

vi.mock('../../hooks/runtime/useRuntimeState.js');
vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { name: 'Fighter' },
    abilities: [
        { name: 'Strength', bonus: 4 },
        { name: 'Dexterity', bonus: 2 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Charisma', bonus: 0 },
    ],
    skills: [
        { name: 'Stealth', bonus: 2 },
    ],
    skillProficiencies: [],
    feats: [],
    automation: { passives: [] },
};

const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
const mockRollAbilityCheck = vi.fn().mockResolvedValue(undefined);
const mockAddEntry = logService.addEntry;
const mockSetPopupHtml = vi.fn();
const mockToggleBuff = vi.fn();
const mockAddExpiration = vi.fn();
const mockLoadCombatSummary = vi.fn();
const mockGetMonsterData = vi.fn();

export function createHooks(overrides = {}) {
    const {
        cannotAct = false,
        getRuntimeValue = vi.fn(),
        setRuntimeValue = vi.fn(),
        playerStats = basePlayerStats,
        campaignName: cn = campaignName,
        exhaustionPenalty = 0,
        conditionEffects = {},
        loadCombatSummary: lcs = mockLoadCombatSummary,
        getMonsterData: gmd = mockGetMonsterData,
    } = overrides;

    return {
        cannotAct,
        getRuntimeValue,
        setRuntimeValue,
        rollSkillCheck: overrides.rollSkillCheck || mockRollSkillCheck,
        rollAbilityCheck: overrides.rollAbilityCheck || mockRollAbilityCheck,
        addEntry: overrides.addEntry || mockAddEntry,
        setPopupHtml: overrides.setPopupHtml || mockSetPopupHtml,
        playerStats: overrides.playerStats || playerStats,
        campaignName: cn,
        exhaustionPenalty,
        conditionEffects,
        toggleBuff: overrides.toggleBuff || mockToggleBuff,
        addExpiration: overrides.addExpiration || mockAddExpiration,
        loadCombatSummary: lcs,
        getMonsterData: gmd,
    };
}

export {
    campaignName,
    basePlayerStats,
    mockRollSkillCheck,
    mockRollAbilityCheck,
    mockAddEntry,
    mockSetPopupHtml,
    mockToggleBuff,
    mockAddExpiration,
    mockLoadCombatSummary,
    mockGetMonsterData,
};
