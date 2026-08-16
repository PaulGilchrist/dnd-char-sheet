// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hexMapUtils from '../../services/maps/hexMapUtils.js';
import PartyMarkerLayer from './PartyMarkerLayer.jsx';

vi.mock('../../services/maps/hexMapUtils.js', () => ({
    hexToPixel: vi.fn((q, r, size) => ({
        x: size * Math.sqrt(3) * (q + r / 2),
        y: (size * 3) / 2 * r,
    })),
    pixelToHexSnapped: vi.fn((x, y, size) => ({
        q: Math.round(x / (size * Math.sqrt(3))),
        r: Math.round((2 / 3 * y) / size),
    })),
    hexToSVGPath: vi.fn((cx, cy) => `M${cx},${cy} Z`),
}));

function makeProps(overrides = {}) {
    return {
        position: { q: 0, r: 0 },
        HEX_SIZE: 30,
        hexCols: 10,
        hexRows: 10,
        onPositionChange: vi.fn(),
        onEncounter: vi.fn(),
        onAdvance: vi.fn(),
        onCancelTravel: vi.fn(),
        travelMode: 'inactive',
        svgRef: { current: null },
        contextMenuOpen: false,
        onContextMenu: vi.fn(),
        ...overrides,
    };
}

function renderMarker(overrides = {}) {
    const props = makeProps(overrides);
    const view = render(<PartyMarkerLayer {...props} />);
    return { props, ...view };
}

function createMockSvg(svgPoint) {
    return {
        current: {
            createSVGPoint: vi.fn(() => ({
                matrixTransform: vi.fn(() => svgPoint),
            })),
            getScreenCTM: vi.fn(() => ({
                inverse: vi.fn(() => null),
            })),
        },
    };
}

function simulateDrag({ travelMode = 'inactive', button = 0, svgPoint = { x: 60, y: 60 } } = {}) {
    const { props } = renderMarker({ travelMode, svgRef: createMockSvg(svgPoint) });
    const path = document.querySelector('g.party-marker-layer path');
    fireEvent.pointerDown(path, { button, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(document, { clientX: 100, clientY: 100 });
    return {
        props,
        move: () => fireEvent.pointerMove(document, { clientX: 200, clientY: 200 }),
        release: () => fireEvent.pointerUp(document),
    };
}

describe('PartyMarkerLayer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders nothing when position is null or undefined', () => {
            const { container: c1 } = renderMarker({ position: null });
            expect(c1.querySelector('g.party-marker-layer')).not.toBeInTheDocument();

            const { container: c2 } = renderMarker({ position: undefined });
            expect(c2.querySelector('g.party-marker-layer')).not.toBeInTheDocument();
        });

        it('renders the marker hex and the party label when position is set', () => {
            const { container } = renderMarker({ position: { q: 5, r: 3 } });
            expect(container.querySelector('g.party-marker-layer path')).toBeInTheDocument();
            expect(screen.getByText('P')).toBeInTheDocument();
        });

        it('renders the marker at the pixel position of its hex coordinate', () => {
            renderMarker({ position: { q: 5, r: 3 } });
            const expectedX = 30 * Math.sqrt(3) * (5 + 3 / 2);
            const expectedY = (30 * 3) / 2 * 3;
            expect(hexMapUtils.hexToPixel).toHaveBeenCalledWith(5, 3, 30);
            const text = document.querySelector('g.party-marker-layer text');
            expect(parseFloat(text.getAttribute('x'))).toBeCloseTo(expectedX);
            expect(parseFloat(text.getAttribute('y'))).toBeCloseTo(expectedY + 4);
            const path = document.querySelector('g.party-marker-layer path');
            expect(path.getAttribute('d')).toBe(`M${expectedX},${expectedY} Z`);
        });
    });

    describe('context menu', () => {
        it('shows the encounter menu when open and not traveling', () => {
            renderMarker({ contextMenuOpen: true, travelMode: 'inactive' });
            expect(screen.getByText('Start Encounter')).toBeInTheDocument();
            expect(screen.queryByText('Advance One Hex')).not.toBeInTheDocument();
            expect(screen.queryByText('Cancel Travel')).not.toBeInTheDocument();
        });

        it('shows the travel menu when open during travel', () => {
            renderMarker({ contextMenuOpen: true, travelMode: 'active' });
            expect(screen.getByText('Advance One Hex')).toBeInTheDocument();
            expect(screen.getByText('Cancel Travel')).toBeInTheDocument();
            expect(screen.queryByText('Start Encounter')).not.toBeInTheDocument();
        });

        it('shows no menu when closed', () => {
            renderMarker({ contextMenuOpen: false });
            expect(screen.queryByText('Start Encounter')).not.toBeInTheDocument();
            expect(screen.queryByText('Advance One Hex')).not.toBeInTheDocument();
            expect(screen.queryByText('Cancel Travel')).not.toBeInTheDocument();
        });
    });

    describe('context menu interactions', () => {
        it('forwards the marker position to onContextMenu on right-click', () => {
            const { props } = renderMarker({ position: { q: 5, r: 3 } });
            fireEvent.contextMenu(document.querySelector('g.party-marker-layer path'));
            expect(props.onContextMenu).toHaveBeenCalledWith(5, 3);
        });

        it.each([
            ['Start Encounter', 'inactive', 'onEncounter', { q: 5, r: 3 }],
            ['Advance One Hex', 'active', 'onAdvance', null],
            ['Cancel Travel', 'active', 'onCancelTravel', null],
        ])('invokes %s when its menu item is clicked', (label, travelMode, callback, position) => {
            const { props } = renderMarker({ contextMenuOpen: true, travelMode, position: { q: 5, r: 3 } });
            const hitRect = screen.getByText(label).previousElementSibling;
            fireEvent.click(hitRect);
            if (position) {
                expect(props[callback]).toHaveBeenCalledWith(position.q, position.r);
            } else {
                expect(props[callback]).toHaveBeenCalledWith();
            }
        });
    });

    describe('dragging', () => {
        it('reports the snapped hex as the new position while dragging', () => {
            const { props, release } = simulateDrag();
            expect(props.onPositionChange).toHaveBeenCalledWith({ q: 1, r: 1 });
            release();
        });

        it('stops updating the position after the pointer is released', () => {
            const { props, move, release } = simulateDrag();
            expect(props.onPositionChange).toHaveBeenCalledTimes(1);
            release();
            move();
            expect(props.onPositionChange).toHaveBeenCalledTimes(1);
        });

        it('does not update the position when dropping outside the map bounds', () => {
            const { props, release } = simulateDrag({ svgPoint: { x: 3000, y: 3000 } });
            expect(props.onPositionChange).not.toHaveBeenCalled();
            release();
        });

        it('does not start a drag on right-click', () => {
            const { props, release } = simulateDrag({ button: 2 });
            expect(props.onPositionChange).not.toHaveBeenCalled();
            release();
        });

        it('does not drag while travel mode is active', () => {
            const { props, release } = simulateDrag({ travelMode: 'active' });
            expect(props.onPositionChange).not.toHaveBeenCalled();
            release();
        });
    });
});
