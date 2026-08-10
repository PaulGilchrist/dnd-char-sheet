import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BlindnessDeafnessModal from './BlindnessDeafnessModal.jsx';

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin1', type: 'npc', saveBonuses: { con: 2 } },
        { name: 'Orc Warrior', type: 'npc', saveBonuses: { con: 4 } },
        { name: 'Elf Mage', type: 'player', saveBonuses: { con: 1 } },
    ],
};

// Shared mock state for the AreaEffectTargetModalBase mock
const mockState = {
    selectedEffect: null,
    processing: false,
    results: [],
    pendingPrompts: [],
    setSelectedEffect: null,
    setProcessing: null,
    setResults: null,
    setPendingPrompts: null,
};

vi.mock('./shared/AreaEffectTargetModalBase.jsx', () => {
    return {
        default: vi.fn(({ renderBody, renderActions, featureName, icon, onClose, extraState, combatSummary }) => {
            if (extraState?.setSelectedEffect) {
                mockState.setSelectedEffect = extraState.setSelectedEffect;
            }

            const ctx = {
                selected: new Set(),
                processing: mockState.processing,
                results: mockState.results,
                pendingPrompts: mockState.pendingPrompts,
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                selectedEffect: mockState.selectedEffect,
                allResolved: false,
                setProcessing: mockState.setProcessing || vi.fn(),
                setResults: mockState.setResults || vi.fn(),
                setPendingPrompts: mockState.setPendingPrompts || vi.fn(),
                setSelectedEffect: mockState.setSelectedEffect || vi.fn(),
                combatSummary: combatSummary || baseCombatSummary,
            };

            return (
                <div data-testid="area-effect-modal-base" className="sp-overlay" onClick={onClose}>
                    <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sp-header">
                            <i className={icon}></i> {featureName}
                        </div>
                        <div className="sp-body">
                            {renderBody ? renderBody(ctx) : null}
                        </div>
                        <div className="sp-actions">
                            {renderActions ? renderActions(ctx) : null}
                        </div>
                    </div>
                </div>
            );
        }),
    };
});

export { mockState };

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
    rollD20: vi.fn(() => 15),
}));

vi.mock('../../../services/combat/conditions/conditionSaveService.js', () => ({
    addCondition: vi.fn(),
}));

vi.mock('../../../services/ui/utils.js', () => ({
    default: {
        getName: (name) => name,
        guid: vi.fn(() => 'test-guid-123'),
    },
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
    sendSaveResult: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/spells/blindnessDeafnessHandler.js', () => ({
    getEffectOptions: vi.fn(() => [
        { key: 'blinded', label: 'Blinded', condition: 'blinded' },
        { key: 'deafened', label: 'Deafened', condition: 'deafened' },
    ]),
}));

import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../services/rules/effects/expirations.js';
import * as diceRoller from '../../../services/dice/diceRoller.js';

import * as logService from '../../../services/ui/logService.js';
import * as savePromptService from '../../../services/combat/conditions/savePromptService.js';
import utils from '../../../services/ui/utils.js';
import AreaEffectTargetModalBase from './shared/AreaEffectTargetModalBase.jsx';

