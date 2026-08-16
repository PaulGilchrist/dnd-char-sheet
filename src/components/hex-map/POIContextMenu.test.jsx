// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import POIContextMenu from './POIContextMenu.jsx';

const BASE_POI = { id: 'poi-1', type: 'city', q: 0, r: 0, label: 'City A', visible: true, linkedMap: null };

describe('POIContextMenu', () => {
    let props;

    beforeEach(() => {
        props = {
            selectedPoi: { id: 'poi-1', q: 0, r: 0 },
            pois: [BASE_POI],
            onToggleVisibility: vi.fn(),
            onDelete: vi.fn(),
            onRename: vi.fn(),
            onLinkMap: vi.fn(),
            onUnlinkMap: vi.fn(),
            onRemoveRoads: vi.fn(),
            setShowRename: vi.fn(),
            onClose: vi.fn(),
            indoorMaps: [],
            viewPortBounds: null,
            roads: [],
        };
    });

    function renderMenu(overrideProps = {}) {
        return render(<POIContextMenu {...props} {...overrideProps} />);
    }

    describe('rendering', () => {
        it('renders nothing when no POI is selected', () => {
            const { container } = renderMenu({ selectedPoi: null });
            expect(container.querySelector('.poi-context-menu')).not.toBeInTheDocument();
        });

        it('renders nothing when the selected POI is not in the pois list', () => {
            const { container } = renderMenu({ pois: [] });
            expect(container.querySelector('.poi-context-menu')).not.toBeInTheDocument();
        });

        it('renders the menu when the selected POI exists', () => {
            const { container } = renderMenu();
            expect(container.querySelector('.poi-context-menu')).toBeInTheDocument();
        });
    });

    describe('contextual options', () => {
        const optionCases = [
            {
                name: 'a POI with no linked map and no roads',
                pois: [BASE_POI],
                roads: [],
                present: ['Hide', 'Rename', 'Link to Map...', 'Delete'],
                absent: [/Unlink Map/, /Remove Roads/],
            },
            {
                name: 'a POI with a linked map but no roads',
                pois: [{ ...BASE_POI, linkedMap: 'dungeon-map.json' }],
                roads: [],
                present: ['Hide', 'Rename', 'Unlink Map (Dungeon Map)', 'Delete'],
                absent: ['Link to Map...', /Remove Roads/],
            },
            {
                name: 'a POI with roads but no linked map',
                pois: [BASE_POI],
                roads: [{ fromPoiId: 'poi-1', toPoiId: 'poi-2' }],
                present: ['Hide', 'Rename', 'Link to Map...', 'Remove Roads (1)', 'Delete'],
                absent: [/Unlink Map/],
            },
            {
                name: 'a POI with both a linked map and roads',
                pois: [{ ...BASE_POI, linkedMap: 'map.json' }],
                roads: [{ fromPoiId: 'poi-1', toPoiId: 'poi-2' }],
                present: ['Hide', 'Rename', 'Unlink Map (Map)', 'Remove Roads (1)', 'Delete'],
                absent: ['Link to Map...'],
            },
        ];

        it.each(optionCases)(
            'renders the correct options for $name',
            ({ pois, roads, present, absent }) => {
                renderMenu({ pois, roads });
                present.forEach((option) => expect(screen.getByText(option)).toBeInTheDocument());
                absent.forEach((option) => expect(screen.queryByText(option)).not.toBeInTheDocument());
            }
        );

        it('counts roads that terminate at the POI as connected', () => {
            renderMenu({ roads: [{ fromPoiId: 'poi-2', toPoiId: 'poi-1' }] });
            expect(screen.getByText('Remove Roads (1)')).toBeInTheDocument();
        });

        it('shows the total count when multiple roads touch the POI', () => {
            renderMenu({
                roads: [
                    { fromPoiId: 'poi-1', toPoiId: 'poi-2' },
                    { fromPoiId: 'poi-3', toPoiId: 'poi-1' },
                ],
            });
            expect(screen.getByText('Remove Roads (2)')).toBeInTheDocument();
        });

        it('labels the visibility option Show for a hidden POI', () => {
            renderMenu({ pois: [{ ...BASE_POI, visible: false }] });
            expect(screen.getByText('Show')).toBeInTheDocument();
            expect(screen.queryByText('Hide')).not.toBeInTheDocument();
        });
    });

    describe('action callbacks', () => {
        it('toggles a visible POI to hidden and closes on Hide', () => {
            renderMenu();
            fireEvent.click(screen.getByText('Hide'));
            expect(props.onToggleVisibility).toHaveBeenCalledWith('poi-1');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('toggles a hidden POI back to visible and closes on Show', () => {
            renderMenu({ pois: [{ ...BASE_POI, visible: false }] });
            fireEvent.click(screen.getByText('Show'));
            expect(props.onToggleVisibility).toHaveBeenCalledWith('poi-1');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('opens the rename input via setShowRename when Rename is clicked', () => {
            renderMenu();
            fireEvent.click(screen.getByText('Rename'));
            expect(props.setShowRename).toHaveBeenCalledWith('poi-1');
        });

        it('deletes the POI and closes on Delete', () => {
            renderMenu();
            fireEvent.click(screen.getByText('Delete'));
            expect(props.onDelete).toHaveBeenCalledWith('poi-1');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('unlinks the map and closes on Unlink Map', () => {
            renderMenu({ pois: [{ ...BASE_POI, linkedMap: 'dungeon-map.json' }] });
            fireEvent.click(screen.getByText(/Unlink Map/));
            expect(props.onUnlinkMap).toHaveBeenCalledWith('poi-1');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('removes connected roads and closes on Remove Roads', () => {
            renderMenu({ roads: [{ fromPoiId: 'poi-1', toPoiId: 'poi-2' }] });
            fireEvent.click(screen.getByText('Remove Roads (1)'));
            expect(props.onRemoveRoads).toHaveBeenCalledWith('poi-1');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('closes the menu when the close button is clicked', () => {
            renderMenu();
            fireEvent.click(screen.getByText('✕'));
            expect(props.onClose).toHaveBeenCalled();
        });

        it('does not let clicks or pointer events inside the menu bubble to the map beneath it', () => {
            const mapClick = vi.fn();
            const mapPointerDown = vi.fn();
            render(
                <svg onClick={mapClick} onPointerDown={mapPointerDown}>
                    <POIContextMenu {...props} />
                </svg>
            );
            fireEvent.pointerDown(screen.getByText('Hide'));
            fireEvent.click(screen.getByText('Hide'));
            expect(props.onToggleVisibility).toHaveBeenCalledWith('poi-1');
            expect(mapPointerDown).not.toHaveBeenCalled();
            expect(mapClick).not.toHaveBeenCalled();
        });
    });

    describe('link picker', () => {
        it('links the selected map and closes when a map is chosen', () => {
            renderMenu({ indoorMaps: ['dungeon-map.json'], pois: [BASE_POI] });
            fireEvent.click(screen.getByText('Link to Map...'));
            fireEvent.click(screen.getByText('Dungeon Map'));
            expect(props.onLinkMap).toHaveBeenCalledWith('poi-1', 'dungeon-map.json');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('shows a hint when there are no indoor maps to link', () => {
            renderMenu({ indoorMaps: [], pois: [BASE_POI] });
            fireEvent.click(screen.getByText('Link to Map...'));
            expect(screen.getByText('No indoor maps available')).toBeInTheDocument();
        });

        it('shows at most six maps in the picker', () => {
            const indoorMaps = Array.from({ length: 8 }, (_, i) => `map-0${i + 1}.json`);
            renderMenu({ indoorMaps, pois: [BASE_POI] });
            fireEvent.click(screen.getByText('Link to Map...'));
            for (let i = 1; i <= 6; i += 1) {
                expect(screen.getByText(`Map 0${i}`)).toBeInTheDocument();
            }
            expect(screen.queryByText('Map 07')).not.toBeInTheDocument();
            expect(screen.queryByText('Map 08')).not.toBeInTheDocument();
        });
    });

    describe('rename input', () => {
        it('shows an input pre-filled with the POI label when showRename matches', () => {
            renderMenu({ showRename: 'poi-1' });
            expect(screen.getByRole('textbox')).toHaveValue('City A');
        });

        it('does not show the input when showRename targets another POI', () => {
            renderMenu({ showRename: 'other-poi' });
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('defaults to an empty value when the POI has no label', () => {
            renderMenu({ showRename: 'poi-1', pois: [{ ...BASE_POI, label: '' }] });
            expect(screen.getByRole('textbox')).toHaveValue('');
        });

        it('commits the entered name and closes on Enter', () => {
            renderMenu({ showRename: 'poi-1' });
            const input = screen.getByRole('textbox');
            fireEvent.change(input, { target: { value: 'Northern Bastion' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            expect(props.onRename).toHaveBeenCalledWith('poi-1', 'Northern Bastion');
            expect(props.onClose).toHaveBeenCalled();
        });

        it('commits the entered name and closes on blur', () => {
            renderMenu({ showRename: 'poi-1' });
            const input = screen.getByRole('textbox');
            fireEvent.change(input, { target: { value: 'Northern Bastion' } });
            fireEvent.blur(input);
            expect(props.onRename).toHaveBeenCalledWith('poi-1', 'Northern Bastion');
            expect(props.onClose).toHaveBeenCalled();
        });
    });

    describe('positioning', () => {
        it('places the menu next to the selected POI hex', () => {
            const { container } = renderMenu();
            const rect = container.querySelector('.poi-context-menu rect');
            expect(rect).toHaveAttribute('x', '10');
            expect(rect).toHaveAttribute('y', '10');
        });

        it('keeps the natural offset when the menu already fits inside the viewport', () => {
            const { container } = renderMenu({ viewPortBounds: { left: 0, top: 0, right: 1000, bottom: 1000 } });
            const rect = container.querySelector('.poi-context-menu rect');
            expect(rect).toHaveAttribute('x', '10');
            expect(rect).toHaveAttribute('y', '10');
        });

        it('clamps the menu into the viewport when it would overflow', () => {
            const { container } = renderMenu({ viewPortBounds: { left: 0, top: 0, right: 50, bottom: 50 } });
            const rect = container.querySelector('.poi-context-menu rect');
            expect(rect).toHaveAttribute('x', '4');
            expect(rect).toHaveAttribute('y', '4');
        });
    });
});
