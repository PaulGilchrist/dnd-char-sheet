import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SecondaryTargetModals from './SecondaryTargetModals.jsx';

function makeHandlers() {
    return {
        handleSweepingAttackConfirm: vi.fn(),
        handleBaitAndSwitchChoiceConfirm: vi.fn(),
        handleCommanderStrikeChoiceConfirm: vi.fn(),
        handleRallyChoiceConfirm: vi.fn(),
        handleTricksterBlessingConfirm: vi.fn(),
        handleBardicInspirationConfirm: vi.fn(),
        handleInspiringMovementConfirm: vi.fn(),
        handleOceanicGiftConfirm: vi.fn(),
        handleDestructiveStrideTargetConfirm: vi.fn(),
        handleDestructiveStrideTargetSkip: vi.fn(),
        handleStarryChaliceConfirm: vi.fn(),
    };
}

function makeOceanicModal(overrides = {}) {
    return {
        action: { name: 'Oceanic Gift' },
        playerStats: { name: 'Wild_Sage_Druid' },
        campaignName: 'test-campaign',
        creatureTargets: [{ name: 'HexWarlock', type: 'player' }],
        spellSaveDc: 17,
        wisMod: 3,
        doubleEmanation: false,
        cost: 1,
        availableUses: 3,
        ...overrides,
    };
}

function renderOceanic(modalOverrides = {}) {
    const handlers = makeHandlers();
    const setModalState = vi.fn();
    render(
        <SecondaryTargetModals
            mergedModalState={{ oceanicGiftTargetModal: makeOceanicModal(modalOverrides) }}
            setModalState={setModalState}
            {...handlers}
        />
    );
    return handlers;
}

describe('SecondaryTargetModals - Oceanic Gift variant toggle (CLA-240)', () => {
    it('offers a self+ally variant toggle in the single-target chooser', () => {
        renderOceanic();
        const toggle = screen.getByRole('checkbox');
        expect(toggle).toBeTruthy();
        expect(toggle.checked).toBe(false);
        expect(toggle.disabled).toBe(false);
    });

    it('shows the single-ally title while the toggle is unchecked', () => {
        renderOceanic();
        expect(screen.getByText(/Oceanic Gift — Choose Ally/).textContent).not.toContain('Self + Ally');
    });

    it('switches to the Self + Ally (2 Wild Shape) title when the toggle is checked', () => {
        renderOceanic();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(screen.getByText(/Oceanic Gift — Choose Ally \(Self \+ Ally, 2 Wild Shape\)/)).toBeTruthy();
        expect(screen.getByText(/Costs 2 Wild Shape uses/)).toBeTruthy();
    });

    it('dispatches doubleEmanation:true when confirming with the toggle checked', () => {
        const handlers = renderOceanic();
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByText('HexWarlock'));
        fireEvent.click(screen.getByText('Grant Wrath of the Sea'));
        expect(handlers.handleOceanicGiftConfirm).toHaveBeenCalledWith('HexWarlock', true);
    });

    it('still dispatches doubleEmanation:false for the verified single-ally flow', () => {
        const handlers = renderOceanic();
        fireEvent.click(screen.getByText('HexWarlock'));
        fireEvent.click(screen.getByText('Grant Wrath of the Sea'));
        expect(handlers.handleOceanicGiftConfirm).toHaveBeenCalledWith('HexWarlock', false);
    });

    it('disables the toggle when fewer than 2 Wild Shape uses remain', () => {
        renderOceanic({ availableUses: 1 });
        expect(screen.getByRole('checkbox').disabled).toBe(true);
    });

    it('hides the toggle when the payload is already the double automation entry', () => {
        renderOceanic({ doubleEmanation: true, availableUses: 2, cost: 2 });
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.getByText(/Oceanic Gift — Choose Ally \(Self \+ Ally, 2 Wild Shape\)/)).toBeTruthy();
    });

    it('resets the toggle after the modal closes and reopens', () => {
        const handlers = makeHandlers();
        const setModalState = vi.fn();
        const { rerender } = render(
            <SecondaryTargetModals
                mergedModalState={{ oceanicGiftTargetModal: makeOceanicModal() }}
                setModalState={setModalState}
                {...handlers}
            />
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(screen.getByRole('checkbox').checked).toBe(true);
        rerender(
            <SecondaryTargetModals
                mergedModalState={{ oceanicGiftTargetModal: null }}
                setModalState={setModalState}
                {...handlers}
            />
        );
        rerender(
            <SecondaryTargetModals
                mergedModalState={{ oceanicGiftTargetModal: makeOceanicModal() }}
                setModalState={setModalState}
                {...handlers}
            />
        );
        expect(screen.getByRole('checkbox').checked).toBe(false);
        fireEvent.click(screen.getByText('HexWarlock'));
        fireEvent.click(screen.getByText('Grant Wrath of the Sea'));
        expect(handlers.handleOceanicGiftConfirm).toHaveBeenCalledWith('HexWarlock', false);
    });

    it('renders no variant toggle for other secondary target modals', () => {
        render(
            <SecondaryTargetModals
                mergedModalState={{
                    rallyChoiceModal: { allyOptions: [{ name: 'AllyOne' }], description: 'Rally' },
                }}
                setModalState={vi.fn()}
                {...makeHandlers()}
            />
        );
        expect(screen.queryByRole('checkbox')).toBeNull();
    });
});
