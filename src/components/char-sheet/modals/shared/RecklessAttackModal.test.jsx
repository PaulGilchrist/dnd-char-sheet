// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecklessAttackModal from './RecklessAttackModal.jsx';

const mockPlayerStats = { name: 'TestBarbarian', level: 5 };
const mockCampaignName = 'test-campaign';
const defaultAttack = { name: 'Melee Attack', type: 'weapon' };

const brutalStrikeOptions = [
    { name: 'Forceful Blow' },
    { name: 'Hamstring Blow' },
    { name: 'Staggering Blow' },
    { name: 'Sundering Blow' },
];

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

function toggleBrutalStrikeCheckbox() {
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox) {
        fireEvent.click(checkbox);
    }
}

function getSelectedCountText() {
    const body = document.querySelector('.sp-body');
    if (!body) return null;
    const match = body.textContent.match(/(\d+)\/(\d+)\s+selected/);
    return match ? `${match[1]}/${match[2]}` : null;
}

function getOptionCheckboxes() {
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    // First checkbox is always the "Use Brutal Strike" toggle
    return Array.from(allCheckboxes).slice(1);
}

describe('RecklessAttackModal', () => {
    describe('full mode — initial render', () => {
        it('renders modal overlay, container, header, and body', () => {
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

        it('displays "Reckless Attack" in the header', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(document.querySelector('.sp-header').textContent).toContain('Reckless Attack');
        });

        it('displays the reckless attack description with advantage text', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('Advantage on Strength attack rolls');
            expect(body.textContent).toContain('attack rolls against you also have Advantage');
        });

        it('renders confirm and cancel buttons with correct labels', () => {
            render(<RecklessAttackModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Normal Attack' })).toBeInTheDocument();
        });

        it('hides Brutal Strike section when hasBrutalStrike is false', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: false })} />);
            expect(screen.queryByText(/Use Brutal Strike/)).not.toBeInTheDocument();
        });
    });

    describe('full mode — brutal strike toggle', () => {
        it('shows the Use Brutal Strike checkbox when hasBrutalStrike is true', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true })} />);
            expect(screen.getByText(/Use Brutal Strike/)).toBeInTheDocument();
        });

        it('shows effect options only after toggling the checkbox on', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions })} />);
            expect(document.querySelectorAll('input[type="radio"]').length).toBe(0);
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]').length).toBeGreaterThan(0);
        });

        it('hides effect options after toggling the checkbox off', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions })} />);
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]').length).toBeGreaterThan(0);
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]').length).toBe(0);
        });

        it('shows option names and descriptions for known effects', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText('Forceful Blow')).toBeInTheDocument();
            expect(screen.getByText('Hamstring Blow')).toBeInTheDocument();
            expect(screen.getByText('Staggering Blow')).toBeInTheDocument();
            expect(screen.getByText('Sundering Blow')).toBeInTheDocument();
            expect(screen.getByText(/— Push target 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Reduce target Speed by 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Disadvantage on next save, no Opportunity Attacks/)).toBeInTheDocument();
            expect(screen.getByText(/— \+5 to next attack against target/)).toBeInTheDocument();
        });

        it('shows option name without description span for unknown effects', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Custom Effect' }] })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText('Custom Effect')).toBeInTheDocument();
            const labels = document.querySelectorAll('label');
            const customLabel = Array.from(labels).find(l => l.textContent.includes('Custom Effect'));
            const descSpan = customLabel.querySelector('span');
            expect(descSpan).toBeNull();
        });

        it('shows "one effect" label when maxEffects is 1', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Forceful Blow' }], maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText(/Choose one effect:/)).toBeInTheDocument();
        });

        it('shows "up to N effects" label when maxEffects > 1', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Forceful Blow' }], maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText(/Choose up to 2 effects/)).toBeInTheDocument();
        });

        it('shows 1d10 damage text when maxEffects is 1', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, maxEffects: 1 })} />);
            expect(document.querySelector('.sp-body').textContent).toContain('1d10');
        });

        it('shows 2d10 damage text when maxEffects > 1', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, maxEffects: 2 })} />);
            expect(document.querySelector('.sp-body').textContent).toContain('2d10');
        });
    });

    describe('full mode — single select (maxEffects=1)', () => {
        it('renders radio inputs for effect selection', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(4);
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });

        it('uses "brutalOption" as the radio input name', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            expect(radios[0].name).toBe('brutalOption');
        });

        it('switches selection when clicking a different option', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(radios[0].checked).toBe(true);
            expect(radios[1].checked).toBe(false);
            fireEvent.click(radios[1]);
            expect(radios[0].checked).toBe(false);
            expect(radios[1].checked).toBe(true);
        });

        it('clears selection when toggling brutal strike off and back on', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            let radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            toggleBrutalStrikeCheckbox();
            toggleBrutalStrikeCheckbox();
            radios = document.querySelectorAll('input[type="radio"]');
            expect(radios[0].checked).toBe(false);
        });

        it('does not show selected count text', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
        });
    });

    describe('full mode — multi select (maxEffects>1)', () => {
        it('renders checkbox inputs for effect selection', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 3 })} />);
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(5);
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
        });

        it('uses indexed checkbox names (brutalOption_0, brutalOption_1)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            expect(optionCheckboxes[0].name).toBe('brutalOption_0');
            expect(optionCheckboxes[1].name).toBe('brutalOption_1');
        });

        it('shows selected count text', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
        });

        it('limits selection to maxEffects', async () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            expect(getSelectedCountText()).toBe('2/2');
            fireEvent.click(optionCheckboxes[2]);
            await waitFor(() => {
                expect(getSelectedCountText()).toBe('2/2');
            });
        });

        it('clears selection when toggling brutal strike off', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });

    describe('full mode — confirm behavior', () => {
        it('calls onConfirm with attack when not using brutal strike', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onConfirm })} />);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm with attack when brutal strike is enabled but unchecked', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions })} />);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm with attack and single effect when selected (single select)', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: true, effectChoices: ['Forceful Blow'] });
        });

        it('calls onConfirm with attack and multiple effects when selected (multi select)', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onConfirm, hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: true, effectChoices: ['Forceful Blow', 'Hamstring Blow'] });
        });
    });

    describe('full mode — cancel behavior', () => {
        it('calls onCancel with attack when cancel button is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Normal Attack' }));
            expect(onCancel).toHaveBeenCalledWith(defaultAttack);
        });

        it('calls onCancel with attack when overlay is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(onCancel).toHaveBeenCalledWith(defaultAttack);
        });

        it('does not call onCancel when modal content is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ onCancel })} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(onCancel).not.toHaveBeenCalled();
        });
    });

    describe('full mode — confirm button disabled state', () => {
        it('is enabled when brutal strike is not enabled', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: false })} />);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is enabled when brutal strike is enabled but unchecked', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions })} />);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effect is selected (single select)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).toBeDisabled();
        });

        it('is enabled when brutal strike is checked and an effect is selected (single select)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effects are selected (multi select)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).toBeDisabled();
        });

        it('is enabled when brutal strike is checked and at least one effect is selected (multi select)', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            expect(screen.getByRole('button', { name: /Attack Recklessly/ })).not.toBeDisabled();
        });
    });

    describe('full mode — empty brutal strike options', () => {
        it('shows the toggle but no effect options when brutalStrikeOptions is empty', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [] })} />);
            expect(screen.getByText(/Use Brutal Strike/)).toBeInTheDocument();
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });

    describe('brutalOnly mode — initial render', () => {
        it('renders the bolt icon and "Brutal Strike" header', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-bolt')).toBeInTheDocument();
            expect(document.querySelector('.sp-header').textContent).toContain('Brutal Strike');
        });

        it('displays the brutal strike description text', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            const body = document.querySelector('.sp-body');
            expect(body.textContent).toContain('Reckless Attack is already active');
            expect(body.textContent).toContain('Forgo Advantage');
        });

        it('renders confirm and skip buttons with correct labels', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly' })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('shows 1d10 damage text when maxEffects is 1', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', maxEffects: 1 })} />);
            expect(document.querySelector('.sp-body').textContent).toContain('1d10');
        });

        it('shows 2d10 damage text when maxEffects > 1', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', maxEffects: 2 })} />);
            expect(document.querySelector('.sp-body').textContent).toContain('2d10');
        });

        it('hides the toggle checkbox when hasBrutalStrike is false', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: false })} />);
            expect(document.querySelector('input[type="checkbox"]')).toBeNull();
        });
    });

    describe('brutalOnly mode — brutal strike toggle and effects', () => {
        it('shows effect options when hasBrutalStrike is true', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions })} />);
            expect(document.querySelector('input[type="checkbox"]')).toBeTruthy();
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText('Forceful Blow')).toBeInTheDocument();
        });

        it('shows descriptions for known effects', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText(/— Push target 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Reduce target Speed by 15 ft/)).toBeInTheDocument();
            expect(screen.getByText(/— Disadvantage on next save, no Opportunity Attacks/)).toBeInTheDocument();
            expect(screen.getByText(/— \+5 to next attack against target/)).toBeInTheDocument();
        });

        it('shows option name without description span for unknown effects', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Custom Effect' }] })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText('Custom Effect')).toBeInTheDocument();
            const labels = document.querySelectorAll('label');
            const customLabel = Array.from(labels).find(l => l.textContent.includes('Custom Effect'));
            const descSpan = customLabel.querySelector('span');
            expect(descSpan).toBeNull();
        });

        it('shows custom effect without description', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Custom Effect' }] })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByText('Custom Effect')).toBeInTheDocument();
            expect(screen.queryByText(/—/)).not.toBeInTheDocument();
        });
    });

    describe('brutalOnly mode — confirm behavior', () => {
        it('calls onConfirm with effect choices when brutal strike is applied (single select)', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: true, effectChoices: ['Forceful Blow'] });
        });

        it('calls onConfirm without effects when brutal strike is checked but none selected (single select)', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onConfirm with multiple effect choices (multi select)', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onConfirm, hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            fireEvent.click(screen.getByRole('button', { name: /Apply Brutal Strike/ }));
            expect(onConfirm).toHaveBeenCalledWith({ useBrutalStrike: true, effectChoices: ['Forceful Blow', 'Hamstring Blow'] });
        });
    });

    describe('brutalOnly mode — cancel behavior', () => {
        it('calls onCancel without attack when skip button is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onCancel })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onCancel).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
        });

        it('calls onCancel without attack when overlay is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onCancel })} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(onCancel).toHaveBeenCalledWith({ useBrutalStrike: false, effectChoices: [] });
        });

        it('does not call onCancel when modal content is clicked', () => {
            const onCancel = vi.fn();
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', onCancel })} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(onCancel).not.toHaveBeenCalled();
        });
    });

    describe('brutalOnly mode — confirm button disabled state', () => {
        it('is enabled when brutal strike is not enabled', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: false })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });

        it('is enabled when brutal strike is enabled but unchecked', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions })} />);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });

        it('is disabled when brutal strike is checked but no effect is selected (single select)', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).toBeDisabled();
        });

        it('is enabled when brutal strike is checked and an effect is selected (single select)', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(screen.getByRole('button', { name: /Apply Brutal Strike/ })).not.toBeDisabled();
        });
    });

    describe('brutalOnly mode — multi select toggle behavior', () => {
        it('limits selection to maxEffects', async () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(optionCheckboxes[1]);
            expect(getSelectedCountText()).toBe('2/2');
            fireEvent.click(optionCheckboxes[2]);
            await waitFor(() => {
                expect(getSelectedCountText()).toBe('2/2');
            });
        });

        it('switches selection when clicking a different option (single select)', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            fireEvent.click(radios[0]);
            expect(radios[0].checked).toBe(true);
            fireEvent.click(radios[1]);
            expect(radios[0].checked).toBe(false);
            expect(radios[1].checked).toBe(true);
        });
    });

    describe('brutalOnly mode — empty brutal strike options', () => {
        it('shows the toggle but no effect options when brutalStrikeOptions is empty', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions: [] })} />);
            expect(document.querySelector('input[type="checkbox"]')).toBeTruthy();
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });

    describe('input naming conventions', () => {
        it('uses radio input name "brutalOption" in single select mode', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 1 })} />);
            toggleBrutalStrikeCheckbox();
            const radios = document.querySelectorAll('input[type="radio"]');
            expect(radios[0].name).toBe('brutalOption');
            expect(radios[1].name).toBe('brutalOption');
        });

        it('uses indexed checkbox names in multi select mode', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            expect(optionCheckboxes[0].name).toBe('brutalOption_0');
            expect(optionCheckboxes[1].name).toBe('brutalOption_1');
        });
    });

    describe('clearing selections on toggle off', () => {
        it('clears selected effects when brutal strike is toggled off in full mode', () => {
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });

        it('clears selected effects when brutal strike is toggled off in brutalOnly mode', () => {
            render(<RecklessAttackModal {...makeProps({ mode: 'brutalOnly', hasBrutalStrike: true, brutalStrikeOptions, maxEffects: 2 })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            expect(getSelectedCountText()).toBe('1/2');
            toggleBrutalStrikeCheckbox();
            expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
        });
    });

    describe('edge cases', () => {
        it('handles single brutal option in multi-select mode', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Single Effect' }], maxEffects: 3, onConfirm })} />);
            toggleBrutalStrikeCheckbox();
            const optionCheckboxes = getOptionCheckboxes();
            fireEvent.click(optionCheckboxes[0]);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: true, effectChoices: ['Single Effect'] });
        });

        it('handles single brutal option in multi-select with no selection', () => {
            const onConfirm = vi.fn();
            render(<RecklessAttackModal {...makeProps({ hasBrutalStrike: true, brutalStrikeOptions: [{ name: 'Single Effect' }], maxEffects: 3, onConfirm })} />);
            fireEvent.click(screen.getByRole('button', { name: /Attack Recklessly/ }));
            expect(onConfirm).toHaveBeenCalledWith(defaultAttack, { useBrutalStrike: false, effectChoices: [] });
        });
    });
});
