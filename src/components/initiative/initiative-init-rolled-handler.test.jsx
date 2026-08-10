import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Initiative from './initiative.jsx';
import { loadCombatSummary, getCombatSummary } from '../../services/encounters/combatData.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

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
vi.mock('../../services/rules/effects/expirations.js', () => ({ expireStaleEffects: vi.fn(), applyTurnStartEffects: vi.fn(), clearExpirationEffects: vi.fn() }));
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

describe('Initiative - Initiative Rolled Handler Paths', () => {
    let props;

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn(() => true);
        Element.prototype.scrollIntoView = vi.fn();
        props = {
            characters: [
                { name: 'Alice', computedStats: { hitPoints: 20, currentHitPoints: 20, armorClass: 15 } },
                { name: 'Bob', computedStats: { hitPoints: 15, currentHitPoints: 15, armorClass: 14 } },
            ],
            campaignName: 'test-campaign',
            onNpcsChange: vi.fn(),
            isLocalhost: true,
            mapName: 'test-map',
        };
    });

    describe('Hunter\'s Mark concentration clearing', () => {
        it('should clear Hunter\'s Mark concentration on initiative roll', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'Alice' && prop === 'activeConditions') return [];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'Alice' && prop === 'activeBuffs') return [];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player', concentration: { spell: "Hunter's Mark", dc: 10 } }, { name: 'Bob', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 1, creatures: [{ name: 'Alice', type: 'player', concentration: { spell: "Hunter's Mark", dc: 10 } }, { name: 'Bob', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('initiative-rolled'));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeBuffs', [], 'test-campaign');
        });

        it('should not clear Hunter\'s Mark when creature has no concentration', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'Alice' && prop === 'activeConditions') return [];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'Alice' && prop === 'activeBuffs') return [];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player', concentration: null }, { name: 'Bob', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 1, creatures: [{ name: 'Alice', type: 'player', concentration: null }, { name: 'Bob', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('initiative-rolled'));
            });

            // Should still clear buffs but not touch concentration
            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeBuffs', [], 'test-campaign');
        });
    });

    describe('pendingExpirations handler for dominate', () => {
        it('should clear dominated expirations on initiative roll', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'Alice' && prop === 'activeConditions') return [];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'Alice' && prop === 'activeBuffs') return [];
                if (key === 'Alice' && prop === 'pendingExpirations') return [
                    { target: 'Enemy1', effects: [{ type: 'dominated', effect: 'dominated', duration: '1 round' }] }
                ];
                if (key === 'campaign' && prop === 'targetEffects') return [];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'pendingExpirations') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }, { name: 'Bob', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }, { name: 'Bob', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('initiative-rolled'));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'pendingExpirations', expect.any(Array), 'test-campaign');
        });

        it('should skip dominate clearing when no pendingExpirations', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (key === 'Alice' && prop === 'activeConditions') return [];
                if (key === 'Alice' && prop === 'currentHitPoints') return 10;
                if (key === 'Alice' && prop === 'hitPoints') return 20;
                if (key === 'Alice' && prop === 'activeBuffs') return [];
                if (prop === 'currentHitPoints') return 10;
                if (prop === 'hitPoints') return 10;
                if (prop === 'activeConditions') return [];
                if (prop === 'activeBuffs') return [];
                if (prop === 'pendingExpirations') return [];
                return null;
            });
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }, { name: 'Bob', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }, { name: 'Bob', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('initiative-rolled'));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeBuffs', [], 'test-campaign');
        });
    });

    describe('combat-summary-updated handler', () => {
        it('should update combatSummary when event differs from current', async () => {
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 2, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('combat-summary-updated'));
            });
        });

        it('should skip update when summary is identical', async () => {
            vi.mocked(loadCombatSummary).mockResolvedValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => { render(<Initiative {...props} />); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            vi.mocked(getCombatSummary).mockReturnValue({ round: 1, creatures: [{ name: 'Alice', type: 'player' }] });
            await act(async () => {
                window.dispatchEvent(new Event('combat-summary-updated'));
            });
        });
    });
});
