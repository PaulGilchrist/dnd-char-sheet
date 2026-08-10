import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureHp from './CreatureHp.jsx';

vi.mock('./HpBar.jsx', () => ({
    default: vi.fn(({ current, max }) => {
        const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
        return <div data-testid="hp-bar" className="hp-bar-container"><div className="hp-bar-fill" style={{ width: `${pct}%` }} /></div>;
    }),
}));

describe('CreatureHp', () => {
    let props;

    const defaultPlayerCreature = {
        name: 'Alice',
        type: 'player',
        currentHp: 15,
        maxHp: 20,
    };

    const defaultNpcCreature = {
        name: 'Goblin',
        type: 'npc',
        currentHp: 7,
        maxHp: 7,
    };

    beforeEach(() => {
        props = {
            creature: defaultPlayerCreature,
            isLocalhost: true,
            onChange: vi.fn(),
        };
    });

    describe('NPC creatures - non-localhost', () => {
        it.each`
            currentHp | maxHp   | expectedStatus
            ${0}      | ${7}    | ${'DEAD'}
            ${3}      | ${7}    | ${'BLOODIED'}
            ${11}     | ${20}   | ${'OK'}
        `('should show $expectedStatus status badge when currentHp is $currentHp / maxHp $maxHp', ({ currentHp, maxHp, expectedStatus }) => {
            const creature = { ...defaultNpcCreature, currentHp, maxHp };
            render(<CreatureHp {...props} creature={creature} isLocalhost={false} />);
            expect(screen.getByText(expectedStatus)).toBeInTheDocument();
        });
    });

    describe('NPC summoned creatures - non-localhost', () => {
        it('should show HP text without status badges when isPlayerSummoned is true', () => {
            const creature = { ...defaultNpcCreature, currentHp: 3, maxHp: 7 };
            render(<CreatureHp {...props} creature={creature} isLocalhost={false} isPlayerSummoned={true} />);
            expect(screen.getByText('HP')).toBeInTheDocument();
            expect(screen.getByText('3/7')).toBeInTheDocument();
            expect(screen.queryByText('BLOODIED')).not.toBeInTheDocument();
        });

        it('should show HP text with full HP for summoned creatures', () => {
            const creature = { ...defaultNpcCreature, currentHp: 7, maxHp: 7 };
            render(<CreatureHp {...props} creature={creature} isLocalhost={false} isPlayerSummoned={true} />);
            expect(screen.getByText('HP')).toBeInTheDocument();
            expect(screen.getByText('7/7')).toBeInTheDocument();
        });
    });

    describe('NPC creatures - localhost', () => {
        it.each`
            inputValue | expectedCall
            ${'5'}     | ${['Goblin', 5]}
            ${'abc'}   | ${['Goblin', 0]}
        `('should call onChange with $expectedCall when current HP input is "$inputValue"', ({ inputValue, expectedCall }) => {
            render(<CreatureHp {...props} creature={defaultNpcCreature} isLocalhost={true} />);
            const currentInput = document.querySelectorAll('.hp-inline-input')[0];
            fireEvent.blur(currentInput, { target: { value: inputValue } });
            expect(props.onChange).toHaveBeenCalledWith(...expectedCall);
        });

        it('should call onChange when pressing Enter on current HP input', () => {
            render(<CreatureHp {...props} creature={defaultNpcCreature} isLocalhost={true} />);
            const currentInput = document.querySelectorAll('.hp-inline-input')[0];
            fireEvent.keyDown(currentInput, { key: 'Enter' });
            expect(currentInput.closest('.hp-inline-row').textContent).toContain('HP');
        });

        it('should call onChange with capped currentHp when max HP input blurs below current', () => {
            const creature = { ...defaultNpcCreature, currentHp: 10, maxHp: 10 };
            render(<CreatureHp {...props} creature={creature} isLocalhost={true} />);
            const maxInput = document.querySelectorAll('.hp-inline-input')[1];
            fireEvent.blur(maxInput, { target: { value: '5' } });
            expect(props.onChange).toHaveBeenCalledWith('Goblin', 5);
        });

        it('should call onBlur when pressing Enter on max HP input', () => {
            render(<CreatureHp {...props} creature={defaultNpcCreature} isLocalhost={true} />);
            const maxInput = document.querySelectorAll('.hp-inline-input')[1];
            fireEvent.keyDown(maxInput, { key: 'Enter' });
            expect(maxInput.closest('.hp-inline-row').textContent).toContain('HP');
        });
    });

    describe('player creatures - localhost', () => {
        it.each`
            inputValue | expectedCall
            ${'10'}    | ${['Alice', 10]}
            ${'xyz'}   | ${['Alice', 0]}
        `('should call onChange with $expectedCall when current HP input is "$inputValue"', ({ inputValue, expectedCall }) => {
            render(<CreatureHp {...props} isLocalhost={true} />);
            const currentInput = document.querySelector('.hp-inline-input');
            fireEvent.blur(currentInput, { target: { value: inputValue } });
            expect(props.onChange).toHaveBeenCalledWith(...expectedCall);
        });

        it('should call onBlur when pressing Enter on current HP input', () => {
            render(<CreatureHp {...props} isLocalhost={true} />);
            const currentInput = document.querySelector('.hp-inline-input');
            fireEvent.keyDown(currentInput, { key: 'Enter' });
            expect(currentInput.closest('.hp-inline-row').textContent).toContain('HP');
        });
    });

    describe('player creatures - non-localhost', () => {
        it('should show HP text without editable inputs', () => {
            render(<CreatureHp {...props} isLocalhost={false} />);
            expect(screen.getByText('HP')).toBeInTheDocument();
            expect(screen.getByText('15/20')).toBeInTheDocument();
            expect(document.querySelector('.hp-inline-input')).not.toBeInTheDocument();
        });
    });

    describe('missing HP values fallback', () => {
        it('should default currentHp to 0 when undefined (localhost, shows editable)', () => {
            const creature = { ...defaultNpcCreature, currentHp: undefined, maxHp: 10 };
            render(<CreatureHp {...props} creature={creature} isLocalhost={true} />);
            const currentInput = document.querySelectorAll('.hp-inline-input')[0];
            expect(currentInput).toBeInTheDocument();
            expect(currentInput.value).toBe('0');
        });

        it('should default maxHp to 1 when undefined (localhost, shows editable)', () => {
            const creature = { ...defaultNpcCreature, currentHp: 5, maxHp: undefined };
            render(<CreatureHp {...props} creature={creature} isLocalhost={true} />);
            const maxInput = document.querySelectorAll('.hp-inline-input')[1];
            expect(maxInput).toBeInTheDocument();
            expect(maxInput.value).toBe('1');
        });

        it('should default both to 0/1 when both are undefined (non-localhost shows DEAD)', () => {
            const creature = { ...defaultNpcCreature, currentHp: undefined, maxHp: undefined };
            render(<CreatureHp {...props} creature={creature} isLocalhost={false} />);
            expect(screen.getByText('DEAD')).toBeInTheDocument();
        });
    });
});
