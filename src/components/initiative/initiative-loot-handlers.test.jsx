// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Initiative from './initiative.jsx';

// Mutable loot generator mock for per-test control (hoisted for vi.mock)
const { lootGeneratorMock } = vi.hoisted(() => ({
    lootGeneratorMock: vi.fn(async () => ({ lootEntries: [], totalEncounterXp: 0 })),
}));

vi.mock('../../hooks/runtime/useSSEEqualityGuard.js', () => ({ default: (setter) => setter }));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
    const syncStateStore = new Map();
    return {
        getStore: vi.fn(() => syncStateStore),
        useSyncedState: vi.fn((_key, _prop, defaultValue) => {
            const storeKey = `${_key}-${_prop}`;
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
        getRuntimeValue: vi.fn(() => null),
        setRuntimeValue: vi.fn(),
        setRuntimeObject: vi.fn(),
    };
});
vi.mock('../../services/ui/storage.js', () => ({
    default: { get: vi.fn(), set: vi.fn(), getProperty: vi.fn(), setProperty: vi.fn() },
}));
vi.mock('../../services/ui/utils.js', () => ({ default: { getName: (name) => name } }));
vi.mock('../../services/encounters/combatData.js', () => ({
    loadCombatSummary: vi.fn(() => Promise.resolve(null)),
    getCombatSummary: vi.fn(() => null),
    getActiveCreatureName: vi.fn(() => null),
    setCombatSummaryCache: vi.fn(),
}));
vi.mock('../../services/encounters/initiativeService.js', () => ({
    setupCreatures: vi.fn((characters) => characters.map((ch) => ({ name: ch.name, type: 'player', initiative: '', targetName: null }))),
    mergeCombatSummaryWithCharacters: vi.fn((initialSummary, characters) => {
        const names = new Set((initialSummary?.creatures ?? []).map(c => c.name));
        const newCreatures = characters.filter(ch => !names.has(ch.name)).map((ch) => ({ name: ch.name, type: 'player', initiative: '', targetName: null }));
        return { round: initialSummary?.round ?? 1, creatures: [...(initialSummary?.creatures ?? []), ...newCreatures] };
    }),
    isPreviousDisabled: vi.fn(() => false),
}));
vi.mock('../../services/npcs/monsterUtils.js', () => ({ getMonsterImageUrl: vi.fn(() => Promise.resolve(null)), getMonsterData: vi.fn(() => Promise.resolve(null)) }));
vi.mock('../../services/npcs/npcsService.js', () => ({ loadNPCs: vi.fn(() => Promise.resolve({ npcs: [] })) }));
vi.mock('../../services/encounters/npcStatBlockUtils.js', () => ({ npcToMonsterFormat: vi.fn(() => null), npcHasStatBlock: vi.fn(() => true) }));
vi.mock('../../services/combat/conditions/savePromptService.js', () => ({ clearDeathSavePrompt: vi.fn() }));
vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
    getAbilityLabel: (ability) => ability?.toUpperCase() || '',
    CONDITIONS: [],
}));
vi.mock('../../services/combat/conditions/conditionSaveService.js', () => ({
    rollConditionSave: vi.fn(async () => ({ roll: 15, success: true, bonus: 2 })),
    removeCondition: vi.fn(), addCondition: vi.fn(),
    buildConditionPopup: vi.fn(() => ({ name: 'Test', condition: 'Blinded', type: 'save', rolls: [15], bonus: 2, targetName: 'Test', targetAc: 10, hit: false, success: true, dc: 10 })),
}));
vi.mock('../../services/combat/concentration/concentrationService.js', () => ({
    rollConcentrationSave: vi.fn(async () => ({ roll: 15, success: true, bonus: 2 })),
    breakConcentration: vi.fn(() => 'Shield'), addConcentration: vi.fn(),
    buildConcentrationPopup: vi.fn(() => ({ name: 'Test', spell: 'Shield', type: 'save', rolls: [15], bonus: 2, targetName: 'Test', targetAc: 10, hit: false, success: true, dc: 10 })),
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
vi.mock('../../services/rules/effects/expirations.js', () => ({ expireStaleEffects: vi.fn(), applyTurnStartEffects: vi.fn() }));
vi.mock('../../services/combat/auras/unbreakableMajesty.js', () => ({ clearPerRoundMajestyTrackers: vi.fn() }));
vi.mock('../encounter/MonsterCardModal.jsx', () => ({ default: () => <div data-testid="monster-card-modal" /> }));
vi.mock('../common/Subscriber.jsx', () => ({ default: () => <div data-testid="subscriber" /> }));
vi.mock('../common/Popup.jsx', () => ({ default: ({ children, onClickOrKeyDown }) => (<div data-testid="popup-overlay" onClick={onClickOrKeyDown}><div data-testid="popup-modal">{children}</div></div>) }));
vi.mock('../char-sheet/DiceRollResult.jsx', () => ({ default: ({ name }) => <div data-testid="dice-roll-result">{name}</div> }));
vi.mock('./CreatureCard.jsx', () => ({ default: ({ creature }) => (<div data-testid={`creature-card-${creature.name}`}><span>{creature.name}</span></div>) }));
vi.mock('./EffectAdder.jsx', () => ({ default: ({ targetName }) => (<div data-testid="effect-adder"><span>{targetName}</span></div>) }));
vi.mock('../../services/items/lootGenerator.js', () => ({ generateLootFromCombatSummary: lootGeneratorMock }));

describe('Initiative - Loot Handlers (integration)', () => {
    const campaignName = 'test-campaign';
    const characters = [
        { name: 'Alice', computedStats: { hitPoints: 20, currentHitPoints: 20, armorClass: 15 } },
        { name: 'Bob', computedStats: { hitPoints: 15, currentHitPoints: 15, armorClass: 14 } },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn(() => true);
        Element.prototype.scrollIntoView = vi.fn();
    });

    function renderInitiative() {
        return render(<Initiative
            characters={characters}
            campaignName={campaignName}
            onNpcsChange={vi.fn()}
            isLocalhost={true}
            mapName="test-map"
        />);
    }

    describe('handleGenerateLoot', () => {
        it('should show generating state and display loot entries after generation', async () => {
            lootGeneratorMock.mockResolvedValue({
                lootEntries: ['Gold coins (100)', 'Silver sword'],
                totalEncounterXp: 200,
            });

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            const generateBtn = screen.getByTitle('Generate loot from defeated monsters in combat');
            expect(generateBtn).not.toBeDisabled();

            await act(async () => { fireEvent.click(generateBtn); });

            await waitFor(() => {
                expect(screen.getByText(/Gold coins/)).toBeInTheDocument();
            });
        });

        it('should disable the generate button while generating', async () => {
            let resolveGen;
            const genPromise = new Promise((resolve) => { resolveGen = resolve; });
            lootGeneratorMock.mockReturnValue(genPromise);

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            const generateBtn = screen.getByTitle('Generate loot from defeated monsters in combat');
            await act(async () => { fireEvent.click(generateBtn); });

            expect(generateBtn).toBeDisabled();
            expect(generateBtn).toHaveTextContent(/Generating/);

            resolveGen({ lootEntries: ['Gold'], totalEncounterXp: 50 });
            await waitFor(() => { expect(generateBtn).not.toBeDisabled(); });
        });

        it('should show loot textarea with generated content', async () => {
            lootGeneratorMock.mockResolvedValue({
                lootEntries: ['Gold coins (100)', 'Silver sword'],
                totalEncounterXp: 200,
            });

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                const generateBtn = screen.getByTitle('Generate loot from defeated monsters in combat');
                fireEvent.click(generateBtn);
            });

            await waitFor(() => {
                const textarea = screen.getByRole('textbox');
                expect(textarea).toBeInTheDocument();
                expect(textarea.value).toBe('Gold coins (100)\nSilver sword');
            });
        });
    });

    describe('handleAwardLoot', () => {
        it('should show award button when loot has XP and custom text', async () => {
            lootGeneratorMock.mockResolvedValue({
                lootEntries: ['Gold coins (100)'],
                totalEncounterXp: 200,
            });

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                const generateBtn = screen.getByTitle('Generate loot from defeated monsters in combat');
                fireEvent.click(generateBtn);
            });

            await waitFor(() => {
                const textarea = screen.getByRole('textbox');
                textarea.value = 'Custom loot item';
                fireEvent.change(textarea);
            });

            expect(screen.getByTitle('Award loot and XP to party')).toBeInTheDocument();
        });

        it('should not show award button when XP is zero', async () => {
            lootGeneratorMock.mockResolvedValue({
                lootEntries: ['Gold coins (100)'],
                totalEncounterXp: 0,
            });

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                const generateBtn = screen.getByTitle('Generate loot from defeated monsters in combat');
                fireEvent.click(generateBtn);
            });

            await waitFor(() => {
                expect(screen.getByRole('textbox')).toBeInTheDocument();
            });

            expect(screen.queryByTitle('Award loot and XP to party')).not.toBeInTheDocument();
        });
    });

    describe('handleClearLoot', () => {
        it('should clear loot and hide clear button after clearing', async () => {
            lootGeneratorMock.mockResolvedValue({
                lootEntries: ['Gold coins (100)'],
                totalEncounterXp: 200,
            });

            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            await act(async () => {
                const generateBtn = screen.getByText(/Generate Loot/);
                fireEvent.click(generateBtn);
            });

            await waitFor(() => {
                expect(screen.getByText(/Gold coins/)).toBeInTheDocument();
            });

            await act(async () => {
                const clearBtn = screen.getByTitle('Clear loot suggestions');
                fireEvent.click(clearBtn);
            });

            await waitFor(() => {
                expect(screen.queryByTitle('Clear loot suggestions')).not.toBeInTheDocument();
                expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            });
        });

        it('should not show clear button when no loot exists', async () => {
            await act(async () => { renderInitiative(); });
            await waitFor(() => { expect(screen.queryByTestId('creature-card-Alice')).toBeInTheDocument(); });

            expect(screen.queryByTitle('Clear loot suggestions')).not.toBeInTheDocument();
        });
    });
});
