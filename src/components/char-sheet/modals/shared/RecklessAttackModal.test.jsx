import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecklessAttackModal from './RecklessAttackModal.jsx';

const mockPlayerStats = { name: 'TestBarbarian', level: 5 };
const mockCampaignName = 'test-campaign';
const defaultAttack = { name: 'Melee Attack', type: 'weapon' };

function makeProps(overrides = {}) {
    return {
        playerStats: { ...mockPlayerStats },
        campaignName: mockCampaignName,
        attack: { ...defaultAttack },
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        mode: 'full',
        hasBrutalStrike: false,
        brutalStrikeOptions: [],
        maxEffects: 1,
        ...(overrides || {}),
    };
}

function toggleBrutalStrike() {
    // Find the checkbox by its label — in brutalOnly mode "Use Brutal Strike" also
    // appears in the description paragraph, so we need to target the checkbox specifically.
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox) {
        fireEvent.click(checkbox);
    } else {
        // fallback: click the label
        const label = document.querySelector('label');
        if (label) fireEvent.click(label);
    }
}

function getSelectedCountText() {
    // The selected count text is split across elements, so we need to read the body text.
    const body = document.querySelector('.sp-body');
    if (!body) return null;
    const match = body.textContent.match(/(\d+)\/(\d+)\s+selected/);
    return match ? `${match[1]}/${match[2]}` : null;
}

function getBrutalStrikeLabel() {
    // Returns the <strong> element containing "Use Brutal Strike" text.
    return document.querySelector('label strong');
}