const baseProps = {
    combatSummary: {
        creatures: [
            { name: 'Goblin1', type: 'npc', saveBonuses: { con: 2 } },
            { name: 'Orc Warrior', type: 'npc', saveBonuses: { con: 4 } },
            { name: 'Elf Mage', type: 'player', saveBonuses: { con: 1 } },
        ],
    },
    attackerName: 'Witch1',
    attackerPos: { gridX: 10, gridY: 10 },
    saveDc: 14,
    campaignName: 'test-campaign',
    mapData: null,
    onClose: vi.fn(),
    characters: [],
    featureName: 'Blindness/Deafness',
    rangeFeet: 120,
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

// ── Initiative rolled event ──

describe('BlindnessDeafnessModal handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollD20.mockReturnValue(15);
        utils.guid.mockReturnValue('test-guid-123');
        runtimeState.getRuntimeValue.mockReturnValue(null);
        mockState.selectedEffect = null;
        mockState.processing = false;
        mockState.results = [];
        mockState.pendingPrompts = [];
    });

    describe('initiative-rolled event handling', () => {
        it('does nothing when rolling character is not the caster', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            window.dispatchEvent(new CustomEvent('initiative-rolled', {
                detail: { characterName: 'OtherCharacter' },
            }));
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('does nothing when event has no detail', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            window.dispatchEvent(new CustomEvent('initiative-rolled', {
                detail: null,
            }));
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('does nothing when event detail has no characterName', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            window.dispatchEvent(new CustomEvent('initiative-rolled', {
                detail: {},
            }));
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    // ── HandleApplyOverride (NPC resolution) ──

    describe('handleApplyOverride - NPC resolution', () => {
        it('sets processing to true on apply', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const setProcessing = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing,
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(setProcessing).toHaveBeenCalledWith(true);
        });

        it('does nothing when no effect is selected', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const ctx = {
                selectedEffect: null,
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(diceRoller.rollD20).not.toHaveBeenCalled();
        });

        it('does nothing when no targets are selected', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(diceRoller.rollD20).not.toHaveBeenCalled();
        });

        it('applies condition when NPC fails save', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(1);

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    success: false,
                })
            );

            expect(expirations.addExpiration).toHaveBeenCalled();
            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'condition',
                    action: 'applied',
                    condition: 'Blinded',
                })
            );
        });

        it('does not apply condition when NPC succeeds save', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(15);

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    success: true,
                })
            );
            expect(expirations.addExpiration).not.toHaveBeenCalled();
        });

        it('sends save result with correct roll details', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(7);

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    roll: 7,
                    total: 9,
                    saveBonus: 2,
                    rawRolls: [7, 7],
                })
            );
        });

        it('logs save entry for NPC resolution', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(5);

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'roll',
                    targetName: 'Goblin1',
                    saveDc: 14,
                    saveType: 'CON',
                })
            );
        });

        it('treats missing creature as NPC', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(5);

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Unknown Creature']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSaveResult).toHaveBeenCalled();
        });

        it('works with deafened effect for NPC', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(1);

            const ctx = {
                selectedEffect: { key: 'deafened', label: 'Deafened', condition: 'deafened' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Orc Warrior']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Orc Warrior',
                expect.objectContaining({
                    success: false,
                })
            );
            expect(expirations.addExpiration).toHaveBeenCalled();
        });
    });

    // ── HandleApplyOverride (Player save prompt) ──

    describe('handleApplyOverride - player save prompt', () => {
        it('sends save prompt for player targets', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Elf Mage']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            const promptCall = savePromptService.sendSavePrompt.mock.calls[0][1];
            expect(promptCall.targetName).toBe('Elf Mage');
            expect(promptCall.saveType).toBe('CON');
            expect(promptCall.saveDc).toBe(14);
            expect(promptCall.sourceName).toBe('Witch1');
        });

        it('logs save entry for pending player prompts', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Elf Mage']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
            };

            act(() => {
                applyFn(ctx);
            });

            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'roll',
                    targetName: 'Elf Mage',
                    saveResult: 'failure',
                    formula: '1d20 (waiting)',
                })
            );
        });

        it('sets pending prompts for player targets', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const applyFn = lastCall.handleApplyOverride;

            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Elf Mage']),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts,
            };

            act(() => {
                applyFn(ctx);
            });

            expect(setPendingPrompts).toHaveBeenCalled();
            const pendingCalls = setPendingPrompts.mock.calls;
            const lastPendingCall = pendingCalls[pendingCalls.length - 1][0];
            expect(lastPendingCall).toHaveLength(1);
            expect(lastPendingCall[0].targetName).toBe('Elf Mage');
            expect(lastPendingCall[0].promptId).toBe('test-guid-123');
        });
    });

    // ── HandleSaveResultOverride ──

    describe('handleSaveResultOverride', () => {
        it('applies condition when player save fails', async () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            await act(async () => {
                if (mockState.setSelectedEffect) {
                    mockState.setSelectedEffect({ key: 'blinded', label: 'Blinded', condition: 'blinded' });
                }
            });
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(expirations.addExpiration).toHaveBeenCalled();
            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'condition',
                    action: 'applied',
                    characterName: 'Elf Mage',
                })
            );
        });

        it('does not apply condition when player save succeeds', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: true,
                    roll: 15,
                    total: 16,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(expirations.addExpiration).not.toHaveBeenCalled();
        });

        it('logs save result for player save', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'roll',
                    targetName: 'Elf Mage',
                    saveDc: 14,
                    saveType: 'CON',
                })
            );
        });

        it('updates results with player save outcome', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(setResults).toHaveBeenCalledWith(expect.any(Function));
        });

        it('removes pending prompt after save result', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(setPendingPrompts).toHaveBeenCalledWith(expect.any(Function));
        });

        it('does nothing when promptId does not match any pending prompt', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'other-prompt-id', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(setResults).not.toHaveBeenCalled();
            expect(setPendingPrompts).not.toHaveBeenCalled();
        });

        it('does nothing when event has no detail', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            act(() => {
                saveResultFn({ detail: null }, ctx);
            });

            expect(setResults).not.toHaveBeenCalled();
        });

        it('does nothing when event detail has no promptId', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            const setResults = vi.fn();
            const setPendingPrompts = vi.fn();

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            act(() => {
                saveResultFn({ detail: {} }, ctx);
            });

            expect(setResults).not.toHaveBeenCalled();
        });

        it('calls setResults and setPendingPrompts with callbacks that execute correctly', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const lastCall = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0];
            const saveResultFn = lastCall.handleSaveResultOverride;

            let resultsAccum = [];
            let pendingAccum = [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }];
            const setResults = vi.fn((fn) => {
                resultsAccum = fn(resultsAccum);
            });
            const setPendingPrompts = vi.fn((fn) => {
                pendingAccum = fn(pendingAccum);
            });

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                combatSummary: baseCombatSummary,
                results: [],
                pendingPrompts: [{ promptId: 'test-guid-123', targetName: 'Elf Mage' }],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults,
                setPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-guid-123',
                    success: false,
                    roll: 3,
                    total: 4,
                    saveBonus: 1,
                },
            };

            act(() => {
                saveResultFn(event, ctx);
            });

            expect(setResults).toHaveBeenCalledWith(expect.any(Function));
            expect(setPendingPrompts).toHaveBeenCalledWith(expect.any(Function));
            expect(resultsAccum).toHaveLength(1);
            expect(resultsAccum[0].targetName).toBe('Elf Mage');
            expect(resultsAccum[0].success).toBe(false);
            expect(pendingAccum).toHaveLength(0);
        });
    });
});
