// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionPicker from './ConditionPicker.jsx';
import { CONDITIONS } from '../../services/combat/conditions/conditionUtils.js';

describe('ConditionPicker', () => {
    let props;

    beforeEach(() => {
        vi.clearAllMocks();
        props = {
            targetName: 'Goblin',
            selected: null,
            dc: 10,
            ability: 'str',
            onSelect: vi.fn(),
            onDcChange: vi.fn(),
            onAbilityChange: vi.fn(),
            onCancel: vi.fn(),
            onApply: vi.fn(),
        };
    });

    // ------------------------------------------------------------------
    // Rendering — heading
    // ------------------------------------------------------------------

    describe('heading', () => {
        it('should render heading with target name', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByRole('heading', { name: /add condition to/i })).toBeInTheDocument();
        });

        it.each`
            targetName
            ${'Alice'}
            ${''}
            ${'Dragon'}
        `('should include target name "$targetName" in heading', ({ targetName }) => {
            render(<ConditionPicker {...props} targetName={targetName} />);
            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading.textContent).toContain(`Add Condition to ${targetName}`);
        });
    });

    // ------------------------------------------------------------------
    // Rendering — overlay and modal
    // ------------------------------------------------------------------

    describe('overlay and modal', () => {
        it('should render the overlay container', () => {
            render(<ConditionPicker {...props} />);
            expect(document.querySelector('.condition-picker-overlay')).toBeInTheDocument();
        });

        it('should render the modal container', () => {
            render(<ConditionPicker {...props} />);
            expect(document.querySelector('.condition-picker-modal')).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------
    // Rendering — conditions list
    // ------------------------------------------------------------------

    describe('conditions list', () => {
        it('should render all conditions from CONDITIONS', () => {
            render(<ConditionPicker {...props} />);
            CONDITIONS.forEach(({ label }) => {
                expect(screen.getByText(label)).toBeInTheDocument();
            });
        });

        it('should render condition buttons with correct type="button"', () => {
            render(<ConditionPicker {...props} />);
            const buttons = document.querySelectorAll('.condition-picker-badge');
            buttons.forEach(btn => expect(btn).toHaveAttribute('type', 'button'));
        });

        it('should render the correct number of condition buttons', () => {
            render(<ConditionPicker {...props} />);
            expect(document.querySelectorAll('.condition-picker-badge')).toHaveLength(CONDITIONS.length);
        });
    });

    // ------------------------------------------------------------------
    // Rendering — selected state
    // ------------------------------------------------------------------

    describe('selected condition visual state', () => {
        it('should apply selected class when a condition is selected', () => {
            render(<ConditionPicker {...props} selected="blinded" />);
            const selectedBtn = screen.getByText('Blinded');
            expect(selectedBtn).toHaveClass('condition-picker-badge--selected');
        });

        it('should not apply selected class to unselected conditions', () => {
            render(<ConditionPicker {...props} selected="blinded" />);
            const unselectedBtn = screen.getByText('Charmed');
            expect(unselectedBtn).not.toHaveClass('condition-picker-badge--selected');
        });
    });

    // ------------------------------------------------------------------
    // Rendering — DC and ability fields
    // ------------------------------------------------------------------

    describe('DC and ability fields', () => {
        it('should render a DC label', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByText('DC')).toBeInTheDocument();
        });

        it('should render a Save label', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        it('should render the DC input as a number input with min=1', () => {
            render(<ConditionPicker {...props} />);
            const dcInput = screen.getByRole('spinbutton');
            expect(dcInput).toHaveAttribute('type', 'number');
            expect(dcInput).toHaveAttribute('min', '1');
        });

        it('should render the DC input with the provided dc value', () => {
            render(<ConditionPicker {...props} dc={15} />);
            const dcInput = screen.getByRole('spinbutton');
            expect(dcInput.value).toBe('15');
        });

        it('should render a save ability select with all six ability options', () => {
            render(<ConditionPicker {...props} />);
            const select = screen.getByRole('combobox');
            const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
            expect(options).toEqual(['str', 'dex', 'con', 'int', 'wis', 'cha']);
        });

        it('should render the ability select with the provided ability value', () => {
            render(<ConditionPicker {...props} ability="dex" />);
            const select = screen.getByRole('combobox');
            expect(select.value).toBe('dex');
        });
    });

    // ------------------------------------------------------------------
    // Rendering — buttons
    // ------------------------------------------------------------------

    describe('buttons', () => {
        it('should render a Cancel button', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('should render an Apply button', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------
    // Apply button — disabled state
    // ------------------------------------------------------------------

    describe('Apply button disabled state', () => {
        it('should be disabled when no condition is selected', () => {
            render(<ConditionPicker {...props} />);
            expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
        });

        it.each`
            selected  | expected
            ${null}   | ${false}
            ${'blinded'} | ${true}
        `('should be enabled=$expected when selected is "$selected"', ({ selected, expected }) => {
            render(<ConditionPicker {...props} selected={selected} />);
            const applyBtn = screen.getByRole('button', { name: 'Apply' });
            if (expected) {
                expect(applyBtn).toBeEnabled();
            } else {
                expect(applyBtn).toBeDisabled();
            }
        });
    });

    // ------------------------------------------------------------------
    // Condition selection
    // ------------------------------------------------------------------

    describe('condition selection', () => {
        it('should call onSelect with the condition key when a condition is clicked', () => {
            render(<ConditionPicker {...props} />);
            fireEvent.click(screen.getByText('Blinded'));
            expect(props.onSelect).toHaveBeenCalledWith('blinded');
        });

        it('should call onAbilityChange with the default ability for the condition', () => {
            // blinded has no default ability (null), so it falls back to 'str'
            render(<ConditionPicker {...props} />);
            fireEvent.click(screen.getByText('Blinded'));
            expect(props.onAbilityChange).toHaveBeenCalledWith('str');
        });

        it('should call onAbilityChange with the condition\'s default ability when one exists', () => {
            // charmed defaults to 'wis'
            render(<ConditionPicker {...props} />);
            fireEvent.click(screen.getByText('Charmed'));
            expect(props.onAbilityChange).toHaveBeenCalledWith('wis');
        });

        it.each`
            conditionKey   | expectedAbility
            ${'blinded'}   | ${'str'}
            ${'charmed'}   | ${'wis'}
            ${'cursed'}    | ${'con'}
            ${'deafened'}  | ${'str'}
            ${'frightened'}| ${'wis'}
            ${'grappled'}  | ${'str'}
            ${'paralyzed'} | ${'con'}
            ${'poisoned'}  | ${'con'}
            ${'restrained'}| ${'str'}
            ${'slow'}      | ${'wis'}
            ${'stunned'}   | ${'con'}
        `('clicking "$conditionKey" should set ability to "$expectedAbility"', ({ conditionKey, expectedAbility }) => {
            render(<ConditionPicker {...props} />);
            fireEvent.click(screen.getByText(conditionKey.charAt(0).toUpperCase() + conditionKey.slice(1)));
            expect(props.onAbilityChange).toHaveBeenCalledWith(expectedAbility);
        });
    });

    // ------------------------------------------------------------------
    // Cancel interaction
    // ------------------------------------------------------------------

    describe('cancel', () => {
        it('should call onCancel when Cancel button is clicked', () => {
            render(<ConditionPicker {...props} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(props.onCancel).toHaveBeenCalled();
        });

        it('should call onCancel when overlay background is clicked', () => {
            render(<ConditionPicker {...props} />);
            const overlay = document.querySelector('.condition-picker-overlay');
            fireEvent.click(overlay);
            expect(props.onCancel).toHaveBeenCalled();
        });

        it('should NOT call onCancel when modal content is clicked', () => {
            render(<ConditionPicker {...props} />);
            const modal = document.querySelector('.condition-picker-modal');
            fireEvent.click(modal);
            expect(props.onCancel).not.toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // Apply button click
    // ------------------------------------------------------------------

    describe('apply', () => {
        it('should call onApply when Apply button is clicked', () => {
            render(<ConditionPicker {...props} selected="blinded" />);
            fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
            expect(props.onApply).toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // DC input interaction
    // ------------------------------------------------------------------

    describe('DC input', () => {
        it('should call onDcChange with parsed integer when DC input changes', () => {
            render(<ConditionPicker {...props} />);
            const dcInput = screen.getByRole('spinbutton');
            fireEvent.change(dcInput, { target: { value: '15' } });
            expect(props.onDcChange).toHaveBeenCalledWith(15);
        });

        it.each`
            inputValue | expected
            ${''}      | ${10}
            ${'abc'}   | ${10}
            ${'0'}     | ${10}
        `('should call onDcChange with $expected when input is "$inputValue"', ({ inputValue, expected }) => {
            render(<ConditionPicker {...props} />);
            const dcInput = screen.getByRole('spinbutton');
            fireEvent.change(dcInput, { target: { value: inputValue } });
            expect(props.onDcChange).toHaveBeenCalledWith(expected);
        });
    });

    // ------------------------------------------------------------------
    // Ability select interaction
    // ------------------------------------------------------------------

    describe('ability select', () => {
        it('should call onAbilityChange when save ability is changed', () => {
            render(<ConditionPicker {...props} />);
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'dex' } });
            expect(props.onAbilityChange).toHaveBeenCalledWith('dex');
        });

        it.each`
            ability
            ${'str'}
            ${'dex'}
            ${'con'}
            ${'int'}
            ${'wis'}
            ${'cha'}
        `('should call onAbilityChange with "$ability" when selected', ({ ability }) => {
            render(<ConditionPicker {...props} />);
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: ability } });
            expect(props.onAbilityChange).toHaveBeenCalledWith(ability);
        });
    });
});