describe('RecklessAttackModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('full mode — initial render', () => {
        it('renders the modal overlay, modal container, header, and body', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
        });

        it('renders the shield-halved icon in the header', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-shield-halved')).toBeInTheDocument();
        });

        it('renders the header text "Reckless Attack"', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(document.querySelector('.sp-header').textContent).toContain('Reckless Attack');
        });

        it('displays the reckless attack description text', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('Advantage on Strength attack rolls');
            expect(body.textContent).toContain('attack rolls against you also have Advantage');
        });

        it('renders the confirm button with shield-halved icon', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            const confirmBtn = screen.getByRole('button', { name: /Attack Recklessly/ });
            expect(confirmBtn).toBeInTheDocument();
            expect(confirmBtn.querySelector('.fa-solid.fa-shield-halved')).toBeInTheDocument();
        });

        it('renders the cancel button labeled "Normal Attack"', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Normal Attack' })).toBeInTheDocument();
        });

        it('does not show Brutal Strike section when hasBrutalStrike is false', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: false })} />);
            expect(screen.queryByText(/Use Brutal Strike/)).not.toBeInTheDocument();
        });

        it('shows the Use Brutal Strike checkbox when hasBrutalStrike is true even with empty options', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [] })} />);
            expect(getBrutalStrikeLabel()).toBeTruthy();
        });
    });

    describe('full mode — with brutal strike', () => {
        it('shows the "Use Brutal Strike" checkbox when hasBrutalStrike is true and options exist', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            expect(screen.getByText(/Use Brutal Strike/)).toBeInTheDocument();
        });

        it('shows brutal strike options when hasBrutalStrike is true and options exist', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
                { name: 'Sundering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            toggleBrutalStrike();
            expect(screen.getByText('Forceful Blow')).toBeInTheDocument();
            expect(screen.getByText('Hamstring Blow')).toBeInTheDocument();
            expect(screen.getByText('Staggering Blow')).toBeInTheDocument();
            expect(screen.getByText('Sundering Blow')).toBeInTheDocument();
        });

        it('shows descriptions for known brutal strike effects', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
                { name: 'Sundering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            toggleBrutalStrike();
            expect(screen.getByText(/— Push target 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Reduce target Speed by 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Disadvantage on next save, no Opportunity Attacks/)).toBeInTheDocument();
            expect(screen.getByText(/— \+5 to next attack against target/)).toBeInTheDocument();
        });

        it('shows "one effect" label when maxEffects is 1', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            expect(screen.getByText(/Choose one effect:/)).toBeInTheDocument();
        });

        it('shows "up to N effects" label when maxEffects > 1', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            expect(screen.getByText(/Choose up to 2 effects/)).toBeInTheDocument();
        });

        it('toggles the checkbox to show/hide brutal strike options', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            expect(document.querySelectorAll('input[type="radio"]').length).toBe(0);
            toggleBrutalStrike();
            expect(document.querySelectorAll('input[type="radio"]').length).toBe(1);
        });

        it('renders radio inputs when maxEffects is 1', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(2);
            // The Use Brutal Strike checkbox is also a checkbox input
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });

        it('renders checkbox inputs when maxEffects > 1', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 3 })} />);
            toggleBrutalStrike();
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
        });

        it('shows selected count when maxEffects > 1', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            // First checkbox is the "Use Brutal Strike" toggle, remaining are option checkboxes
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
        });

        it('does not show selected count when maxEffects is 1', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
        });

        it('shows 1d10 damage description when maxEffects is 1', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('1d10');
        });

        it('shows 2d10 damage description when maxEffects > 1', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('2d10');
        });
    });

    describe('full mode — confirm behavior', () => {
        it('calls onConfirm with attack when not using brutal strike', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onConfirm })} />);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm with attack when using brutal strike but no effects selected', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm with attack when using brutal strike with effects selected (single select)', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: true, effectChoices: ['Forceful Blow'] });
        });

        it('calls onConfirm with attack when using brutal strike with multiple effects selected (multi select)', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            // First checkbox is the "Use Brutal Strike" toggle, remaining are option checkboxes
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: true, effectChoices: ['Forceful Blow', 'Hamstring Blow'] });
        });
    });

    describe('full mode — cancel behavior', () => {
        it('calls onCancel with attack when cancel is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Normal Attack' }));
            expect(onCancel).toHaveBeenCalledWith(defaultAttack);
        });
    });

    describe('full mode — overlay dismiss behavior', () => {
        it('calls onCancel when overlay background is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(onCancel).toHaveBeenCalledWith(defaultAttack);
        });

        it('does not call onCancel when modal content is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(onCancel).not.toHaveBeenCalled();
        });
    });

    describe('full mode — confirm button disabled state', () => {
        it('is not disabled when brutal strike is not enabled', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: false })} />);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is not disabled when brutal strike is enabled but not checked', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effects are selected (single select)', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).toBeDisabled();
        });

        it('is not disabled when brutal strike is checked and an effect is selected (single select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effects are selected (multi select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).toBeDisabled();
        });

        it('is not disabled when brutal strike is checked and at least one effect is selected (multi select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });
    });

    describe('full mode — effect toggle behavior', () => {
        it('switches selection when clicking a different option (single select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(radios[0].checked).toBe(true);
            expect(radios[1].checked).toBe(false);
            fireEvent.click(radios[1]);
            expect(radios[0].checked).toBe(false);
            expect(radios[1].checked).toBe(true);
        });

        it('limits selection to maxEffects (multi select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            expect(getSelectedCountText()).toBe('2/2');
            // Attempt to select third — should be ignored
            fireEvent.click(optionCheckboxes[2]);
            expect(getSelectedCountText()).toBe('2/2');
        });

        it('clears selected effects when toggling brutal strike off', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            // Toggle off
            toggleBrutalStrike();
            // Modal should re-render with no selection visible
            expect(document.querySelectorAll('input[type="radio"]').length).toBe(0);
        });

        it('deselects previous selection when toggling brutal strike off and back on (single select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            // Toggle off clears selection
            toggleBrutalStrike();
            // Toggle back on — Forceful Blow should no longer be selected
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            expect(radios[0].checked).toBe(false);
        });
    });

    describe('brutalOnly mode — initial render', () => {
        it('renders the bolt icon in the header', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-bolt')).toBeInTheDocument();
        });

        it('renders the header text "Brutal Strike"', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(document.querySelector('.sp-header').textContent).toContain('Brutal Strike');
        });

        it('displays the brutal strike description text', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('Reckless Attack is already active');
            expect(body.textContent).toContain('Forgo Advantage');
        });

        it('renders the "Apply Brutal Strike" button', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ }).querySelector('.fa-solid.fa-bolt')).toBeInTheDocument();
        });

        it('renders the "Skip" cancel button', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('does not show the Use Brutal Strike checkbox when hasBrutalStrike is false in brutalOnly mode', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: false })} />);
            expect(getBrutalStrikeLabel()).toBeNull();
        });

        it('shows Brutal Strike options when hasBrutalStrike is true', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            expect(getBrutalStrikeLabel()).toBeTruthy();
            toggleBrutalStrike();
            expect(screen.getByText('Forceful Blow')).toBeInTheDocument();
        });

        it('shows 1d10 damage description when maxEffects is 1', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', maxEffects: 1 })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('1d10');
        });

        it('shows 2d10 damage description when maxEffects > 1', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', maxEffects: 2 })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('2d10');
        });
    });

    describe('brutalOnly mode — confirm behavior', () => {
        it('calls onCancel without attack when skip is clicked', () => {
            const onConfirm = vi.fn();
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, onCancel })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onCancel).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
            expect(onConfirm).not.toHaveBeenCalled();
        });

        it('calls onConfirm without attack when using brutal strike with effects (single select)', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: true, effectChoices: ['Forceful Blow'] });
        });

        it('calls onConfirm without attack when using brutal strike with no effects (single select)', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm without attack when using brutal strike with multiple effects (multi select)', () => {
            const onConfirm = vi.fn();
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: true, effectChoices: ['Forceful Blow', 'Hamstring Blow'] });
        });
    });

    describe('brutalOnly mode — confirm button disabled state', () => {
        it('is not disabled when brutal strike is not enabled', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: false })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });

        it('is not disabled when brutal strike is enabled but not checked', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effects selected (single select)', () => {
            const brutalOptions = [{ name: 'Forceful Blow' }];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).toBeDisabled();
        });

        it('is not disabled when brutal strike is checked and an effect is selected (single select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });
    });

    describe('brutalOnly mode — overlay dismiss behavior', () => {
        it('calls onCancel with empty result when overlay is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onCancel })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(onCancel).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
        });

        it('does not call onCancel when modal content is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onCancel })} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(onCancel).not.toHaveBeenCalled();
        });
    });

    describe('brutalOnly mode — effect toggle behavior', () => {
        it('switches selection when clicking a different option (single select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(radios[0].checked).toBe(true);
            fireEvent.click(radios[1]);
            expect(radios[0].checked).toBe(false);
            expect(radios[1].checked).toBe(true);
        });

        it('limits selection to maxEffects (multi select)', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            expect(getSelectedCountText()).toBe('2/2');
            fireEvent.click(optionCheckboxes[2]);
            expect(getSelectedCountText()).toBe('2/2');
        });
    });

    describe('brutalOnly mode — brutal strike options rendering', () => {
        it('renders descriptions for known brutal strike effects', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
                { name: 'Staggering Blow' },
                { name: 'Sundering Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            toggleBrutalStrike();
            expect(screen.getByText(/— Push target 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Reduce target Speed by 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Disadvantage on next save, no Opportunity Attacks/)).toBeInTheDocument();
            expect(screen.getByText(/— \+5 to next attack against target/)).toBeInTheDocument();
        });

        it('renders option name without description for unknown effects', () => {
            const brutalOptions = [{ name: 'Custom Effect' }];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions })} />);
            toggleBrutalStrike();
            expect(screen.getByText('Custom Effect')).toBeInTheDocument();
            expect(screen.queryByText(/—/)).not.toBeInTheDocument();
        });
    });

    describe('select input names', () => {
        it('uses radio input name "brutalOption" in single select mode', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 1 })} />);
            toggleBrutalStrike();
            const radios = document.querySelectorAll('input[type="radio"]');
            expect(radios[0].name).toBe('brutalOption');
            expect(radios[1].name).toBe('brutalOption');
        });

        it('uses checkbox input names with index prefix in multi select mode', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            // First checkbox is the "Use Brutal Strike" toggle, remaining are option checkboxes
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            expect(optionCheckboxes[0].name).toBe('brutalOption_0');
            expect(optionCheckboxes[1].name).toBe('brutalOption_1');
        });
    });

    describe('selected effects clearing', () => {
        it('clears selected effects when brutal strike is toggled off in full mode', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
            // Toggle off clears selection
            toggleBrutalStrike();
            // Options should be hidden, only the toggle checkbox remains
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });

        it('clears selected effects when brutal strike is toggled off in brutalOnly mode', () => {
            const brutalOptions = [
                { name: 'Forceful Blow' },
                { name: 'Hamstring Blow' },
            ];
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: brutalOptions, maxEffects: 2 })} />);
            toggleBrutalStrike();
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            const optionCheckboxes = Array.from(allCheckboxes).slice(1);
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
            // Toggle off
            toggleBrutalStrike();
            // Options should be hidden, only the toggle checkbox remains
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });

    describe('empty brutal strike options', () => {
        it('shows Use Brutal Strike checkbox but no effect options when hasBrutalStrike is true but options array is empty (full mode)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [] })} />);
            expect(getBrutalStrikeLabel()).toBeTruthy();
            // Toggling should show nothing since there are no options
            toggleBrutalStrike();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
            // Only the "Use Brutal Strike" checkbox remains (no option checkboxes)
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });

        it('shows Use Brutal Strike checkbox but no effect options when hasBrutalStrike is true but options array is empty (brutalOnly mode)', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: [] })} />);
            expect(getBrutalStrikeLabel()).toBeTruthy();
            toggleBrutalStrike();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
            // Only the "Use Brutal Strike" checkbox remains (no option checkboxes)
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });
});
