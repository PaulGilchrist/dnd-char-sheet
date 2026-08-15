// @improved-by-ai
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HexMapToolbar from './HexMapToolbar.jsx';
import { TOOL_NONE, TOOL_PAINT, TOOL_ERASE, TOOL_RIVER, TOOL_ROAD, TOOL_TRAVEL } from '../../config/outdoorConfig';

const TOOL_TITLES = {
    [TOOL_PAINT]: 'Paint terrain',
    [TOOL_ERASE]: 'Erase terrain',
    [TOOL_RIVER]: 'Paint rivers',
    [TOOL_ROAD]: 'Connect cities and settlements with roads',
    [TOOL_TRAVEL]: 'Travel mode — plan and execute overland travel',
};
const ALL_TOOLS = [TOOL_PAINT, TOOL_ERASE, TOOL_RIVER, TOOL_ROAD, TOOL_TRAVEL];

describe('HexMapToolbar', () => {
    let props;

    beforeEach(() => {
        props = {
            onBack: vi.fn(),
            mapName: 'Test Map',
            tool: TOOL_NONE,
            setTool: vi.fn(),
            selectedTerrain: 'grassland',
            setSelectedTerrain: vi.fn(),
            terrainTypes: [
                { id: 'grassland', name: 'Grassland', fill: '#4a7c3f' },
                { id: 'forest', name: 'Forest', fill: '#2d5a1e' },
                { id: 'water', name: 'Water', fill: '#3a6ea5' },
            ],
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            resetView: vi.fn(),
            zoom: 1.0,
            poiPanelOpen: false,
            setPoiPanelOpen: vi.fn(),
            gridSize: 30,
            setGridSize: vi.fn(),
            marchingOrderOpen: false,
            setMarchingOrderOpen: vi.fn(),
            marchingOrder: [],
        };
    });

    it('calls onBack when the back button is clicked', () => {
        render(<HexMapToolbar {...props} />);
        fireEvent.click(screen.getByTitle('Back to maps'));
        expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('renders the map name', () => {
        render(<HexMapToolbar {...props} mapName="Northern Wilds" />);
        expect(screen.getByText('Northern Wilds')).toBeInTheDocument();
    });

    describe('terrain tools', () => {
        it.each(ALL_TOOLS.map((tool) => [tool, TOOL_TITLES[tool]]))(
            'activates %s when its button is clicked',
            (tool, title) => {
                render(<HexMapToolbar {...props} />);
                fireEvent.click(screen.getByTitle(title));
                expect(props.setTool).toHaveBeenCalledWith(tool);
            },
        );

        it.each(ALL_TOOLS.map((tool) => [tool, TOOL_TITLES[tool]]))(
            'deactivates %s when its button is clicked while active',
            (tool, title) => {
                render(<HexMapToolbar {...props} tool={tool} />);
                fireEvent.click(screen.getByTitle(title));
                expect(props.setTool).toHaveBeenCalledWith(TOOL_NONE);
            },
        );

        it.each(ALL_TOOLS.map((tool) => [tool, TOOL_TITLES[tool]]))(
            'marks the %s button as active when that tool is selected',
            (tool, title) => {
                render(<HexMapToolbar {...props} tool={tool} />);
                expect(screen.getByTitle(title)).toHaveClass('active');
            },
        );

        it('does not mark buttons of unselected tools as active', () => {
            render(<HexMapToolbar {...props} tool={TOOL_PAINT} />);
            expect(screen.getByTitle(TOOL_TITLES[TOOL_ERASE])).not.toHaveClass('active');
        });
    });

    describe('terrain selector', () => {
        it.each([
            [TOOL_PAINT, true],
            [TOOL_ERASE, true],
            [TOOL_NONE, false],
            [TOOL_RIVER, false],
            [TOOL_ROAD, false],
            [TOOL_TRAVEL, false],
        ])('is shown when %s is active (%s)', (tool, shown) => {
            render(<HexMapToolbar {...props} tool={tool} />);
            if (shown) {
                expect(screen.getByTitle('Grassland')).toBeInTheDocument();
            } else {
                expect(screen.queryByTitle('Grassland')).not.toBeInTheDocument();
            }
        });

        it('renders a swatch for every terrain type', () => {
            render(<HexMapToolbar {...props} tool={TOOL_PAINT} />);
            for (const terrain of props.terrainTypes) {
                expect(screen.getByTitle(terrain.name)).toBeInTheDocument();
            }
        });

        it('selects the terrain and switches to the paint tool when a swatch is clicked', () => {
            render(<HexMapToolbar {...props} tool={TOOL_PAINT} />);
            fireEvent.click(screen.getByTitle('Forest'));
            expect(props.setSelectedTerrain).toHaveBeenCalledWith('forest');
            expect(props.setTool).toHaveBeenCalledWith(TOOL_PAINT);
        });

        it('marks the selected terrain swatch as active', () => {
            render(<HexMapToolbar {...props} tool={TOOL_PAINT} selectedTerrain="forest" />);
            expect(screen.getByTitle('Forest')).toHaveClass('active');
            expect(screen.getByTitle('Grassland')).not.toHaveClass('active');
        });
    });

    describe('zoom controls', () => {
        it.each([
            ['Zoom in', 'zoomIn'],
            ['Zoom out', 'zoomOut'],
            ['Reset view', 'resetView'],
        ])('calls %s when its button is clicked', (title, handlerName) => {
            render(<HexMapToolbar {...props} />);
            fireEvent.click(screen.getByTitle(title));
            expect(props[handlerName]).toHaveBeenCalled();
        });

        it.each([
            [1.0, '50%'],
            [2.0, '100%'],
            [0.5, '25%'],
        ])('displays zoom %s as %s', (zoom, label) => {
            render(<HexMapToolbar {...props} zoom={zoom} />);
            expect(screen.getByText(label)).toBeInTheDocument();
        });
    });

    describe('grid size', () => {
        it('renders the current grid size with min/max constraints', () => {
            render(<HexMapToolbar {...props} gridSize={40} />);
            const input = screen.getByDisplayValue('40');
            expect(input).toHaveAttribute('min', '30');
            expect(input).toHaveAttribute('max', '100');
        });

        it('calls setGridSize with a numeric value when the input changes', () => {
            render(<HexMapToolbar {...props} />);
            fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '50' } });
            expect(props.setGridSize).toHaveBeenCalledWith(50);
        });

        it('shows the hex dimensions derived from the grid size', () => {
            render(<HexMapToolbar {...props} gridSize={40} />);
            expect(screen.getByText('80×40')).toBeInTheDocument();
        });
    });

    describe('POI panel toggle', () => {
        it.each([
            [false, 'Open POI panel', true],
            [true, 'Close POI panel', false],
        ])('calls setPoiPanelOpen($expected) when the "$title" button is clicked', (open, title, expected) => {
            render(<HexMapToolbar {...props} poiPanelOpen={open} />);
            fireEvent.click(screen.getByTitle(title));
            expect(props.setPoiPanelOpen).toHaveBeenCalledWith(expected);
        });
    });

    describe('marching order toggle', () => {
        it.each([
            [false, 'Manage marching order', true],
            [true, 'Close marching order', false],
        ])('calls setMarchingOrderOpen($expected) when the "$title" button is clicked', (open, title, expected) => {
            render(<HexMapToolbar {...props} marchingOrderOpen={open} />);
            fireEvent.click(screen.getByTitle(title));
            expect(props.setMarchingOrderOpen).toHaveBeenCalledWith(expected);
        });

        it('shows the marching order count on the toggle button', () => {
            render(<HexMapToolbar {...props} marchingOrder={[{ id: 1 }, { id: 2 }]} />);
            const button = screen.getByTitle('Manage marching order');
            expect(within(button).getByText('2')).toBeInTheDocument();
        });

        it('shows no count indicator when marching order is empty', () => {
            render(<HexMapToolbar {...props} marchingOrder={[]} />);
            const button = screen.getByTitle('Manage marching order');
            expect(within(button).queryByText(/^\d+$/)).not.toBeInTheDocument();
        });
    });

    describe('print button', () => {
        beforeEach(() => {
            vi.spyOn(window, 'print').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('renders the print button', () => {
            render(<HexMapToolbar {...props} />);
            expect(screen.getByTitle('Print map')).toBeInTheDocument();
        });

        it('calls window.print when clicked', () => {
            render(<HexMapToolbar {...props} />);
            fireEvent.click(screen.getByTitle('Print map'));
            expect(window.print).toHaveBeenCalledTimes(1);
        });
    });
});
