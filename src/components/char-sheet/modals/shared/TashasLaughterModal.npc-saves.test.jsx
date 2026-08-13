import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import TashasLaughterModal from './TashasLaughterModal.jsx';

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
import { addEntry } from '../../../../services/ui/logService.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { storeSpellLastAttack, addTargetResult } from '../../../../services/automation/common/damageRollback.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: "Tasha's Hideous Laughter",
    automation: { type: 'tashas_hideous_laughter' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { wis: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'WIS',
        saveDc: 14,
        onClose: vi.fn(),
        ...overrides,
    };
}

function selectTargetRow(labels, index) {
    return act(async () => { fireEvent.click(labels[index]); });
}

function clickConfirmButton() {
    return act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ }));
    });
}

async function selectAndConfirm(props, targetIndices) {
    render(<TashasLaughterModal {...makeProps(props)} />);
    const labels = document.querySelectorAll('.secondary-target-row');
    for (const idx of targetIndices) {
        await selectTargetRow(labels, idx);
    }
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeInTheDocument();
    });
    await clickConfirmButton();
}

async function selectAndConfirmWithRandom(props, targetIndices, randomVal) {
    getRuntimeValue.mockReturnValue([]);
    vi.spyOn(Math, 'random').mockReturnValue(randomVal);
    await selectAndConfirm(props, targetIndices);
}

function waitForConditionCalls(targetName, assertFn) {
    return waitFor(() => {
        const conditionCalls = setRuntimeValue.mock.calls.filter(
            call => call[1] === 'activeConditions' && call[0] === targetName
        );
        assertFn(conditionCalls);
    });
}

function waitForTeCalls(assertFn) {
    return waitFor(() => {
        const teCalls = setRuntimeValue.mock.calls.filter(
            call => call[1] === 'targetEffects' && call[0] === 'campaign'
        );
        assertFn(teCalls);
    });
}

function waitForSaveEntries(assertFn) {
    return waitFor(() => {
        const saveEntries = addEntry.mock.calls.filter(
            call => call[1]?.type === 'save_result'
        );
        assertFn(saveEntries);
    });
}

