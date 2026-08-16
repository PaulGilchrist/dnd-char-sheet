// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HEX_SIZE } from '../../config/outdoorConfig.js';
import * as hexMapUtils from '../../services/maps/hexMapUtils.js';
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

const getLayer = (container) => container.querySelector('g.travel-path-layer');
const getPolyline = (container, opacity) =>
    container.querySelector(`polyline[stroke-opacity="${opacity}"]`);
const getDestRect = (container) => container.querySelector('rect[stroke-dasharray="5 3"]');
const pixelOf = (hex) => hexMapUtils.hexToPixel(hex.q, hex.r, HEX_SIZE);
const pointsOf = (hexes) => hexes.map(pixelOf).map(p => `${p.x},${p.y}`).join(' ');

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

    describe('rendering', () => {
        it('renders a non-interactive travel-path-layer group', () => {
            const { container } = renderLayer();
            const layer = getLayer(container);
            expect(layer).toBeInTheDocument();
            expect(layer).toHaveAttribute('pointer-events', 'none');
        });
    });

    describe('path polylines', () => {
        it('renders one polyline for the behind portion and one for the ahead portion of the path', () => {
            const { container } = renderLayer();
            expect(container.querySelectorAll('polyline')).toHaveLength(2);
        });

        it('renders the behind polyline as a dim dashed gold stroke', () => {
            const { container } = renderLayer();
            const behind = getPolyline(container, '0.4');
            expect(behind).toBeInTheDocument();
            expect(behind).toHaveAttribute('stroke', '#FFD700');
            expect(behind).toHaveAttribute('stroke-width', '2');
            expect(behind).toHaveAttribute('stroke-dasharray', '4 3');
            expect(behind).toHaveAttribute('fill', 'none');
        });

        it('renders the ahead polyline as a bright dashed gold stroke', () => {
            const { container } = renderLayer();
            const ahead = getPolyline(container, '0.8');
            expect(ahead).toBeInTheDocument();
            expect(ahead).toHaveAttribute('stroke', '#FFD700');
            expect(ahead).toHaveAttribute('stroke-width', '3');
            expect(ahead).toHaveAttribute('stroke-dasharray', '6 4');
            expect(ahead).toHaveAttribute('fill', 'none');
        });

        it('draws the behind polyline through the pixel centers of the hexes before pathIndex', () => {
            const { container } = renderLayer({ pathIndex: 2 });
            expect(getPolyline(container, '0.4')).toHaveAttribute('points', pointsOf(defaultPath.slice(0, 2)));
        });

        it('draws the ahead polyline through the pixel centers of the hexes from pathIndex onward', () => {
            const { container } = renderLayer({ pathIndex: 2 });
            expect(getPolyline(container, '0.8')).toHaveAttribute('points', pointsOf(defaultPath.slice(2)));
        });

        it('omits the behind polyline when pathIndex is the first step', () => {
            const { container } = renderLayer({ pathIndex: 0 });
            expect(getPolyline(container, '0.4')).not.toBeInTheDocument();
        });

        it.each([5, 10])('omits the ahead polyline when pathIndex (%i) reaches or passes the end of the path', (pathIndex) => {
            const { container } = renderLayer({ pathIndex });
            expect(getPolyline(container, '0.8')).not.toBeInTheDocument();
        });
    });

    describe('current position halo', () => {
        it('renders a gold halo circle at the current hex for a valid pathIndex', () => {
            const { container } = renderLayer();
            const circle = container.querySelector('circle');
            expect(circle).toBeInTheDocument();
            expect(circle).toHaveAttribute('r', String(HEX_SIZE * 0.6));
            expect(circle).toHaveAttribute('stroke', '#FFD700');
            expect(circle).toHaveAttribute('stroke-width', '2');
            expect(circle).toHaveAttribute('fill', 'rgba(255, 215, 0, 0.15)');
        });

        it('centers the halo circle on the pixel center of the current hex', () => {
            const { container } = renderLayer({ pathIndex: 2 });
            const current = pixelOf(defaultPath[2]);
            const circle = container.querySelector('circle');
            expect(parseFloat(circle.getAttribute('cx'))).toBeCloseTo(current.x);
            expect(parseFloat(circle.getAttribute('cy'))).toBeCloseTo(current.y);
        });

        it.each([5, 10])('omits the halo circle when pathIndex (%i) reaches or passes the end of the path', (pathIndex) => {
            const { container } = renderLayer({ pathIndex });
            expect(container.querySelector('circle')).not.toBeInTheDocument();
        });

        it('renders the layer without a halo circle when pathIndex is negative', () => {
            const { container } = renderLayer({ pathIndex: -1 });
            expect(getLayer(container)).toBeInTheDocument();
            expect(container.querySelector('circle')).not.toBeInTheDocument();
        });
    });

    describe('destination marker', () => {
        it('renders the destination marker at the first step and beyond the end of the path', () => {
            const { container: c1 } = renderLayer({ pathIndex: 0 });
            const { container: c2 } = renderLayer({ pathIndex: 5 });
            expect(c1.querySelector('text')).toBeInTheDocument();
            expect(c2.querySelector('text')).toBeInTheDocument();
        });

        it('renders the destination marker as a dashed gold square', () => {
            const { container } = renderLayer();
            const rect = getDestRect(container);
            expect(rect).toBeInTheDocument();
            expect(rect).toHaveAttribute('width', '36');
            expect(rect).toHaveAttribute('height', '36');
            expect(rect).toHaveAttribute('stroke', '#FFD700');
            expect(rect).toHaveAttribute('stroke-width', '2.5');
            expect(rect).toHaveAttribute('rx', '4');
            expect(rect).toHaveAttribute('stroke-dasharray', '5 3');
            expect(rect).toHaveAttribute('fill', 'none');
        });

        it('renders the destination label as a bold gold D', () => {
            renderLayer();
            const text = screen.getByText('D');
            expect(text).toHaveAttribute('fill', '#FFD700');
            expect(text).toHaveAttribute('font-size', '9');
            expect(text).toHaveAttribute('font-weight', 'bold');
            expect(text).toHaveAttribute('text-anchor', 'middle');
        });

        it('centers the destination square and label on the last hex of the path', () => {
            const { container } = renderLayer();
            const dest = pixelOf(defaultPath[defaultPath.length - 1]);
            const rect = getDestRect(container);
            expect(parseFloat(rect.getAttribute('x'))).toBeCloseTo(dest.x - 18);
            expect(parseFloat(rect.getAttribute('y'))).toBeCloseTo(dest.y - 18);
            const text = container.querySelector('text');
            expect(parseFloat(text.getAttribute('x'))).toBeCloseTo(dest.x);
            expect(parseFloat(text.getAttribute('y'))).toBeCloseTo(dest.y + 4);
        });
    });

    describe('hex coordinate conversion', () => {
        it('asks hexToPixel for every hex on the path and no others', () => {
            renderLayer();
            const requested = new Set(hexMapUtils.hexToPixel.mock.calls.map(([q, r]) => `${q},${r}`));
            const pathKeys = new Set(defaultPath.map(h => `${h.q},${h.r}`));
            expect(requested).toEqual(pathKeys);
        });

        it('converts every hex with HEX_SIZE', () => {
            renderLayer();
            expect(hexMapUtils.hexToPixel.mock.calls.every(call => call[2] === HEX_SIZE)).toBe(true);
        });
    });
});
