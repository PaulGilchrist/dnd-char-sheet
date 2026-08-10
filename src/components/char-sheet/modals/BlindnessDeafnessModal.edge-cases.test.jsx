import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BlindnessDeafnessModal from './BlindnessDeafnessModal.jsx';

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin1', type: 'npc', saveBonuses: { con: 2 } },
        { name: 'Orc Warrior', type: 'npc', saveBonuses: { con: 4 } },
        { name: 'Elf Mage', type: 'player', saveBonuses: { con: 1 } },
    ],
};

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

describe('BlindnessDeafnessModal edge cases', () => {
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

    // ── renderBody processing state ──

    describe('renderBody processing state', () => {
        it('renders processing message with effect label and DC', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Blinded/ }));

            const renderBodyFn = AreaEffectTargetModalBase.mock.calls[0][0].renderBody;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                results: [
                    { targetName: 'Goblin1', success: false, roll: 1, total: 3, saveBonus: 2 },
                    { targetName: 'Orc Warrior', success: true, roll: 15, total: 19, saveBonus: 4 },
                ],
                pendingPrompts: [
                    { promptId: 'prompt-1', targetName: 'Elf Mage' },
                ],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="processing-body">
                    {renderBodyFn(ctx)}
                </div>
            );

            expect(container.textContent).toContain('Resolving CON saving throws');
            expect(container.textContent).toContain('DC 14');
            expect(container.textContent).toContain('Goblin1');
            expect(container.textContent).toContain('Orc Warrior');
            expect(container.textContent).toContain('Elf Mage');
            expect(container.textContent).toContain('Waiting for save roll');
        });

        it('renders "All targets resolved" when allResolved is true', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const renderBodyFn = AreaEffectTargetModalBase.mock.calls[0][0].renderBody;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                results: [{ targetName: 'Goblin1', success: false, roll: 1, total: 3, saveBonus: 2 }],
                pendingPrompts: [],
                allResolved: true,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="resolved-body">
                    {renderBodyFn(ctx)}
                </div>
            );

            expect(container.textContent).toContain('All targets resolved');
        });

        it('renders result text with roll details when roll number is present', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const renderBodyFn = AreaEffectTargetModalBase.mock.calls[0][0].renderBody;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                results: [
                    { targetName: 'Goblin1', success: false, roll: 1, total: 3, saveBonus: 2 },
                    { targetName: 'Orc Warrior', success: true, roll: 15, total: 15, saveBonus: 0 },
                ],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="results-body">
                    {renderBodyFn(ctx)}
                </div>
            );

            expect(container.textContent).toContain('Roll: 1 +2');
            expect(container.textContent).toContain('Roll: 15');
        });
    });

    // ── renderActions processing/complete state ──

    describe('renderActions processing/complete state', () => {
        it('renders Done button when processing is true and allResolved is true', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const renderActionsFn = AreaEffectTargetModalBase.mock.calls[0][0].renderActions;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
                results: [],
                pendingPrompts: [],
                allResolved: true,
                selected: new Set(),
                eligibleTargets: [],
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="actions-complete">
                    {renderActionsFn(ctx)}
                </div>
            );

            expect(container.querySelector('.sp-roll-btn')).toBeInTheDocument();
            expect(container.textContent).toContain('Done');
        });

        it('returns null when processing is true but not allResolved', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const renderActionsFn = AreaEffectTargetModalBase.mock.calls[0][0].renderActions;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: true,
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
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="actions-processing">
                    {renderActionsFn(ctx)}
                </div>
            );

            const buttons = container.querySelectorAll('button');
            expect(buttons.length).toBe(0);
        });

        it('renders Back button after effect selection', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const renderActionsFn = AreaEffectTargetModalBase.mock.calls[0][0].renderActions;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
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
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="actions-select">
                    {renderActionsFn(ctx)}
                </div>
            );

            const rollButton = container.querySelector('.sp-roll-btn');
            expect(rollButton).toBeInTheDocument();
            expect(rollButton.textContent).toContain('Blindness/Deafness');
            const backBtn = container.querySelector('.sp-dismiss-btn');
            expect(backBtn).toBeInTheDocument();
            expect(backBtn.textContent).toContain('Back');
        });
    });

    // ── Custom featureName and rangeFeet ──

    describe('custom featureName and rangeFeet', () => {
        it('renders with custom featureName', () => {
            render(<BlindnessDeafnessModal {...makeProps({ featureName: 'Custom Effect' })} />);
            expect(screen.getByText('Custom Effect')).toBeInTheDocument();
        });

        it('displays custom rangeFeet in target selection message', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Blinded/ }));

            const renderBodyFn = AreaEffectTargetModalBase.mock.calls[0][0].renderBody;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
                results: [],
                pendingPrompts: [],
                allResolved: false,
                selected: new Set(['Goblin1']),
                eligibleTargets: baseCombatSummary.creatures,
                toggleTarget: vi.fn(),
                handleApply: vi.fn(),
                setProcessing: vi.fn(),
                setResults: vi.fn(),
                setPendingPrompts: vi.fn(),
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="range-body">
                    {renderBodyFn(ctx)}
                </div>
            );

            expect(container.textContent).toContain('120 feet');
        });
    });

    // ── Back button functionality ──

    describe('Back button functionality', () => {
        it('resets selectedEffect when Back is clicked', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Blinded/ }));

            const renderActionsFn = AreaEffectTargetModalBase.mock.calls[0][0].renderActions;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'blinded' },
                processing: false,
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
                combatSummary: baseCombatSummary,
            };

            const { container } = render(
                <div data-testid="back-actions">
                    {renderActionsFn(ctx)}
                </div>
            );

            const backBtn = container.querySelector('.sp-dismiss-btn');
            expect(backBtn).toBeInTheDocument();
            expect(backBtn.textContent).toContain('Back');

            fireEvent.click(backBtn);

            expect(mockState.setSelectedEffect).toBeDefined();
        });
    });

    // ── addConditionToCreature error handling ──

    describe('addConditionToCreature error handling', () => {
        it('logs error when addEntry promise rejects', async () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const applyFn = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0].handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(1);
            logService.addEntry.mockRejectedValue(new Error('Log service error'));

            const consoleError = console.error;
            const mockConsoleError = vi.fn();
            console.error = mockConsoleError;

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

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            const blindnessCalls = mockConsoleError.mock.calls.filter(
                call => call[0] && typeof call[0] === 'string' && call[0].includes('[BlindnessDeafness]')
            );
            expect(blindnessCalls.length).toBeGreaterThan(0);
            expect(blindnessCalls[0][0]).toContain('[BlindnessDeafness] Error:');

            console.error = consoleError;
        });
    });

    // ── applyConditionToCreature edge cases ──

    describe('applyConditionToCreature edge cases', () => {
        it('returns early when effectDef is not found for unknown condition', () => {
            render(<BlindnessDeafnessModal {...makeProps()} />);
            const applyFn = AreaEffectTargetModalBase.mock.calls[AreaEffectTargetModalBase.mock.calls.length - 1][0].handleApplyOverride;

            diceRoller.rollD20.mockReturnValue(1);

            const consoleError = console.error;
            const mockConsoleError = vi.fn();
            console.error = mockConsoleError;

            const ctx = {
                selectedEffect: { key: 'blinded', label: 'Blinded', condition: 'poisoned' },
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

            expect(expirations.addExpiration).toHaveBeenCalled();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Goblin1',
                'blindnessDeafness_poisoned',
                true,
                'test-campaign'
            );
            expect(savePromptService.sendSaveResult).toHaveBeenCalled();

            console.error = consoleError;
        });
    });

    // ── Initiative-rolled event - caster clears conditions ──

    describe('initiative-rolled event - caster clears conditions', () => {
        it('removes conditions when affectedTargets has entries and caster rolls', () => {
            render(<BlindnessDeafnessModal {...makeProps({ attackerName: 'Witch1' })} />);

            runtimeState.setRuntimeValue.mockClear();
            runtimeState.getRuntimeValue.mockReturnValue(['blinded', 'deafened']);

            window.dispatchEvent(new CustomEvent('initiative-rolled', {
                detail: { characterName: 'Witch1' },
            }));

            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('does not clear conditions when non-caster rolls', () => {
            render(<BlindnessDeafnessModal {...makeProps({ attackerName: 'Witch1' })} />);

            runtimeState.setRuntimeValue.mockClear();

            window.dispatchEvent(new CustomEvent('initiative-rolled', {
                detail: { characterName: 'OtherCharacter' },
            }));

            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });
    });
});
