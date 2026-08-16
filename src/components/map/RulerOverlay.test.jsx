// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RulerOverlay from './RulerOverlay.jsx';

const CELL_SIZE = 50;
const makeStart = (gx, gy) => ({ gridX: gx, gridY: gy });
const makeEnd = (gx, gy) => ({ gridX: gx, gridY: gy });

describe('RulerOverlay', () => {
    describe('falsy inputs', () => {
        it('returns null when start is falsy', () => {
            expect(RulerOverlay({ start: null, end: { gridX: 1, gridY: 1 }, cellSize: CELL_SIZE })).toBeNull();
            expect(RulerOverlay({ start: undefined, end: { gridX: 1, gridY: 1 }, cellSize: CELL_SIZE })).toBeNull();
            expect(RulerOverlay({ start: 0, end: { gridX: 1, gridY: 1 }, cellSize: CELL_SIZE })).toBeNull();
        });
    });

    describe('single point (end is null)', () => {
        it('renders a group with exactly one circle and no line or label', () => {
            const start = makeStart(2, 3);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={null} cellSize={CELL_SIZE} />
                </svg>
            );
            const group = container.querySelector('g.ruler-group');
            expect(group).toBeInTheDocument();
            const circles = container.querySelectorAll('circle.ruler-point');
            expect(circles.length).toBe(1);
            expect(group.querySelector('line.ruler-line')).not.toBeInTheDocument();
            expect(group.querySelector('g.ruler-label')).not.toBeInTheDocument();
        });
    });

    describe('ruler with start and end', () => {
        it('renders line, two points, and label group with correct coordinates', () => {
            const start = makeStart(0, 0);
            const end = makeEnd(3, 4);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const group = container.querySelector('g.ruler-group');
            expect(group).toBeInTheDocument();

            const line = container.querySelector('line.ruler-line');
            expect(line).toBeInTheDocument();
            expect(line.getAttribute('x1')).toBe('25');
            expect(line.getAttribute('y1')).toBe('25');
            expect(line.getAttribute('x2')).toBe('175');
            expect(line.getAttribute('y2')).toBe('225');

            const circles = container.querySelectorAll('circle.ruler-point');
            expect(circles.length).toBe(2);
            expect(circles[0].getAttribute('cx')).toBe('25');
            expect(circles[0].getAttribute('cy')).toBe('25');
            expect(circles[1].getAttribute('cx')).toBe('175');
            expect(circles[1].getAttribute('cy')).toBe('225');

            const label = container.querySelector('g.ruler-label');
            expect(label).toBeInTheDocument();
            const text = label.querySelector('text');
            expect(text.textContent).toBe('25 ft (5 cells)');
        });

        it('positions label at the midpoint between start and end', () => {
            const start = makeStart(1, 1);
            const end = makeEnd(4, 2);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('16 ft (3 cells)');
            expect(text.getAttribute('x')).toBe('150');
            expect(label.querySelector('rect').getAttribute('x')).toBe('95.25');
        });
    });

    describe('label text content', () => {
        it.each`
            cells | expectedText
            ${1}  | ${'5 ft (1 cell)'}
            ${2}  | ${'10 ft (2 cells)'}
            ${3}  | ${'15 ft (3 cells)'}
            ${4}  | ${'20 ft (4 cells)'}
            ${5}  | ${'25 ft (5 cells)'}
        `('displays "$expectedText" for $cells cells', ({ cells, expectedText }) => {
            const start = makeStart(0, 0);
            const end = makeEnd(cells, 0);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe(expectedText);
        });

        it('displays "0 ft (<1 cells)" for zero-length ruler', () => {
            const start = makeStart(2, 3);
            const end = makeEnd(2, 3);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('0 ft (<1 cells)');
        });
    });

    describe('diagonal distances', () => {
        it('renders 3,4 diagonal as 25 ft (5 cells)', () => {
            const start = makeStart(0, 0);
            const end = makeEnd(3, 4);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('25 ft (5 cells)');
        });

        it('renders 1,1 diagonal as 7 ft (1 cell)', () => {
            const start = makeStart(0, 0);
            const end = makeEnd(1, 1);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('7 ft (1 cell)');
        });

        it('shows <1 cell for fractional diagonal distance', () => {
            const start = makeStart(0, 0);
            const end = makeEnd(0, 1);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('5 ft (1 cell)');
        });
    });

    describe('edge cases', () => {
        it('handles negative grid coordinates', () => {
            const start = makeStart(-2, -1);
            const end = makeEnd(1, 2);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={CELL_SIZE} />
                </svg>
            );
            const line = container.querySelector('line.ruler-line');
            expect(line).toBeInTheDocument();
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('21 ft (4 cells)');
        });

        it('uses different cellSize for coordinate calculations', () => {
            const start = makeStart(1, 1);
            const end = makeEnd(2, 1);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={start} end={end} cellSize={40} />
                </svg>
            );
            const line = container.querySelector('line.ruler-line');
            expect(line.getAttribute('x1')).toBe('60');
            expect(line.getAttribute('x2')).toBe('100');
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('5 ft (1 cell)');
        });

        it('displays 0 ft when start and end are identical', () => {
            const point = makeStart(5, 5);
            const { container } = render(
                <svg width={500} height={500}>
                    <RulerOverlay start={point} end={point} cellSize={CELL_SIZE} />
                </svg>
            );
            const label = container.querySelector('g.ruler-label');
            const text = label.querySelector('text');
            expect(text.textContent).toBe('0 ft (<1 cells)');
        });
    });
});
