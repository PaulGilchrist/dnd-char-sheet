// @ts-check
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../services/rules/features/silenceService.js', () => ({
    addSilencedTarget: vi.fn(),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(() => null),
}));

import SilenceModal from './SilenceModal.jsx';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../services/ui/logService.js';
import * as expirations from '../../../services/rules/effects/expirations.js';
import * as silenceService from '../../../services/rules/features/silenceService.js';
import * as damageUtils from '../../../services/rules/combat/damageUtils.js';

const baseProps = {
    playerStats: { name: 'Wizard1' },
    campaignName: 'test-campaign',
    aoeRadius: 20,
    onClose: vi.fn(),
    creatureTargets: [
        { name: 'Goblin1', type: 'npc' },
        { name: 'Orc Warrior', type: 'npc' },
        { name: 'Elf Mage', type: 'player' },
    ],
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

describe('SilenceModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Initial render ──

    describe('initial render', () => {
        it('renders the modal overlay', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('renders the modal content container', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders the correct title "Silence"', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(screen.getByText('Silence')).toBeInTheDocument();
        });

        it('renders the volume-xmark icon in the header', () => {
            render(<SilenceModal {...makeProps()} />);
            const headerIcon = document.querySelector('.sp-header i');
            expect(headerIcon).toHaveClass('fa-solid fa-volume-xmark');
        });

        it('renders the description text', () => {
            render(<SilenceModal {...makeProps()} />);
            const p = document.querySelector('.sp-body p');
            expect(p).toBeInTheDocument();
            expect(p.textContent).toContain('no sound can be created');
            expect(p.textContent).toContain('20-foot-radius sphere');
        });

        it('renders all creature targets in the list', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(screen.getByText('Goblin1')).toBeInTheDocument();
            expect(screen.getByText('Orc Warrior')).toBeInTheDocument();
            expect(screen.getByText('Elf Mage')).toBeInTheDocument();
        });

        it('renders the confirm button with label "Cast Silence (0)"', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Cast Silence (0)' })).toBeInTheDocument();
        });

        it('renders the confirm button with the volume-xmark icon', () => {
            render(<SilenceModal {...makeProps()} />);
            const confirmButton = screen.getByRole('button', { name: /Cast Silence/ });
            const icon = confirmButton.querySelector('i.fa-solid.fa-volume-xmark');
            expect(icon).toBeInTheDocument();
        });

        it('renders the Skip button', () => {
            render(<SilenceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('has the confirm button disabled when no targets are selected', () => {
            render(<SilenceModal {...makeProps()} />);
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (0)' });
            expect(confirmButton).toBeDisabled();
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when clicking on it', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            expect(confirmButton).toBeEnabled();
        });

        it('deselects a target when clicking on it again', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (0)' });
            expect(confirmButton).toBeDisabled();
        });

        it('selects multiple targets', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (2)' });
            expect(confirmButton).toBeEnabled();
        });

        it('updates the confirm button label with the number of selected targets', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            expect(screen.getByRole('button', { name: 'Cast Silence (1)' })).toBeInTheDocument();
            fireEvent.click(screen.getByText('Orc Warrior'));
            expect(screen.getByRole('button', { name: 'Cast Silence (2)' })).toBeInTheDocument();
            fireEvent.click(screen.getByText('Elf Mage'));
            expect(screen.getByRole('button', { name: 'Cast Silence (3)' })).toBeInTheDocument();
        });

        it('shows selected targets with the secondary-target-selected class', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const selectedRow = document.querySelector('.secondary-target-selected');
            expect(selectedRow).toBeInTheDocument();
            expect(selectedRow.textContent).toContain('Goblin1');
        });
    });

    // ── Skip behavior ──

    describe('skip behavior', () => {
        it('calls onClose when Skip is clicked', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
        });

        it('does not call setRuntimeValue when Skip is clicked', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('does not call addEntry when Skip is clicked', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    // ── Confirm with targets ──

    describe('confirm with targets', () => {
        it('calls setRuntimeValue for silenceCaster=true when confirming', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 5, gridY: 5 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Wizard1',
                'silenceCaster',
                true,
                'test-campaign'
            );
        });

        it('calls setRuntimeValue for silenceCenter with caster grid position', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 10, gridY: 10 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const centerCall = runtimeState.setRuntimeValue.mock.calls.find(
                (c) => c[1] === 'silenceCenter'
            );
            expect(centerCall).toBeDefined();
            expect(JSON.parse(centerCall[2])).toEqual({ gridX: 10, gridY: 10 });
        });

        it('calls setRuntimeValue for silenceRadius with the aoeRadius prop', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps({ aoeRadius: 30 })} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const radiusCall = runtimeState.setRuntimeValue.mock.calls.find(
                (c) => c[1] === 'silenceRadius'
            );
            expect(radiusCall).toBeDefined();
            expect(radiusCall[2]).toBe(30);
        });

        it('applies deafened condition to each targeted creature', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            runtimeState.getRuntimeValue.mockReturnValue([]);
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (2)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const conditionCalls = runtimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'activeConditions'
            );
            expect(conditionCalls).toHaveLength(2);
            for (const call of conditionCalls) {
                expect(call[2]).toContain('deafened');
            }
        });

        it('removes existing deafened before re-adding it', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            runtimeState.getRuntimeValue.mockReturnValue(['deafened', 'blinded']);
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const conditionCalls = runtimeState.setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'activeConditions'
            );
            expect(conditionCalls[0][2]).toEqual(['blinded', 'deafened']);
        });

        it('calls addSilencedTarget for each targeted creature', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (2)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(silenceService.addSilencedTarget).toHaveBeenCalledWith(
                'Wizard1',
                'Goblin1',
                'test-campaign'
            );
            expect(silenceService.addSilencedTarget).toHaveBeenCalledWith(
                'Wizard1',
                'Orc Warrior',
                'test-campaign'
            );
        });

        it('calls addExpiration for deafened condition on each target', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(expirations.addExpiration).toHaveBeenCalledWith(
                'Wizard1',
                'Goblin1',
                [{ type: 'condition', condition: 'deafened' }],
                'test-campaign'
            );
        });

        it('calls addExpiration for silence buff removal on the caster', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const buffRemovalCalls = expirations.addExpiration.mock.calls.filter(
                (c) => c[1] === 'Wizard1' && c[2].some((e) => e.type === 'remove_active_buff')
            );
            expect(buffRemovalCalls.length).toBeGreaterThanOrEqual(1);
            expect(buffRemovalCalls[0][2]).toContainEqual({ type: 'remove_active_buff', buffName: 'Silence' });
            expect(buffRemovalCalls[0][2]).toContainEqual({
                type: 'clear_silence_zone',
                casterName: 'Wizard1',
            });
        });

        it('calls addEntry for each target condition application', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (2)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const conditionEntries = logService.addEntry.mock.calls.filter(
                (c) => c[1].type === 'condition'
            );
            expect(conditionEntries).toHaveLength(2);
        });

        it('logs condition entries with correct details', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const conditionEntry = logService.addEntry.mock.calls.find(
                (c) => c[1].type === 'condition'
            );
            expect(conditionEntry[1].characterName).toBe('Goblin1');
            expect(conditionEntry[1].condition).toBe('Deafened');
            expect(conditionEntry[1].reason).toBe('Silence spell');
            expect(conditionEntry[1].note).toContain('Goblin1');
            expect(conditionEntry[1].note).toContain('Silence');
            expect(conditionEntry[1].note).toContain('Verbal');
        });

        it('calls addEntry for the ability use log', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const abilityEntries = logService.addEntry.mock.calls.filter(
                (c) => c[1].type === 'ability_use'
            );
            expect(abilityEntries).toHaveLength(1);
            expect(abilityEntries[0][1].characterName).toBe('Wizard1');
            expect(abilityEntries[0][1].abilityName).toBe('Silence');
        });

        it('includes the aoeRadius in the ability_use log description', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps({ aoeRadius: 30 })} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const abilityEntry = logService.addEntry.mock.calls.find(
                (c) => c[1].type === 'ability_use'
            );
            expect(abilityEntry[1].description).toContain('30-foot-radius');
        });

        it('dispatches combat-summary-updated event on confirm', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            const eventListener = vi.fn();
            window.addEventListener('combat-summary-updated', eventListener);
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(eventListener).toHaveBeenCalled();
            window.removeEventListener('combat-summary-updated', eventListener);
        });

        it('calls onClose after confirming with targets', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
        });

        it('sets silenceCenter to null when combatSummary is null', async () => {
            damageUtils.getCombatContext.mockResolvedValue(null);
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const centerCall = runtimeState.setRuntimeValue.mock.calls.find(
                (c) => c[1] === 'silenceCenter'
            );
            expect(centerCall).toBeDefined();
            expect(centerCall[2]).toBe(null);
        });

        it('sets silenceCenter to null when caster has no grid position', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1' }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (1)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const centerCall = runtimeState.setRuntimeValue.mock.calls.find(
                (c) => c[1] === 'silenceCenter'
            );
            expect(centerCall).toBeDefined();
            expect(centerCall[2]).toBe(null);
        });
    });

    // ── Confirm with no targets ──

    describe('confirm with no targets', () => {
        it('does not call setRuntimeValue when no targets are selected (button disabled)', () => {
            render(<SilenceModal {...makeProps()} />);
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (0)' });
            expect(confirmButton).toBeDisabled();
        });
    });

    // ── Overlay / close behavior ──

    describe('overlay / close behavior', () => {
        it('calls onClose when clicking the overlay', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
        });

        it('does not call onClose when clicking the modal content', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(baseProps.onClose).not.toHaveBeenCalled();
        });

        it('does not call onClose when clicking the header', () => {
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-header'));
            expect(baseProps.onClose).not.toHaveBeenCalled();
        });
    });

    // ── Empty targets ──

    describe('empty targets', () => {
        it('renders "No targets available" when creatureTargets is empty', () => {
            render(<SilenceModal {...makeProps({ creatureTargets: [] })} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });

        it('renders "No targets available" when creatureTargets is undefined', () => {
            render(<SilenceModal {...makeProps({ creatureTargets: undefined })} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });

        it('has the confirm button disabled when no targets are available', () => {
            render(<SilenceModal {...makeProps({ creatureTargets: [] })} />);
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (0)' });
            expect(confirmButton).toBeDisabled();
        });
    });

    // ── String targets ──

    describe('string targets', () => {
        it('renders string targets (not objects)', () => {
            render(<SilenceModal {...makeProps({ creatureTargets: ['Goblin', 'Orc'] })} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
        });

        it('selects string targets correctly', () => {
            render(<SilenceModal {...makeProps({ creatureTargets: ['Goblin', 'Orc'] })} />);
            fireEvent.click(screen.getByText('Goblin'));
            expect(screen.getByRole('button', { name: 'Cast Silence (1)' })).toBeInTheDocument();
        });
    });

    // ── Button types ──

    describe('button types', () => {
        it('renders all buttons with type="button"', () => {
            render(<SilenceModal {...makeProps()} />);
            const buttons = document.querySelectorAll('button[type="button"]');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    // ── Multiple targets logging ──

    describe('multiple targets logging', () => {
        it('includes all targeted names in the ability_use description', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            fireEvent.click(screen.getByText('Elf Mage'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (3)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            const abilityEntry = logService.addEntry.mock.calls.find(
                (c) => c[1].type === 'ability_use'
            );
            expect(abilityEntry[1].description).toContain('Goblin1');
            expect(abilityEntry[1].description).toContain('Orc Warrior');
            expect(abilityEntry[1].description).toContain('Elf Mage');
        });
    });

    // ── Error handling ──

    describe('error handling', () => {
        it('continues processing when addEntry rejects for a single target', async () => {
            damageUtils.getCombatContext.mockResolvedValue({
                players: [{ name: 'Wizard1', gridX: 1, gridY: 1 }],
            });
            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
            logService.addEntry
                .mockReturnValueOnce(Promise.resolve())
                .mockReturnValueOnce(Promise.reject(new Error('log failed')));

            render(<SilenceModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Goblin1'));
            fireEvent.click(screen.getByText('Orc Warrior'));
            const confirmButton = screen.getByRole('button', { name: 'Cast Silence (2)' });
            await act(async () => {
                fireEvent.click(confirmButton);
            });
            expect(silenceService.addSilencedTarget).toHaveBeenCalledTimes(2);
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
            consoleSpy.mockRestore();
        });
    });
});
