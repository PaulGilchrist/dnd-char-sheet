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
import * as diceRoller from '../../../services/dice/diceRoller.js';
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

describe('EyebiteEffectModal - NPC save', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollD20.mockReturnValue(15);
        automationService.playerIsImmuneToCondition.mockReturnValue(false);
        runtimeState.getRuntimeValue.mockReturnValue(null);
        utils.guid.mockReturnValue('test-guid-123');
    });

    describe('NPC auto-save', () => {
        it('calls storeSpellLastAttack when target is selected', async () => {
            render(<EyebiteEffectModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(damageRollback.storeSpellLastAttack).toHaveBeenCalled();
            const call = damageRollback.storeSpellLastAttack.mock.calls[0][1];
            expect(call.casterName).toBe('Witch1');
            expect(call.spellName).toBe('Eyebite');
            expect(call.saveType).toBe('WIS');
            expect(call.saveDc).toBe(13);
            expect(call.attackScope).toBe('single');
        });

        it('logs ability_use entry on target selection', async () => {
            render(<EyebiteEffectModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'Witch1',
                    abilityName: 'Eyebite',
                })
            );
        });

        it('rolls d20 for NPC save', async () => {
            render(<EyebiteEffectModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(diceRoller.rollD20).toHaveBeenCalled();
        });

        it('uses NPC save bonus (WIS) in save calculation', async () => {
            render(<EyebiteEffectModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            // Goblin1 has wis: 2, rollD20 returns 15, total = 17, DC = 13, success
            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    success: true,
                    roll: 15,
                    total: 17,
                    saveBonus: 2,
                })
            );
        });

        it('uses 0 as saveBonus when creature has no saveBonuses.wis', async () => {
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc' },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(diceRoller.rollD20).toHaveBeenCalled();
            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    saveBonus: 0,
                })
            );
        });

        it('handles creature without saveBonuses object at all', async () => {
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: undefined },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(savePromptService.sendSaveResult).toHaveBeenCalledWith(
                'test-campaign',
                'Goblin1',
                expect.objectContaining({
                    saveBonus: 0,
                })
            );
        });
    });

    describe('Immunity handling', () => {
        it('auto-succeeds for immune targets (NPC immunity)', async () => {
            automationService.playerIsImmuneToCondition.mockReturnValue(true);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 2 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin1',
                'activeConditions',
                expect.any(Array),
                'test-campaign'
            );
            expect(expirations.addExpiration).not.toHaveBeenCalled();
            expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    targetName: 'Goblin1',
                    saveResult: 'immune',
                })
            );
        });

        it('logs save_result for immune targets', async () => {
            automationService.playerIsImmuneToCondition.mockReturnValue(true);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 2 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            expect(logService.addEntry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    type: 'save_result',
                    success: true,
                })
            );
        });
    });

    describe('Condition application', () => {
        it('applies condition on NPC save failure', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    'Goblin1',
                    'activeConditions',
                    expect.arrayContaining(['unconscious']),
                    'test-campaign'
                );
            });
        });

        it('calls addExpiration with caster, target, condition', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(expirations.addExpiration).toHaveBeenCalledWith(
                    'Witch1',
                    'Goblin1',
                    expect.any(Array),
                    'test-campaign'
                );
            });
        });

        it('registers targetEffect in campaign targetEffects', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                const targetEffectsCall = runtimeState.setRuntimeValue.mock.calls.find(
                    c => c[0] === 'campaign' && c[1] === 'targetEffects'
                );
                expect(targetEffectsCall).toBeDefined();
                const effects = targetEffectsCall[2];
                expect(effects).toContainEqual(
                    expect.objectContaining({
                        target: 'Goblin1',
                        effect: 'eyebite_asleep',
                        source: 'Witch1',
                        condition: 'unconscious',
                        duration: 'concentration',
                    })
                );
            });
        });

        it('calls addTargetResult for rollback tracking', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Goblin1',
                        saveResult: 'failure',
                        conditions: ['unconscious'],
                    })
                );
            });
        });

        it('logs save_result entry on failure', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                const saveResultCalls = logService.addEntry.mock.calls.filter(
                    c => c[1].type === 'save_result'
                );
                expect(saveResultCalls.length).toBeGreaterThan(0);
                expect(saveResultCalls[saveResultCalls.length - 1][1]).toEqual(
                    expect.objectContaining({
                        targetName: 'Goblin1',
                        success: false,
                        type: 'save_result',
                    })
                );
            });
        });

        it('logs condition entry on failure', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                const conditionCalls = logService.addEntry.mock.calls.filter(
                    c => c[1].type === 'condition'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                expect(conditionCalls[conditionCalls.length - 1][1]).toEqual(
                    expect.objectContaining({
                        characterName: 'Goblin1',
                        condition: 'Unconscious',
                        type: 'condition',
                    })
                );
            });
        });
    });

    describe('Popup display - NPC', () => {
        it('shows popup with creature name, spell name, condition, and save result on NPC failure', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(screen.getByText(/Goblin1/)).toBeInTheDocument();
                expect(screen.getByText(/Unconscious/)).toBeInTheDocument();
                expect(screen.getByText(/failed on WIS save/)).toBeInTheDocument();
            });
        });

        it('shows popup with creature name, spell name, and save result on NPC success', async () => {
            render(<EyebiteEffectModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(screen.getByText(/Goblin1/)).toBeInTheDocument();
                expect(screen.getByText(/succeeded on WIS save/)).toBeInTheDocument();
            });
        });

        it('modal closes when Done is clicked in popup', async () => {
            diceRoller.rollD20.mockReturnValue(1);
            render(<EyebiteEffectModal {...makeProps({
                combatSummary: {
                    creatures: [
                        { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 } },
                    ],
                },
            })} />);
            fireEvent.click(screen.getByRole('button', { name: /Asleep/ }));
            const confirmBtn = screen.getByTestId('stm-confirm');
            await act(async () => {
                fireEvent.click(confirmBtn);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
                fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            });
            expect(baseProps.onClose).toHaveBeenCalled();
        });
    });
});
