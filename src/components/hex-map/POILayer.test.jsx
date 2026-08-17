// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import POILayer from './POILayer.jsx';

describe('POILayer', () => {
    let props;

    beforeEach(() => {
        props = {
            pois: [
                { id: 'poi-1', type: 'city', q: 0, r: 0, label: 'City A', visible: true, linkedMap: null },
                { id: 'poi-2', type: 'camp', q: 1, r: 0, label: 'Camp B', visible: true, linkedMap: null },
                { id: 'poi-3', type: 'dungeon', q: 0, r: 1, label: 'Dungeon C', visible: true, linkedMap: 'dungeon-map.json' },
            ],
            onPoiPointerDown: vi.fn(),
            onPoiContextMenu: vi.fn(),
            poiDragging: null,
            poiHover: null,
            isLocalhost: true,
            partyPosition: null,
            onPoiEnter: vi.fn(),
            validLinkedMaps: new Set(),
            roadStartPoiId: null,
        };
    });

    function renderLayer(overrideProps = {}) {
        return render(<POILayer {...props} {...overrideProps} />);
    }

    function createEnterablePoi(overrides = {}) {
        return { id: 'enterable-poi', type: 'dungeon', q: 0, r: 1, visible: true, linkedMap: 'dungeon-map.json', ...overrides };
    }

    describe('basic rendering', () => {
        it('renders a POI item and label for every POI', () => {
            const { container } = renderLayer();
            expect(container.querySelectorAll('.poi-item')).toHaveLength(3);
            for (const label of ['City A', 'Camp B', 'Dungeon C']) {
                expect(screen.getByText(label)).toBeInTheDocument();
            }
        });

        it('renders nothing when the POI list is empty', () => {
            const { container } = renderLayer({ pois: [] });
            expect(container.querySelectorAll('.poi-item')).toHaveLength(0);
        });

        it('omits the label when a POI has no label', () => {
            renderLayer({ pois: [{ id: 'poi-1', type: 'city', q: 0, r: 0, visible: true }] });
            expect(screen.queryByText('City A')).not.toBeInTheDocument();
        });
    });

    describe('visibility', () => {
        it.each([
            ['renders invisible POIs faded out for the localhost GM', { isLocalhost: true, visible: false, expectedCount: 1, expectedOpacity: '0.4' }],
            ['renders invisible POIs at full opacity for the localhost GM', { isLocalhost: true, visible: true, expectedCount: 1, expectedOpacity: '1' }],
            ['does not render invisible POIs for non-localhost users', { isLocalhost: false, visible: false, expectedCount: 0, expectedOpacity: null }],
            ['renders visible POIs at full opacity for non-localhost users', { isLocalhost: false, visible: true, expectedCount: 1, expectedOpacity: '1' }],
        ])('POI visibility: %s', (_desc, { isLocalhost, visible, expectedCount, expectedOpacity }) => {
            const { container } = renderLayer({
                isLocalhost,
                pois: [{ id: 'vis-poi', type: 'city', q: 0, r: 0, visible }],
            });
            expect(container.querySelectorAll('.poi-item')).toHaveLength(expectedCount);
            if (expectedCount > 0) {
                expect(container.querySelector('.poi-item').getAttribute('opacity')).toBe(expectedOpacity);
            }
        });
    });

    describe('interaction callbacks', () => {
        it.each([
            ['pointerDown', 'onPoiPointerDown', ['poi-1', expect.any(Object)]],
            ['contextMenu', 'onPoiContextMenu', ['poi-1', expect.any(Object)]],
        ])('calls %s on %s for non-enterable POIs', (_event, callbackName, expectedArgs) => {
            const { container } = renderLayer();
            const hitArea = container.querySelector('.poi-item rect');
            fireEvent[_event](hitArea, { preventDefault: () => {}, stopPropagation: () => {} });
            expect(props[callbackName]).toHaveBeenCalledWith(...expectedArgs);
        });

        it('does not call onPoiEnter when a non-enterable POI is clicked', () => {
            const { container } = renderLayer();
            const hitArea = container.querySelector('.poi-item rect');
            fireEvent.click(hitArea);
            expect(props.onPoiEnter).not.toHaveBeenCalled();
        });
    });

    describe('enterable POIs', () => {
        function renderEnterable(overrides = {}) {
            return renderLayer({
                partyPosition: { q: 0, r: 0 },
                validLinkedMaps: new Set(['dungeon-map.json']),
                pois: [createEnterablePoi()],
                ...overrides,
            });
        }

        it('shows an Enter badge and glow ring when adjacent to the party with a valid linked map', () => {
            const { container } = renderEnterable();
            expect(screen.getByText('Enter')).toBeInTheDocument();
            expect(container.querySelector('.poi-item-enterable')).toBeInTheDocument();
            expect(container.querySelector('circle[stroke="#FFD700"]')).toBeInTheDocument();
        });

        it.each([
            ['not adjacent to the party', { partyPosition: { q: 10, r: 10 } }],
            ['missing a linked map', { pois: [createEnterablePoi({ linkedMap: null })] }],
            ['linked to a map not in validLinkedMaps', { validLinkedMaps: new Set(['other-map.json']) }],
            ['marked invisible', { pois: [createEnterablePoi({ visible: false })] }],
            ['when the party has no position', { partyPosition: null }],
        ])('does not show enterable indicators when the POI is %s', (_desc, overrides) => {
            const { container } = renderEnterable(overrides);
            expect(screen.queryByText('Enter')).not.toBeInTheDocument();
            expect(container.querySelectorAll('.poi-item-enterable')).toHaveLength(0);
        });

        it('calls onPoiEnter with the POI when clicked, and not onPoiPointerDown', () => {
            const { container } = renderEnterable();
            const hitArea = container.querySelector('.poi-item-enterable rect[fill="transparent"]');
            fireEvent.click(hitArea);
            expect(props.onPoiEnter).toHaveBeenCalledWith(expect.objectContaining({ id: 'enterable-poi' }));
            expect(props.onPoiPointerDown).not.toHaveBeenCalled();
        });

        it('still opens the context menu on right-click', () => {
            const { container } = renderEnterable();
            const hitArea = container.querySelector('.poi-item-enterable rect[fill="transparent"]');
            fireEvent.contextMenu(hitArea, { preventDefault: () => {}, stopPropagation: () => {} });
            expect(props.onPoiContextMenu).toHaveBeenCalledWith('enterable-poi', expect.any(Object));
        });
    });

    describe('road-start selection ring', () => {
        it('draws a selection ring on the POI whose id matches roadStartPoiId', () => {
            const { container } = renderLayer({ roadStartPoiId: 'poi-1' });
            expect(container.querySelector('circle[stroke="#A08060"]')).toBeInTheDocument();
        });
    });

    describe('drag state', () => {
        it('highlights the POI whose id matches the active drag', () => {
            const { container } = renderLayer({ poiDragging: { poiId: 'poi-1' } });
            expect(container.querySelector('.poi-item rect[stroke="#FFD700"]')).toBeInTheDocument();
        });
    });

    describe('placement drop preview', () => {
        it('draws a drop-preview box at the hovered position', () => {
            const { container } = renderLayer({ poiHover: { x: 45, y: 50 } });
            expect(container.querySelector('rect[fill="rgba(255,215,0,0.2)"]')).toBeInTheDocument();
        });
    });
});
