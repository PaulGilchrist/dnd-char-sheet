// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConcentrationPicker from './ConcentrationPicker.jsx';

describe('ConcentrationPicker', () => {
    let props;

    beforeEach(() => {
        vi.clearAllMocks();
        props = {
            targetName: 'Goblin',
            spellName: 'Fireball',
            dc: 15,
            onSpellNameChange: vi.fn(),
            onDcChange: vi.fn(),
            onCancel: vi.fn(),
            onApply: vi.fn(),
        };
    });

    // ------------------------------------------------------------------
    // Rendering — heading
    // ------------------------------------------------------------------

    describe('heading', () => {
        it('should render heading with target name', () => {
            render(<ConcentrationPicker {...props} />);
            expect(screen.getByRole('heading', { name: 'Concentration for Goblin' })).toBeInTheDocument();
        });

        it.each`
            targetName
            ${'Alice'}
            ${''}
            ${'Dragon'}
        `('should render target name "$targetName" in the heading', ({ targetName }) => {
            render(<ConcentrationPicker {...props} targetName={targetName} />);
            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading.textContent).toContain(`Concentration for ${targetName}`);
        });
    });

    // ------------------------------------------------------------------
    // Rendering — overlay and modal
    // ------------------------------------------------------------------

    describe('overlay and modal', () => {
        it('should render the overlay container', () => {
            render(<ConcentrationPicker {...props} />);
            expect(document.querySelector('.condition-picker-overlay')).toBeInTheDocument();
        });

        it('should render the modal container', () => {
            render(<ConcentrationPicker {...props} />);
            expect(document.querySelector('.condition-picker-modal')).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------
    // Rendering — labels
    // ------------------------------------------------------------------

    describe('labels', () => {
        it('should render a Spell label', () => {
            render(<ConcentrationPicker {...props} />);
            expect(screen.getByText('Spell')).toBeInTheDocument();
        });

        it('should render a DC label', () => {
            render(<ConcentrationPicker {...props} />);
            expect(screen.getByText('DC')).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------
    // Rendering — buttons
    // ------------------------------------------------------------------

    describe('buttons', () => {
        it('should render a Cancel button', () => {
            render(<ConcentrationPicker {...props} />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('should render an Apply button', () => {
            render(<ConcentrationPicker {...props} />);
            expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------
    // Apply button — disabled state
    // ------------------------------------------------------------------

    describe('Apply button disabled state', () => {
        it.each`
            spellName       | expectedDisabled
            ${''}           | ${true}
            ${'Fireball'}   | ${false}
            ${'   '}        | ${true}
        `('should be $expectedDisabled when spellName is "$spellName"',
            ({ spellName, expectedDisabled }) => {
                render(<ConcentrationPicker {...props} spellName={spellName} />);
                const applyBtn = screen.getByRole('button', { name: 'Apply' });
                if (expectedDisabled) {
                    expect(applyBtn).toBeDisabled();
                } else {
                    expect(applyBtn).toBeEnabled();
                }
            });
    });

    // ------------------------------------------------------------------
    // Spell name input interaction
    // ------------------------------------------------------------------

    describe('spell name input', () => {
        it('should call onSpellNameChange when spell input changes', () => {
            render(<ConcentrationPicker {...props} />);
            const spellInput = screen.getByLabelText('Spell');
            fireEvent.change(spellInput, { target: { value: 'Lightning Bolt' } });
            expect(props.onSpellNameChange).toHaveBeenCalledWith('Lightning Bolt');
        });

        it('should render the spell input with the provided spellName value', () => {
            render(<ConcentrationPicker {...props} spellName='Custom Spell' />);
            const spellInput = screen.getByLabelText('Spell');
            expect(spellInput.value).toBe('Custom Spell');
        });
    });

    // ------------------------------------------------------------------
    // DC input interaction
    // ------------------------------------------------------------------

    describe('DC input', () => {
        it('should call onDcChange with parsed integer when DC input changes', () => {
            render(<ConcentrationPicker {...props} />);
            const dcInput = screen.getByLabelText('DC');
            fireEvent.change(dcInput, { target: { value: '20' } });
            expect(props.onDcChange).toHaveBeenCalledWith(20);
        });

        it.each`
            inputValue | expected
            ${''}      | ${10}
            ${'abc'}   | ${10}
            ${'0'}     | ${10}
        `('should call onDcChange with $expected when input is "$inputValue"', ({ inputValue, expected }) => {
            render(<ConcentrationPicker {...props} />);
            const dcInput = screen.getByLabelText('DC');
            fireEvent.change(dcInput, { target: { value: inputValue } });
            expect(props.onDcChange).toHaveBeenCalledWith(expected);
        });
    });

    // ------------------------------------------------------------------
    // Apply button click
    // ------------------------------------------------------------------

    describe('Apply button click', () => {
        it('should call onApply when Apply button is clicked', () => {
            render(<ConcentrationPicker {...props} />);
            fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
            expect(props.onApply).toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // Cancel interaction
    // ------------------------------------------------------------------

    describe('cancel', () => {
        it('should call onCancel when Cancel button is clicked', () => {
            render(<ConcentrationPicker {...props} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(props.onCancel).toHaveBeenCalled();
        });

        it('should call onCancel when overlay background is clicked', () => {
            render(<ConcentrationPicker {...props} />);
            const overlay = document.querySelector('.condition-picker-overlay');
            fireEvent.click(overlay);
            expect(props.onCancel).toHaveBeenCalled();
        });

        it('should NOT call onCancel when modal content is clicked', () => {
            render(<ConcentrationPicker {...props} />);
            const modal = document.querySelector('.condition-picker-modal');
            fireEvent.click(modal);
            expect(props.onCancel).not.toHaveBeenCalled();
        });
    });
});
