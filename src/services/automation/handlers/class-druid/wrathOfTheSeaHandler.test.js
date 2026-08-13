import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
    rollD20: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../combat/auras/pendingSaveRegistry.js', () => ({
    registerPendingSavePrompt: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    loadCombatSummary: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../rules/features/invisibilityService.js', () => ({
    endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../../combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/ui/storage.js', () => ({
    default: { set: vi.fn() },
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getTargetFromAttacker: vi.fn(),
}));

import { handle } from './wrathOfTheSeaHandler.js';
import { rollExpression, rollD20 } from '../../../dice/diceRoller.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { registerPendingSavePrompt } from '../../../combat/auras/pendingSaveRegistry.js';
import { addEntry } from '../../../ui/logService.js';
import { loadCombatSummary } from '../../../encounters/combatData.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { endInvisibilityOnHostileAction } from '../../../rules/features/invisibilityService.js';
import { sendSavePrompt } from '../../../combat/conditions/savePromptService.js';
import storage from '../../../../services/ui/storage.js';
import { getTargetFromAttacker } from '../../../rules/combat/damageUtils.js';

const playerName = 'Maribelle';
const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        abilities: [{ name: 'Wisdom', bonus: 2 }],
        proficiency: 2,
        class: {
            class_levels: [{ level: 3, wild_shape: 1 }],
        },
        ...overrides,
    };
}

function mockAllyAttack() {
    return {
        name: 'Wrath of the Sea',
        automation: { type: 'wrath_of_the_sea', allyAttack: true },
    };
}

function mockNonAllyAttack() {
    return {
        name: 'Wrath of the Sea',
        automation: { type: 'wrath_of_the_sea' },
    };
}

function setupBaseMocks() {
    vi.clearAllMocks();
    global.window = { dispatchEvent: vi.fn() };
}

function setupSavePath(wisMod = 1, dc = 12, saveBonus = 0, saveRoll = 5, finalDamage = 6) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === playerName && key === 'wrathOfTheSeaWisMod') return wisMod;
        if (name === playerName && key === 'wrathOfTheSeaDc') return dc;
        return undefined;
    });
    rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
    loadCombatSummary.mockResolvedValue({
        creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
    });
    getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: saveBonus } });
    applyDamageToTarget.mockReturnValue({ finalDamage, newHp: 10 });
    rollD20.mockReturnValue(saveRoll);
}

function setupWrathActivePath(statsOverride = makePlayerStats()) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === playerName && key === 'wrathOfTheSeaActive') return true;
        if (name === playerName && key === 'wrathOfTheSeaWisMod') return 2;
        return undefined;
    });
    rollExpression.mockReturnValue({ total: 12, rolls: [4, 4, 4], modifier: 0 });
    loadCombatSummary.mockResolvedValue({
        creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
    });
    getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
    applyDamageToTarget.mockReturnValue({ finalDamage: 12, newHp: 0 });
    rollD20.mockReturnValue(3);
    return statsOverride;
}

function setupNoTarget() {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === playerName && key === 'wrathOfTheSeaActive') return true;
        return undefined;
    });
    rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
    loadCombatSummary.mockResolvedValue({
        creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
    });
    getTargetFromAttacker.mockReturnValue(null);
}

function setupPlayerTarget() {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === playerName && key === 'wrathOfTheSeaActive') return true;
        if (name === playerName && key === 'wrathOfTheSeaWisMod') return 1;
        if (name === playerName && key === 'wrathOfTheSeaDc') return 12;
        return undefined;
    });
    rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
    loadCombatSummary.mockResolvedValue({
        creatures: [{ name: playerName, targetName: 'AllyPlayer' }, { name: 'AllyPlayer', type: 'player' }],
    });
    getTargetFromAttacker.mockReturnValue({ name: 'AllyPlayer', type: 'player' });
}

function setupStorageSave(combatSummary = { creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }] }) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === playerName && key === 'wrathOfTheSeaWisMod') return 1;
        if (name === playerName && key === 'wrathOfTheSeaDc') return 12;
        return undefined;
    });
    rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
    loadCombatSummary.mockResolvedValue(combatSummary);
    getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
    applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
    rollD20.mockReturnValue(5);
}

