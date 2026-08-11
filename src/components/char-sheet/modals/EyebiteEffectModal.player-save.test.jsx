import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EyebiteEffectModal from './EyebiteEffectModal.jsx';

vi.mock('./shared/SecondaryTargetModal.jsx', () => {
    return {
        default: vi.fn(({ title, targets, onTargetSelected, onSkip, description, confirmLabel, confirmIcon }) => {
            const firstTargetName = targets.length > 0 ? (targets[0].name || targets[0].value) : null;
            return (
                <div data-testid="secondary-target-modal">
                    <span data-testid="stm-title">{title}</span>
                    <span data-testid="stm-icon">{confirmIcon}</span>
                    <span data-testid="stm-description">{description}</span>
                    <span data-testid="stm-confirmLabel">{confirmLabel}</span>
                    <span data-testid="stm-targetCount">{targets.length}</span>
                    <button
                        onClick={() => onTargetSelected(firstTargetName)}
                        data-testid="stm-confirm"
                        type="button"
                    >
                        {confirmLabel}
                    </button>
                    <button onClick={onSkip} data-testid="stm-skip" type="button">
                        Skip
                    </button>
                    {targets.map((t, i) => (
                        <span key={i} data-testid={`stm-target-${i}`}>{t.name || t.value}</span>
                    ))}
                </div>
            );
        }),
    };
});

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

