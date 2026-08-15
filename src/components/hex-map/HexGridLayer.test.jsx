// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HexGridLayer from './HexGridLayer.jsx';
import { getAllHexes, hexToPixel, hexToSVGPath } from '../../services/maps/hexMapUtils.js';

vi.mock('../../config/outdoorConfig.js', () => ({
    HEX_SIZE: 30,
}));

vi.mock('../../services/maps/hexMapUtils.js', () => ({
    getAllHexes: vi.fn(() => []),
    hexToPixel: vi.fn(() => ({ x: 10, y: 20 })),
    hexToSVGPath: vi.fn(() => 'M10,20 l30,0'),
}));

function makeHexes(hexCols, hexRows) {
    const hexes = [];
    for (let r = 0; r < hexRows; r++) {
        for (let q = 0; q < hexCols; q++) {
            hexes.push({ q, r });
        }
    }
    return hexes;
}

describe('HexGridLayer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the hex-grid-layer group', () => {
            const { container } = render(<HexGridLayer hexCols={3} hexRows={2} />);
            expect(container.querySelector('g.hex-grid-layer')).toBeInTheDocument();
        });

        it.each`
            hexCols | hexRows | expectedPaths
            ${0}    | ${3}    | ${0}
            ${3}    | ${0}    | ${0}
            ${0}    | ${0}    | ${0}
            ${1}    | ${1}    | ${1}
            ${3}    | ${2}    | ${6}
            ${5}    | ${4}    | ${20}
        `('should render one path per hex ($expectedPaths paths for $hexCols x $hexRows)', ({ hexCols, hexRows, expectedPaths }) => {
            vi.mocked(getAllHexes).mockReturnValue(makeHexes(hexCols, hexRows));
            const { container } = render(<HexGridLayer hexCols={hexCols} hexRows={hexRows} />);
            expect(container.querySelectorAll('path')).toHaveLength(expectedPaths);
        });

        it('should render all paths inside the hex-grid-layer group', () => {
            vi.mocked(getAllHexes).mockReturnValue(makeHexes(2, 2));
            const { container } = render(<HexGridLayer hexCols={2} hexRows={2} />);
            const layer = container.querySelector('g.hex-grid-layer');
            const paths = container.querySelectorAll('path');
            expect(paths.length).toBeGreaterThan(0);
            paths.forEach(path => {
                expect(path.closest('g.hex-grid-layer')).toBe(layer);
            });
        });

        it('should set fill, stroke, and stroke-width on every path', () => {
            vi.mocked(getAllHexes).mockReturnValue(makeHexes(2, 2));
            const { container } = render(<HexGridLayer hexCols={2} hexRows={2} />);
            container.querySelectorAll('path').forEach(path => {
                expect(path.getAttribute('fill')).toBe('none');
                expect(path.getAttribute('stroke')).toBe('#999');
                expect(path.getAttribute('stroke-width')).toBe('0.3');
            });
        });

        it('should pass the grid dimensions to getAllHexes', () => {
            render(<HexGridLayer hexCols={4} hexRows={2} />);
            expect(getAllHexes).toHaveBeenCalledWith(4, 2);
        });

        it('should build each path from its hex coordinates and render the returned descriptor', () => {
            vi.mocked(getAllHexes).mockReturnValue([{ q: 2, r: 3 }]);
            vi.mocked(hexToPixel).mockReturnValue({ x: 100, y: 200 });
            vi.mocked(hexToSVGPath).mockReturnValue('M100,200 l30,0');

            const { container } = render(<HexGridLayer hexCols={1} hexRows={1} />);

            expect(hexToPixel).toHaveBeenCalledWith(2, 3, 30);
            expect(hexToSVGPath).toHaveBeenCalledWith(100, 200, 30);
            expect(container.querySelector('path').getAttribute('d')).toBe('M100,200 l30,0');
        });

        it('should render large grids without crashing', () => {
            vi.mocked(getAllHexes).mockReturnValue(makeHexes(20, 15));
            expect(() => render(<HexGridLayer hexCols={20} hexRows={15} />)).not.toThrow();
        });
    });

    describe('Memoization', () => {
        it('should regenerate paths when grid dimensions change', () => {
            vi.mocked(getAllHexes).mockImplementation((cols, rows) => makeHexes(cols, rows));
            const { container, rerender } = render(<HexGridLayer hexCols={2} hexRows={2} />);
            expect(container.querySelectorAll('path')).toHaveLength(4);

            rerender(<HexGridLayer hexCols={3} hexRows={3} />);
            expect(container.querySelectorAll('path')).toHaveLength(9);
        });

        it('should not recompute paths when props are unchanged', () => {
            vi.mocked(getAllHexes).mockReturnValue(makeHexes(1, 1));
            const { rerender } = render(<HexGridLayer hexCols={1} hexRows={1} />);
            expect(getAllHexes).toHaveBeenCalledTimes(1);

            rerender(<HexGridLayer hexCols={1} hexRows={1} />);
            expect(getAllHexes).toHaveBeenCalledTimes(1);
        });
    });
});
