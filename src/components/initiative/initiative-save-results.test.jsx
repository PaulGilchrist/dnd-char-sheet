import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Initiative from './initiative.jsx';
import { loadCombatSummary } from '../../services/encounters/combatData.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../services/ui/logService.js';
import { clearFleshToStonePrompt } from '../../services/combat/conditions/savePromptService.js';

vi.mock('../../hooks/runtime/useSSEEqualityGuard.js', () => ({ default: (setter) => setter }));
vi.mock('../../services/ui/utils.js', () => ({ default: { getName: (name) => name } }));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
    const syncStateStore = new Map();
    return {
        getStore: vi.fn(() => syncStateStore),
        useSyncedState: vi.fn((key, prop, defaultValue) => {
            const storeKey = `${key}-${prop}`;
            if (!syncStateStore.has(storeKey)) {
                syncStateStore.set(storeKey, { value: defaultValue, setter: null });
            }
            const entry = syncStateStore.get(storeKey);
            if (!entry.setter) {
                entry.setter = vi.fn((newValue) => { entry.value = newValue; });
            }
            return [entry.value, entry.setter];
        }),
        listeners: new Map(),
        getRuntimeValue: vi.fn((_key, _prop, _campaign) => {
            if (_prop === 'currentHitPoints') return 10;
            if (_prop === 'hitPoints') return 10;
            if (_prop === 'activeConditions') return [];
            if (_prop === 'activeBuffs') return [];
            if (_prop === 'inspiringMovementNoOA') return false;
            if (_prop === 'targetEffects') return [];
            if (_prop === 'pendingExpirations') return [];
            return null;
        }),
        setRuntimeValue: vi.fn((_key, _prop, _value, _campaign) => {}),
        setRuntimeObject: vi.fn(),
    };
});
vi.mock('../../services/ui/storage.js', () => ({
    default: { get: vi.fn(), set: vi.fn(), getProperty: vi.fn(), setProperty: vi.fn() },
}));
vi.mock('../../services/combat/conditions/savePromptService.js', () => ({ clearDeathSavePrompt: vi.fn(), clearFleshToStonePrompt: vi.fn() }));
vi.mock('../../services/npcs/monsterUtils.js', () => ({ getMonsterImageUrl: vi.fn(() => Promise.resolve(null)), getMonsterData: vi.fn(() => Promise.resolve(null)) }));
vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
    getAbilityLabel: (ability) => ability?.toUpperCase() || '',
    CONDITIONS: [
        { key: 'blinded', label: 'Blinded' }, { key: 'charmed', label: 'Charmed' },
        { key: 'deafened', label: 'Deafened' }, { key: 'frightened', label: 'Frightened' },
        { key: 'grappled', label: 'Grappled' }, { key: 'incapacitated', label: 'Incapacitated' },
        { key: 'invisible', label: 'Invisible' }, { key: 'paralyzed', label: 'Paralyzed' },
        { key: 'petrified', label: 'Petrified' }, { key: 'poisoned', label: 'Poisoned' },
        { key: 'prone', label: 'Prone' }, { key: 'restrained', label: 'Restrained' },
        { key: 'stunned', label: 'Stunned' }, { key: 'unconscious', label: 'Unconscious' },
    ],
}));
vi.mock('../../services/npcs/npcsService.js', () => ({ loadNPCs: vi.fn(() => Promise.resolve({ npcs: [] })) }));
vi.mock('../../services/encounters/npcStatBlockUtils.js', () => ({ npcToMonsterFormat: vi.fn(() => null), npcHasStatBlock: vi.fn(() => true) }));
vi.mock('../../services/rules/effects/expirations.js', () => ({ expireStaleEffects: vi.fn(), applyTurnStartEffects: vi.fn() }));
vi.mock('../../services/encounters/combatData.js', () => {
    const mock = {
        loadCombatSummary: vi.fn(() => Promise.resolve(null)),
        getCombatSummary: vi.fn(() => null),
        getActiveCreatureName: vi.fn(() => null),
        setCombatSummaryCache: vi.fn(),
    };
    return mock;
});
vi.mock('../../services/combat/auras/unbreakableMajesty.js', () => ({ clearPerRoundMajestyTrackers: vi.fn() }));
vi.mock('../../services/encounters/initiativeService.js', () => ({
    setupCreatures: vi.fn((characters) => characters.map((ch) => ({ name: ch.name, type: 'player', initiative: '', targetName: null, concentration: null }))),
    addNpc: vi.fn((cs) => { cs.creatures.push({ name: 'NPC 1', type: 'npc', initiative: '', targetName: null, ac: 10, resistances: [], immunities: [], conditions: [], concentration: null, maxHp: 10, currentHp: 10, saveBonuses: {} }); return 1; }),
    removeNpc: vi.fn(),
    getNextCreatureName: vi.fn((cs, active) => { const idx = cs.creatures.findIndex((c) => c.name === active); if (idx < cs.creatures.length - 1) return { newActiveName: cs.creatures[idx + 1].name, roundIncrement: false }; return { newActiveName: cs.creatures[0].name, roundIncrement: true }; }),
    getPreviousCreatureName: vi.fn((cs, active) => { const idx = cs.creatures.findIndex((c) => c.name === active); if (idx > 0) return { newActiveName: cs.creatures[idx - 1].name, roundDecrement: false }; return { newActiveName: cs.creatures[cs.creatures.length - 1].name, roundDecrement: true }; }),
    isPreviousDisabled: vi.fn(() => false),
    setInitiative: vi.fn(),
    rollNpcInitiative: vi.fn(() => ({ roll: 15, bonus: 2, total: 17 })),
    renameNpc: vi.fn(() => Promise.resolve()),
    setTarget: vi.fn(),
    clearCombat: vi.fn((characters) => ({ round: 1, creatures: characters.map((ch) => ({ name: ch.name, type: 'player', initiative: '', targetName: null, concentration: null })) })),
    mergeCombatSummaryWithCharacters: vi.fn((initialSummary, characters) => {
        const names = new Set((initialSummary?.creatures ?? []).map(c => c.name));
        const newCreatures = characters.filter(ch => !names.has(ch.name)).map((ch) => ({ name: ch.name, type: 'player', initiative: '', targetName: null, concentration: null }));
        return { round: initialSummary?.round ?? 1, creatures: [...(initialSummary?.creatures ?? []), ...newCreatures] };
    }),
}));
vi.mock('../../services/combat/conditions/conditionSaveService.js', () => ({
    rollConditionSave: vi.fn(async () => ({ roll: 15, success: true, bonus: 2, bonusDetail: '' })),
    removeCondition: vi.fn(), addCondition: vi.fn(),
    buildConditionPopup: vi.fn(() => ({ name: 'Test Creature', condition: 'Blinded', type: 'save', rolls: [15], bonus: 2, targetName: 'Test Creature', targetAc: 10, hit: false, success: true, dc: 10 })),
}));
vi.mock('../../services/combat/concentration/concentrationService.js', () => ({
    rollConcentrationSave: vi.fn(async () => ({ roll: 15, success: true, bonus: 2, bonusDetail: '' })),
    breakConcentration: vi.fn(() => 'Shield'), addConcentration: vi.fn(),
    buildConcentrationPopup: vi.fn(() => ({ name: 'Test Creature', condition: null, spell: 'Shield', type: 'save', rolls: [15], bonus: 2, targetName: 'Test Creature', targetAc: 10, hit: false, success: true, dc: 10 })),
    cleanupConcentrationEffects: vi.fn(),
}));
vi.mock('../../services/encounters/combatLoggingService.js', () => ({
    logInitiativeRoll: vi.fn(), logConditionEvent: vi.fn(), logConcentrationSave: vi.fn(),
    logConditionSave: vi.fn(), logHpChange: vi.fn(), logNpcThreshold: vi.fn(),
}));
vi.mock('../../services/ui/logService.js', () => ({
    getLog: vi.fn(async () => []),
    addEntry: vi.fn(async () => ({})),
}));
vi.mock('../encounter/MonsterCardModal.jsx', () => ({ default: () => <div data-testid="monster-card-modal" /> }));
vi.mock('../common/Subscriber.jsx', () => ({ default: () => <div data-testid="subscriber" /> }));
vi.mock('../common/Popup.jsx', () => ({ default: ({ children, onClickOrKeyDown }) => (<div data-testid="popup-overlay" onClick={onClickOrKeyDown}><div data-testid="popup-modal">{children}</div></div>) }));
vi.mock('../char-sheet/DiceRollResult.jsx', () => ({ default: ({ name }) => <div data-testid="dice-roll-result">{name}</div> }));
vi.mock('./CreatureCard.jsx', () => ({ default: ({ creature }) => (<div data-testid={`creature-card-${creature.name}`} className={`creature-card ${creature.type}`}><span>{creature.name}</span></div>) }));
vi.mock('./EffectAdder.jsx', () => ({ default: ({ targetName }) => (<div data-testid="effect-adder"><span>{targetName}</span></div>) }));

