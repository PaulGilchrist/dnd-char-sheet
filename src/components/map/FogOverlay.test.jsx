// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FogOverlay from './FogOverlay.jsx';

const getRects = (queryContainer) => queryContainer.querySelectorAll('rect');

describe('FogOverlay', () => {
    describe('early return guards', () => {
        it('renders null when isLocalhost is false regardless of fog content', () => {
            const { container } = render(
                <FogOverlay fog={new Set(['0,0'])} isLocalhost={false} />
            );
            expect(container.innerHTML).toBe('');
        });

        it('renders null when fog is null even if isLocalhost is true', () => {
            const { container } = render(
                <FogOverlay fog={null} isLocalhost={true} />
            );
            expect(container.innerHTML).toBe('');
        });

        it('renders null when fog is undefined even if isLocalhost is true', () => {
            const { container } = render(
                <FogOverlay isLocalhost={true} />
            );
            expect(container.innerHTML).toBe('');
        });
    });

    describe('rect rendering', () => {
        it('renders no rects for empty fog set', () => {
            const { container } = render(
                <FogOverlay fog={new Set()} isLocalhost={true} />
            );
            expect(getRects(container).length).toBe(0);
        });

        it('renders one rect per fog entry', () => {
            const fog = new Set(['0,0', '1,0', '2,1']);
            const { container } = render(
                <FogOverlay fog={fog} isLocalhost={true} />
            );
            expect(getRects(container).length).toBe(3);
        });

        it('positions rects at correct pixel coordinates based on CELL_SIZE', () => {
            const fog = new Set(['0,0', '1,0', '2,1']);
            const { container } = render(
                <FogOverlay fog={fog} isLocalhost={true} />
            );
            const rects = getRects(container);

            const positions = Array.from(rects).map((rect) => ({
                x: Number(rect.getAttribute('x')),
                y: Number(rect.getAttribute('y')),
            }));

            expect(positions).toContainEqual({ x: 0, y: 0 });
            expect(positions).toContainEqual({ x: 40, y: 0 });
            expect(positions).toContainEqual({ x: 80, y: 40 });
        });

        it('applies correct width and height attributes matching CELL_SIZE', () => {
            const { container } = render(
                <FogOverlay fog={new Set(['0,0'])} isLocalhost={true} />
            );
            const rect = container.querySelector('rect');
            expect(rect).toHaveAttribute('width', '40');
            expect(rect).toHaveAttribute('height', '40');
        });

        it('applies the no-print and fog-cell classes', () => {
            const { container } = render(
                <FogOverlay fog={new Set(['0,0'])} isLocalhost={true} />
            );
            const rect = container.querySelector('rect');
            expect(rect).toHaveClass('no-print');
            expect(rect).toHaveClass('fog-cell');
        });

        it('handles negative coordinates correctly', () => {
            const fog = new Set(['-1,-1']);
            const { container } = render(
                <FogOverlay fog={fog} isLocalhost={true} />
            );
            const rect = container.querySelector('rect');
            expect(rect).toHaveAttribute('x', '-40');
            expect(rect).toHaveAttribute('y', '-40');
        });
    });
});