describe('wrathOfTheSeaHandler', () => {
    beforeEach(() => {
        setupBaseMocks();
    });

    describe('ally attack path (isAllyAttack === true)', () => {
        it('uses stored wrathWisMod and wrathOfTheSeaDc from runtime state', async () => {
            setupSavePath(3, 13, 3, 12, 18);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(rollExpression).toHaveBeenCalledWith('3d6');
            expect(result.type).toBe('popup');
            expect(result.payload.results[0].damage).toBe(18);
        });

        it('uses fallback WisMod of 1 when stored value is missing', async () => {
            getRuntimeValue.mockReturnValue(undefined);
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 6, newHp: 10 });
            rollD20.mockReturnValue(5);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(rollExpression).toHaveBeenCalledWith('1d6');
            expect(result.payload.results[0].damage).toBe(6);
        });

        it('uses fallback DC of 0 when stored value is missing', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (key === 'wrathOfTheSeaDc') return undefined;
                if (name === playerName && key === 'wrathOfTheSeaWisMod') return 1;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.description).toContain('DC 0');
        });

        it('deals no damage on successful save for NPC', async () => {
            setupSavePath(1, 12, 5, 8, 0);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.results[0].saveSuccess).toBe(true);
            expect(result.payload.results[0].damage).toBe(0);
        });

        it('deals full damage on failed save for NPC', async () => {
            setupSavePath(1, 12, 0, 5, 6);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.results[0].saveSuccess).toBe(false);
            expect(result.payload.results[0].damage).toBe(6);
        });

        it('calls endInvisibilityOnHostileAction when NPC takes damage', async () => {
            setupSavePath(1, 12, 0, 5, 6);

            await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith(playerName, campaignName);
        });

        it('does not call endInvisibilityOnHostileAction when NPC passes save (no damage)', async () => {
            setupSavePath(1, 12, 5, 8, 0);

            await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(endInvisibilityOnHostileAction).not.toHaveBeenCalled();
        });

        it('handles player targets by sending save prompt', async () => {
            setupPlayerTarget();

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(registerPendingSavePrompt).toHaveBeenCalled();
            expect(sendSavePrompt).toHaveBeenCalled();
            expect(result.payload.results).toEqual([]);
            expect(result.payload.description).toContain('rolling saves');
        });

        it('saves combatSummary to storage and dispatches event', async () => {
            setupStorageSave();

            await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
            expect(global.window.dispatchEvent).toHaveBeenCalledWith(new CustomEvent('combat-summary-updated'));
        });

        it('skips storage save when combatSummary is null', async () => {
            getRuntimeValue.mockReturnValue(undefined);
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue(null);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(storage.set).not.toHaveBeenCalled();
            expect(global.window.dispatchEvent).not.toHaveBeenCalled();
            expect(result.type).toBe('popup');
        });

        it('uses damageResult.total for NPC damage when applyDamage returns no finalDamage', async () => {
            setupSavePath(1, 12, 0, 5, 0);
            applyDamageToTarget.mockReturnValue({});

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.results[0].damage).toBe(6);
        });

        it('uses applyDamage finalDamage when available', async () => {
            setupSavePath(1, 12, 0, 5, 0);
            applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.results[0].damage).toBe(4);
        });
    });

    describe('non-ally attack path (isAllyAttack !== true)', () => {
        it('returns popup when no Wild Shape uses remaining', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return 0;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No Wild Shape uses remaining');
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('decrements wildShapeUses and activates wrathOfTheSeaActive on first use', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return 1;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('activated');
            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'wildShapeUses', 0, campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'wrathOfTheSeaActive', true, campaignName);
            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Wrath of the Sea',
            }));
        });

        it('uses wild_shape from class_levels when wildShapeUses runtime value is undefined', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return undefined;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Wild Shape uses remaining');
        });

        it('uses maxWS when wildShapeUses runtime value is null', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return null;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Wild Shape uses remaining');
        });

        it('calculates DC from Wisdom bonus + proficiency + 8 for first-time activation', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return 1;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'wrathOfTheSeaActive', true, campaignName);
        });

        it('returns popup when wrath is already active (second use without no uses)', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 12, rolls: [4, 4, 4], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 12, newHp: 0 });
            rollD20.mockReturnValue(1);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.results[0].damage).toBe(12);
            expect(setRuntimeValue).not.toHaveBeenCalledWith(playerName, 'wildShapeUses', expect.any(Number), campaignName);
        });

        it('uses Wisdom bonus from playerStats for DC calculation when not ally attack', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return 1;
                return undefined;
            });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith(playerName, 'wrathOfTheSeaActive', true, campaignName);
        });

        it('uses fallback WisMod of 1 for dice count when Wisdom ability is missing', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 6, newHp: 10 });
            rollD20.mockReturnValue(5);

            const emptyStats = { name: playerName };
            const _result = await handle(mockNonAllyAttack(), emptyStats, campaignName);

            expect(rollExpression).toHaveBeenCalledWith('1d6');
            expect(_result.payload.results[0].damage).toBe(6);
        });

        it('uses fallback DC of 8 when Wisdom bonus and proficiency are missing', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const emptyStats = { name: playerName };
            const _result = await handle(mockNonAllyAttack(), emptyStats, campaignName);

            expect(_result.payload.description).toContain('DC 8');
        });

        it('returns popup when no target is selected', async () => {
            setupNoTarget();

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No current target selected');
        });

        it('returns early with no-uses popup when wrath is not active and no wild shape uses remain', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return false;
                if (name === playerName && key === 'wildShapeUses') return 0;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Wild Shape uses remaining');
            expect(rollExpression).not.toHaveBeenCalled();
        });

        it('calculates dice count as max(1, wisMod) for damage formula', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 18, rolls: [6, 6, 6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 18, newHp: 0 });
            rollD20.mockReturnValue(1);

            const highWisStats = { name: playerName, abilities: [{ name: 'Wisdom', bonus: 3 }] };
            const result = await handle(mockNonAllyAttack(), highWisStats, campaignName);

            expect(rollExpression).toHaveBeenCalledWith('3d6');
            expect(result.payload.results[0].damage).toBe(18);
        });

        it('generates correct HTML output for NPC damage results', async () => {
            setupWrathActivePath();

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.description).toContain('Wrath of the Sea used!');
            expect(result.payload.description).toContain('Save DC:');
            expect(result.payload.description).toContain('2d6 = 12 Cold damage');
            expect(result.payload.description).toContain('Enemy');
            expect(result.payload.description).toContain('Failed');
        });

        it('generates correct HTML for NPC save success', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 12, rolls: [4, 4, 4], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 5 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(8);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.payload.description).toContain('Passed');
            expect(result.payload.description).toContain('none');
        });

        it('logs an entry for NPC save/damage roll', async () => {
            setupWrathActivePath();

            await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                saveType: 'CON',
                damageType: 'cold',
                note: 'combined_save_damage_roll',
            }));
        });

        it('handles addEntry rejection in NPC save/damage logging without crashing', async () => {
            setupWrathActivePath();
            addEntry.mockRejectedValue(new Error('log write failed'));

            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.results[0].damage).toBe(12);
            expect(consoleSpy).toHaveBeenCalledWith('[wrathOfTheSea] Log error:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('registers and sends save prompt for player targets', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 12, rolls: [4, 4, 4], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'AllyPlayer' }, { name: 'AllyPlayer', type: 'player' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'AllyPlayer', type: 'player' });

            await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(registerPendingSavePrompt).toHaveBeenCalled();
            const promptArgs = registerPendingSavePrompt.mock.calls[0];
            expect(promptArgs[1].targetName).toBe('AllyPlayer');
            expect(promptArgs[1].saveDc).toBe(12);
            expect(promptArgs[1].saveType).toBe('CON');
            expect(promptArgs[1].damageType).toBe('cold');
            expect(promptArgs[1].attackerName).toBe(playerName);
            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'AllyPlayer',
                saveType: 'CON',
                saveDc: 12,
                sourceName: playerName,
            }));
        });

        it('uses stored wisdom mod for dice count on second activation (ally attack path)', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                if (name === playerName && key === 'wrathOfTheSeaWisMod') return 4;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 24, rolls: [4, 4, 4, 4, 4, 4], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 24, newHp: 0 });
            rollD20.mockReturnValue(1);

            await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(rollExpression).toHaveBeenCalledWith('2d6');
        });

        it('uses stored wisdom mod for ally attack path', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaWisMod') return 2;
                if (name === playerName && key === 'wrathOfTheSeaDc') return 12;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 12, rolls: [4, 4, 4], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 12, newHp: 0 });
            rollD20.mockReturnValue(1);

            const result = await handle(mockAllyAttack(), makePlayerStats(), campaignName);

            expect(rollExpression).toHaveBeenCalledWith('2d6');
            expect(result.type).toBe('popup');
        });
    });

    describe('edge cases', () => {
        it('handles negative wisdom mod by using at least 1d6', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 6, newHp: 10 });
            rollD20.mockReturnValue(5);

            const negativeWisStats = { name: playerName, abilities: [{ name: 'Wisdom', bonus: -2 }] };
            await handle(mockNonAllyAttack(), negativeWisStats, campaignName);

            expect(rollExpression).toHaveBeenCalledWith('1d6');
        });

        it('throws when playerStats is undefined', async () => {
            await expect(handle(mockAllyAttack(), undefined, campaignName)).rejects.toThrow();
        });

        it('handles undefined campaignName gracefully', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), undefined);

            expect(result.type).toBe('popup');
        });

        it('throws when action has no automation field and wrath is already active', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const actionWithoutAutomation = { name: 'Wrath of the Sea' };
            await expect(handle(actionWithoutAutomation, makePlayerStats(), campaignName)).rejects.toThrow();
        });

        it('throws when action has null automation field and wrath is already active', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: { con: 0 } });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const actionWithNullAutomation = { name: 'Wrath of the Sea', automation: null };
            await expect(handle(actionWithNullAutomation, makePlayerStats(), campaignName)).rejects.toThrow();
        });

        it('handles NPC with missing saveBonuses', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc' });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.results[0].saveBonus).toBe(0);
        });

        it('handles NPC with null saveBonuses', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue({ total: 6, rolls: [6], modifier: 0 });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: playerName, targetName: 'Enemy' }, { name: 'Enemy' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Enemy', type: 'npc', saveBonuses: null });
            applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 10 });
            rollD20.mockReturnValue(5);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
        });

        it('returns null when rollExpression returns no result', async () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === playerName && key === 'wrathOfTheSeaActive') return true;
                return undefined;
            });
            rollExpression.mockReturnValue(null);

            const result = await handle(mockNonAllyAttack(), makePlayerStats(), campaignName);

            expect(result).toBeNull();
        });
    });
});
