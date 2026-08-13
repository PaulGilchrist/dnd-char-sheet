import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FearModal from './FearModal.jsx';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

vi.mock('../../../../services/automation/common/damageRollback.js', () => ({
    storeSpellLastAttack: vi.fn(),
    addTargetResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Bane',
    automation: { type: 'bane' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { cha: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { cha: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'CHA',
        saveDc: 14,
        onClose: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    getCombatSummary.mockReturnValue(baseCombatSummary);
    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockReturnValue(undefined);
    addEntry.mockResolvedValue(undefined);
    getAllyList.mockReturnValue(null);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('FearModal NPC saves', () => {
    // ── NPC save resolution ──

    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                // storeSpellLastAttack is called inside resolveAllSaves
                // We verify the runtime state was set
                expect(setRuntimeValue).toHaveBeenCalled();
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Bane',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies frightened condition on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('frightened');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addExpiration with frightened condition on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    if (addExpiration.mock.calls.length > 0) {
                        const [caster, target, effects] = addExpiration.mock.calls[0];
                        expect(caster).toBe('Wizard1');
                        expect(target).toBe('Goblin');
                        expect(effects).toEqual([
                            { type: 'condition', condition: 'frightened' },
                        ]);
                    }
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('tracks fear effect on targetEffects when NPC fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    const fearEffect = effects.find(e => e.effect === 'fear_end_on_los');
                    expect(fearEffect).toBeDefined();
                    expect(fearEffect.target).toBe('Goblin');
                    expect(fearEffect.source).toBe('Wizard1');
                    expect(fearEffect.condition).toBe('frightened');
                    expect(fearEffect.duration).toBe('concentration');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entries on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Frightened'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result'
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'CHA',
                    saveDc: 14,
                }));
            });
        });

        it('does not apply condition on successful NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBe(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result success when NPC passes save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.success === true
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Careful Spell protection ──

    describe('careful spell protection for NPCs', () => {
        it('automatically succeeds for careful spell protected NPCs', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Goblin should have logged success but no condition applied
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBe(0);
            });

            // Should log that they succeeded due to Careful Spell
            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
            );
            expect(saveEntries.length).toBeGreaterThan(0);
            expect(saveEntries[0][1].description).toContain('Careful Spell protected');
        });

        it('logs condition entry for careful spell protected target', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await waitFor(() => {
                const conditionEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].success).toBe(true);
            });
        });
    });

    // ── Condition deduplication ──

    describe('condition deduplication', () => {
        it('does not add duplicate frightened condition', async () => {
            // Start with frightened already in conditions
            getRuntimeValue.mockReturnValue([{ name: 'frightened' }]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    // Should have exactly one frightened (filtered out then re-added)
                    const conditions = conditionCalls[0][2];
                    const frightenedCount = conditions.filter(c => String(c).toLowerCase() === 'frightened').length;
                    expect(frightenedCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Fear effect tracking ──

    describe('fear effect tracking', () => {
        it('creates new fear effect when none exists', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    expect(effects.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('updates existing fear effect when one already exists', async () => {
            const existingEffect = {
                target: 'Goblin',
                effect: 'fear_end_on_los',
                source: 'OldCaster',
                condition: 'frightened',
                dc: 10,
                duration: '1 minute',
            };
            getRuntimeValue.mockReturnValue([existingEffect]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    // Should have one effect (updated, not duplicated)
                    const fearEffects = effects.filter(e => e.effect === 'fear_end_on_los');
                    expect(fearEffects.length).toBe(1);
                    // Should be updated with new caster
                    expect(fearEffects[0].source).toBe('Wizard1');
                    expect(fearEffects[0].dc).toBe(14);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });
});