function waitForConditionEntries(assertFn) {
    return waitFor(() => {
        const conditionEntries = addEntry.mock.calls.filter(
            call => call[1]?.type === 'condition' && call[1]?.action === 'applied'
        );
        assertFn(conditionEntries);
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    getCombatSummary.mockReturnValue(baseCombatSummary);
    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockReturnValue(undefined);
    addEntry.mockResolvedValue(undefined);
    persistAndNotify.mockReturnValue(undefined);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('TashasLaughterModal - NPC Saves', () => {
    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await selectTargetRow(labels, 0);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeInTheDocument();
            });
            await clickConfirmButton();

            expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
                casterName: 'Wizard1',
                spellName: "Tasha's Hideous Laughter",
                saveType: 'WIS',
                saveDc: 14,
                attackScope: 'single',
            });
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await selectTargetRow(labels, 0);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeInTheDocument();
            });
            await clickConfirmButton();

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: "Tasha's Hideous Laughter",
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies prone and incapacitated conditions on failed NPC save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitForConditionCalls('Goblin', (conditionCalls) => {
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('prone');
                expect(conditions).toContain('incapacitated');
            });
        });

        it('sets condition meta with DC and ability for prone and incapacitated', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitFor(() => {
                const metaCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditionMeta' && call[0] === 'Goblin'
                );
                expect(metaCalls.length).toBeGreaterThan(0);
                const meta = metaCalls[0][2];
                expect(meta.prone).toEqual(expect.objectContaining({ dc: 14, ability: 'wis' }));
                expect(meta.incapacitated).toEqual(expect.objectContaining({ dc: 14, ability: 'wis' }));
            });
        });

        it('calls addExpiration with prone, incapacitated, and tashas_laughter_expiration', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            expect(addExpiration).toHaveBeenCalledWith(
                'Wizard1',
                'Goblin',
                [
                    { type: 'condition', condition: 'prone' },
                    { type: 'condition', condition: 'incapacitated' },
                    { type: 'tashas_laughter_expiration' },
                ],
                campaignName,
            );
        });

        it('sets targetEffects with tashas_hideous_laughter effect', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitForTeCalls((teCalls) => {
                expect(teCalls.length).toBeGreaterThan(0);
                const effects = teCalls[0][2];
                const laughterEffect = effects.find(e => e.effect === 'tashas_hideous_laughter');
                expect(laughterEffect).toEqual(expect.objectContaining({
                    target: 'Goblin',
                    effect: 'tashas_hideous_laughter',
                    source: 'Wizard1',
                    dc: 14,
                    duration: 'concentration',
                    conditions: ['prone', 'incapacitated'],
                }));
            });
        });

        it('logs condition entry on failed NPC save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitForConditionEntries((conditionEntries) => {
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'condition',
                    action: 'applied',
                    characterName: 'Goblin',
                    condition: 'Prone, Incapacitated',
                }));
            });
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await clickConfirmButton();
            waitForSaveEntries((saveEntries) => {
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'WIS',
                    saveDc: 14,
                }));
            });
        });

        it('does not filter out prone/incapacitated when target has no existing conditions', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitForConditionCalls('Goblin', (conditionCalls) => {
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('prone');
                expect(conditions).toContain('incapacitated');
            });
        });

        it('filters out existing prone and incapacitated conditions before re-adding', async () => {
            getRuntimeValue.mockReturnValue(['prone', 'incapacitated', 'blinded']);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await selectTargetRow(labels, 0);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeInTheDocument();
            });
            await clickConfirmButton();
            waitForConditionCalls('Goblin', (conditionCalls) => {
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('blinded');
                expect(conditions).toContain('prone');
                expect(conditions).toContain('incapacitated');
                const proneCount = conditions.filter(c => String(c).toLowerCase() === 'prone').length;
                const incapacitatedCount = conditions.filter(c => String(c).toLowerCase() === 'incapacitated').length;
                expect(proneCount).toBe(1);
                expect(incapacitatedCount).toBe(1);
            });
        });

        it('updates existing targetEffects entry if one already exists for same target/effect/source', async () => {
            getRuntimeValue
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{
                    target: 'Goblin',
                    effect: 'tashas_hideous_laughter',
                    source: 'Wizard1',
                    dc: 10,
                    duration: 'concentration',
                    conditions: ['prone', 'incapacitated'],
                }]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await selectTargetRow(labels, 0);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeInTheDocument();
            });
            await clickConfirmButton();
            waitForTeCalls((teCalls) => {
                expect(teCalls.length).toBeGreaterThan(0);
                const effects = teCalls[0][2];
                expect(effects.length).toBeGreaterThan(0);
            });
        });
    });

    describe('NPC save success path', () => {
        it('does not apply conditions when NPC succeeds on save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.99);
            waitForConditionCalls('Goblin', (conditionCalls) => {
                expect(conditionCalls.length).toBe(0);
            });
        });

        it('does not call addExpiration when NPC succeeds on save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.99);
            expect(addExpiration).not.toHaveBeenCalled();
        });

        it('logs save_result success for NPC', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.99);
            waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
            });
        });

        it('records addTargetResult with success for NPC save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.99);
            waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                );
                expect(targetResultCalls.length).toBeGreaterThan(0);
                expect(targetResultCalls[0][1].saveResult).toBe('success');
                expect(targetResultCalls[0][1].conditions).toEqual([]);
            });
        });

        it('does not update targetEffects when NPC succeeds', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.99);
            waitForTeCalls((teCalls) => {
                expect(teCalls.length).toBe(0);
            });
        });
    });

    describe('multiple NPC targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            await selectAndConfirmWithRandom({ spellSlotLevel: 2 }, [0, 1], 0.01);
            waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });

        it('resolves saves for mixed NPC and player targets', async () => {
            await selectAndConfirmWithRandom({ spellSlotLevel: 2 }, [0, 2], 0.01);
            waitForConditionCalls('Goblin', (conditionCalls) => {
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
            }));
        });
    });

    describe('save bonus handling', () => {
        it('uses the target save bonus for NPC saves', async () => {
            await selectAndConfirmWithRandom({}, [1], 0.99);
            waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Orc'
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].saveBonus).toBe(2);
            });
        });
    });

    describe('creature not found in combat summary', () => {
        it('skips creatures not found in combat summary without error', async () => {
            getRuntimeValue.mockReturnValue([]);
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
                ],
            });
            render(<TashasLaughterModal {...makeProps()} />);

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ }));
            });

            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter/ })).toBeDisabled();
        });
    });

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after NPC save resolution', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            expect(persistAndNotify).toHaveBeenCalled();
        });
    });

    describe('popup notification on close', () => {
        it('shows popup when at least one creature failed save', async () => {
            const onClose = vi.fn();
            const setPopupHtml = vi.fn();
            await selectAndConfirmWithRandom({ onClose, setPopupHtml }, [0], 0.01);
            await waitFor(() => {
                expect(setPopupHtml).toHaveBeenCalled();
            });
            const popupCall = setPopupHtml.mock.calls[0][0];
            expect(popupCall.type).toBe('automation_info');
            expect(popupCall.description).toContain('failed their save');
            expect(popupCall.description).toContain('Prone and Incapacitated');
        });

        it('does not show popup when all creatures succeed on save', async () => {
            const onClose = vi.fn();
            const setPopupHtml = vi.fn();
            await selectAndConfirmWithRandom({ onClose, setPopupHtml }, [0], 0.99);
            await waitFor(() => {
                expect(setPopupHtml).not.toHaveBeenCalled();
            });
        });

        it('closes modal after popup is shown', async () => {
            const onClose = vi.fn();
            await selectAndConfirmWithRandom({ onClose }, [0], 0.01);
            await waitFor(() => {
                expect(onClose).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('condition entry logging detail', () => {
        it('logs condition entry with correct reason on failed NPC save', async () => {
            await selectAndConfirmWithRandom({}, [0], 0.01);
            waitForConditionEntries((conditionEntries) => {
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].characterName).toBe('Goblin');
                expect(conditionEntries[0][1].condition).toBe('Prone, Incapacitated');
                expect(conditionEntries[0][1].note).toContain("Tasha's Hideous Laughter");
                expect(conditionEntries[0][1].note).toContain("can't end the Prone condition");
            });
        });
    });
});
