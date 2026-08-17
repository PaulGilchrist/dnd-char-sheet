// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TravelPathLayer from './TravelPathLayer.jsx';

vi.mock('../../services/maps/hexMapUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        hexToPixel: vi.fn(actual.hexToPixel),
    };
});

const defaultPath = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: 1 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
];

const renderLayer = (overrides = {}) =>
    render(<TravelPathLayer path={defaultPath} pathIndex={2} {...overrides} />);

describe('TravelPathLayer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('null/empty path handling', () => {
        it.each([
            ['null', null],
            ['undefined', undefined],
            ['an empty array', []],
        ])('renders nothing when path is %s', (_label, value) => {
            const { container } = render(<TravelPathLayer path={value} pathIndex={2} />);
            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('layer structure', () => {
        it('renders a non-interactive travel-path-layer group', () => {
            const { container } = renderLayer();
            const layer = container.querySelector('g.travel-path-layer');
            expect(layer).toBeInTheDocument();
            expect(layer).toHaveAttribute('pointer-events', 'none');
        });
    });

    describe('path polylines', () => {
        it('renders two polylines for behind and ahead portions', () => {
            const { container } = renderLayer();
            expect(container.querySelectorAll('polyline')).toHaveLength(2);
        });

        it('omits the behind polyline when pathIndex is 0', () => {
            const { container } = renderLayer({ pathIndex: 0 });
            expect(container.querySelectorAll('polyline')).toHaveLength(1);
        });

        it.each([5, 10])('omits the ahead polyline when pathIndex (%i) reaches or passes the end', (pathIndex) => {
            const { container } = renderLayer({ pathIndex });
            expect(container.querySelector('polyline[stroke-opacity="0.8"]')).not.toBeInTheDocument();
        });
    });

    describe('current position halo', () => {
        it('renders a halo circle when pathIndex points to a valid hex', () => {
            const { container } = renderLayer();
            expect(container.querySelector('circle')).toBeInTheDocument();
        });

        it.each([-1, 5, 10])('omits the halo circle when pathIndex (%i) is invalid', (pathIndex) => {
            const { container } = renderLayer({ pathIndex });
            expect(container.querySelector('circle')).not.toBeInTheDocument();
        });
    });

    describe('destination marker', () => {
        it('renders a dashed square and label at the last hex', () => {
            const { container } = renderLayer();
            expect(container.querySelector('rect[stroke-dasharray="5 3"]')).toBeInTheDocument();
            expect(screen.getByText('D')).toBeInTheDocument();
        });
    });
});