vi.mock('../../../services/combat/automation/automationService.js', () => ({
    playerIsImmuneToCondition: vi.fn(() => false),
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

vi.mock('../../../services/automation/common/damageRollback.js', () => ({
    storeSpellLastAttack: vi.fn(),
    addTargetResult: vi.fn(),
}));

import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../services/rules/effects/expirations.js';
import * as automationService from '../../../services/combat/automation/automationService.js';
import * as logService from '../../../services/ui/logService.js';
import * as savePromptService from '../../../services/combat/conditions/savePromptService.js';
import * as damageRollback from '../../../services/automation/common/damageRollback.js';
import utils from '../../../services/ui/utils.js';

const baseProps = {
    combatSummary: {
        creatures: [
            { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 2, dex: 0 } },
            { name: 'Orc Warrior', type: 'npc', saveBonuses: { wis: 4, dex: 2 } },
            { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1, dex: 3 } },
        ],
    },
    attackerName: 'Witch1',
    saveDc: 13,
    campaignName: 'test-campaign',
    onClose: vi.fn(),
    characters: [],
    featureName: 'Eyebite',
    rangeFeet: 60,
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

describe('EyebiteEffectModal - Player save', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        automationService.playerIsImmuneToCondition.mockReturnValue(false);
        runtimeState.getRuntimeValue.mockReturnValue(null);
        utils.guid.mockReturnValue('test-guid-123');
    });

    describe('Player save prompt', () => {
        it('sends save prompt for player targets', async () => {
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            const promptCall = savePromptService.sendSavePrompt.mock.calls[0][1];
            expect(promptCall.targetName).toBe('Elf Mage');
            expect(promptCall.saveType).toBe('WIS');
            expect(promptCall.saveDc).toBe(13);
            expect(promptCall.sourceName).toBe('Witch1');
        });
    });

    describe('player save result handling', () => {
        it('applies condition when player fails save via save-result event', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    'Elf Mage',
                    'activeConditions',
                    expect.arrayContaining(['unconscious']),
                    'test-campaign'
                );
            });
        });

        it('calls addExpiration when player fails save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                expect(expirations.addExpiration).toHaveBeenCalledWith(
                    'Witch1',
                    'Elf Mage',
                    expect.any(Array),
                    'test-campaign'
                );
            });
        });

        it('registers targetEffect when player fails save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                const targetEffectsCall = runtimeState.setRuntimeValue.mock.calls.find(
                    c => c[0] === 'campaign' && c[1] === 'targetEffects'
                );
                expect(targetEffectsCall).toBeDefined();
                const effects = targetEffectsCall[2];
                expect(effects).toContainEqual(
                    expect.objectContaining({
                        target: 'Elf Mage',
                        effect: 'eyebite_asleep',
                        source: 'Witch1',
                        condition: 'unconscious',
                        duration: 'concentration',
                    })
                );
            });
        });

        it('calls addTargetResult with failure when player fails save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Elf Mage',
                        saveResult: 'failure',
                        roll: 5,
                        total: 6,
                        conditions: ['unconscious'],
                    })
                );
            });
        });

        it('logs save_result and condition entries when player fails save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                const saveResultCalls = logService.addEntry.mock.calls.filter(
                    c => c[1].type === 'save_result' && c[1].targetName === 'Elf Mage'
                );
                expect(saveResultCalls.length).toBeGreaterThan(0);
                expect(saveResultCalls[saveResultCalls.length - 1][1]).toEqual(
                    expect.objectContaining({
                        targetName: 'Elf Mage',
                        success: false,
                        type: 'save_result',
                    })
                );
                const conditionCalls = logService.addEntry.mock.calls.filter(
                    c => c[1].type === 'condition'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                expect(conditionCalls[conditionCalls.length - 1][1]).toEqual(
                    expect.objectContaining({
                        characterName: 'Elf Mage',
                        condition: 'Unconscious',
                        type: 'condition',
                    })
                );
            });
        });

        it('shows popup on player save failure', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                        roll: 5,
                        total: 6,
                    },
                }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Elf Mage/)).toBeInTheDocument();
                expect(screen.getByText(/Unconscious/)).toBeInTheDocument();
                expect(screen.getByText(/failed on WIS save/)).toBeInTheDocument();
            });
        });

        it('calls addTargetResult with success when player succeeds save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: true,
                        roll: 12,
                        total: 13,
                    },
                }));
            });
            await waitFor(() => {
                expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Elf Mage',
                        saveResult: 'success',
                        conditions: [],
                    })
                );
            });
        });

        it('logs save_result success when player succeeds save', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: true,
                        roll: 12,
                        total: 13,
                    },
                }));
            });
            await waitFor(() => {
                const saveResultCalls = logService.addEntry.mock.calls.filter(
                    c => c[1].type === 'save_result' && c[1].targetName === 'Elf Mage'
                );
                expect(saveResultCalls.length).toBeGreaterThan(0);
                expect(saveResultCalls[saveResultCalls.length - 1][1]).toEqual(
                    expect.objectContaining({
                        targetName: 'Elf Mage',
                        success: true,
                    })
                );
            });
        });

        it('shows popup on player save success', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: true,
                        roll: 12,
                        total: 13,
                    },
                }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Elf Mage/)).toBeInTheDocument();
                expect(screen.getByText(/succeeded on WIS save/)).toBeInTheDocument();
            });
        });

        it('removes prompt from pendingPrompts after save result', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: true,
                        roll: 12,
                        total: 13,
                    },
                }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Elf Mage/)).toBeInTheDocument();
            });
        });

        it('does nothing on save-result with missing detail', async () => {
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', { detail: null }));
            });
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'Elf Mage',
                'activeConditions',
                expect.any(Array),
                'test-campaign'
            );
        });

        it('does nothing on save-result with unknown promptId', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'nonexistent-guid',
                        success: false,
                        roll: 1,
                        total: 1,
                    },
                }));
            });
            await waitFor(() => {
                expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
            });
        });

        it('handles missing roll/total with defaults', async () => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-123',
                        success: false,
                    },
                }));
            });
            await waitFor(() => {
                expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Elf Mage',
                        saveResult: 'failure',
                        roll: 0,
                        total: 0,
                    })
                );
            });
        });

        it('registers save-result event listener', async () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            await act(async () => {
                fireEvent.click(screen.getByTestId('stm-confirm'));
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            expect(addEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
            addEventListenerSpy.mockRestore();
        });

        it('uses character computedStats when available', async () => {
            automationService.playerIsImmuneToCondition.mockReturnValue(false);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Elf Mage', type: 'player', saveBonuses: { wis: 1 } },
                    ],
                },
                characters: [
                    { name: 'Elf Mage', computedStats: { abilities: { wis: 20 } } },
                ],
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(savePromptService.sendSavePrompt).toHaveBeenCalled();
            });
            expect(automationService.playerIsImmuneToCondition).toHaveBeenCalledWith(
                expect.objectContaining({
                    playerStats: expect.objectContaining({
                        abilities: { wis: 20 },
                    }),
                })
            );
        });
    });
});