describe('Initiative - Save Result Handlers', () => {
    let props;

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn(() => true);
        Element.prototype.scrollIntoView = vi.fn();
        props = {
            characters: [
                { name: 'Alice', computedStats: { hitPoints: 20, currentHitPoints: 20, armorClass: 15 } },
            ],
            campaignName: 'test-campaign',
            onNpcsChange: vi.fn(),
            isLocalhost: true,
            mapName: 'test-map',
        };
    });

    describe('flesh-to-stone-result handler', () => {
        it('should handle successful flesh-to-stone save (1/3 successes)', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_fleshToStone_Alice') {
                    return { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['restrained'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('flesh-to-stone-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: true } },
                }));
            });

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result', rollType: 'save-flesh-to-stone', targetName: 'Alice', saveType: 'CON', success: true,
            }));
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_fleshToStone_Alice', expect.objectContaining({ successes: 1 }), 'test-campaign');
        });

        it('should remove restrained and clear flesh-to-stone on 3 successful saves', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_fleshToStone_Alice') {
                    return { casterName: 'Goblin', dc: 15, successes: 2, failures: 0 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['restrained'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'campaign' && prop === 'targetEffects') return [{ target: 'Alice', effect: 'flesh_to_stone', source: 'Goblin' }];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('flesh-to-stone-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: true } },
                }));
            });

            expect(clearFleshToStonePrompt).toHaveBeenCalledWith('test-campaign', 'Alice');
            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], 'test-campaign');
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'condition', action: 'removed', condition: 'Restrained',
            }));
        });

        it('should apply petrified on 3 failed saves', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_fleshToStone_Alice') {
                    return { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['restrained'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'campaign' && prop === 'targetEffects') return [{ target: 'Alice', effect: 'flesh_to_stone', source: 'Goblin' }];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('flesh-to-stone-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: false } },
                }));
            });

            expect(clearFleshToStonePrompt).toHaveBeenCalledWith('test-campaign', 'Alice');
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'condition', action: 'applied', condition: 'Petrified',
            }));
        });

        it('should skip handler when campaign name does not match', async () => {
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('flesh-to-stone-result', {
                    detail: { campaignName: 'other-campaign', targetName: 'Alice', result: { success: true } },
                }));
            });
        });

        it('should skip handler when creature not found', async () => {
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('flesh-to-stone-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Bob', result: { success: true } },
                }));
            });
        });
    });

    describe('prismatic-spray-indigo-result handler', () => {
        it('should handle successful prismatic spray indigo save (1/3 successes)', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayIndigo_Alice') {
                    return { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['restrained'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('prismatic-spray-indigo-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: true } },
                }));
            });

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result', rollType: 'save-prismatic-spray-indigo', targetName: 'Alice', saveType: 'CON', success: true,
            }));
        });

        it('should apply petrified on 3 failed prismatic spray indigo saves', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayIndigo_Alice') {
                    return { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['restrained'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'campaign' && prop === 'targetEffects') return [{ target: 'Alice', effect: 'prismatic_spray_indigo', source: 'Goblin' }];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('prismatic-spray-indigo-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: false } },
                }));
            });

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'condition', action: 'applied', condition: 'Petrified',
            }));
        });
    });

    describe('prismatic-spray-violet-result handler', () => {
        it('should handle successful prismatic spray violet save (removes blinded)', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayViolet_Alice') {
                    return { casterName: 'Goblin', dc: 15 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['blinded'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'campaign' && prop === 'targetEffects') return [{ target: 'Alice', effect: 'prismatic_spray_violet', source: 'Goblin' }];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('prismatic-spray-violet-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: true } },
                }));
            });

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result', rollType: 'save-prismatic-spray-violet', targetName: 'Alice', saveType: 'WIS', success: true,
            }));
        });

        it('should banish on failed prismatic spray violet save', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayViolet_Alice') {
                    return { casterName: 'Goblin', dc: 15 };
                }
                if (key === 'Alice' && prop === 'activeConditions') return ['blinded'];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'campaign' && prop === 'targetEffects') return [{ target: 'Alice', effect: 'prismatic_spray_violet', source: 'Goblin' }];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                window.dispatchEvent(new CustomEvent('prismatic-spray-violet-result', {
                    detail: { campaignName: 'test-campaign', targetName: 'Alice', result: { success: false } },
                }));
            });

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result', rollType: 'save-prismatic-spray-violet', targetName: 'Alice', saveType: 'WIS', success: false,
            }));
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'condition', action: 'applied', condition: 'Incapacitated',
            }));
        });
    });
});
