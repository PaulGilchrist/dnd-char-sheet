// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HpBar from './HpBar.jsx';

describe('HpBar', () => {
    describe('DOM structure', () => {
        it('should render a container div with .hp-bar-container class', () => {
            const { container } = render(<HpBar current={10} max={20} />);
            expect(container.querySelector('.hp-bar-container')).toBeInTheDocument();
        });

        it('should render a fill div with .hp-bar-fill class inside the container', () => {
            const { container } = render(<HpBar current={10} max={20} />);
            expect(container.querySelector('.hp-bar-fill')).toBeInTheDocument();
        });
    });

    describe('percentage calculation', () => {
        it.each`
            current  | max     | expectedWidth
            ${10}    | ${20}   | ${'50%'}
            ${20}    | ${20}   | ${'100%'}
            ${30}    | ${20}   | ${'100%'}
            ${-5}    | ${20}   | ${'0%'}
            ${0}     | ${20}   | ${'0%'}
            ${10}    | ${0}    | ${'0%'}
            ${5}     | ${10}   | ${'50%'}
            ${1}     | ${10}   | ${'10%'}
            ${9}     | ${10}   | ${'90%'}
        `(
            'renders width $expectedWidth for current=$current, max=$max',
            ({ current, max, expectedWidth }) => {
                const { container } = render(<HpBar current={current} max={max} />);
                const fill = container.querySelector('.hp-bar-fill');
                expect(fill).toHaveStyle({ width: expectedWidth });
            },
        );
    });

    describe('color thresholds', () => {
        it.each`
            current  | max    | expectedColor
            ${51}    | ${100} | ${'#2ecc71'}
            ${50}    | ${100} | ${'#f1c40f'}
            ${26}    | ${100} | ${'#f1c40f'}
            ${25}    | ${100} | ${'#e74c3c'}
            ${0}     | ${20}  | ${'#e74c3c'}
            ${100}   | ${100} | ${'#2ecc71'}
            ${1}     | ${100} | ${'#e74c3c'}
        `(
            'renders color $expectedColor for current=$current, max=$max',
            ({ current, max, expectedColor }) => {
                const { container } = render(<HpBar current={current} max={max} />);
                const fill = container.querySelector('.hp-bar-fill');
                expect(fill).toHaveStyle({ backgroundColor: expectedColor });
            },
        );
    });
});
