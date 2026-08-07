import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemContextMenu from './ItemContextMenu';

const mockGridCenterX = (gx) => gx * 40 + 20;
const mockGridCenterY = (gy) => gy * 40 + 20;

const mockHandleToggleItemVisibility = vi.fn();
const mockHandleDeleteItem = vi.fn();
const mockHandleRotate = vi.fn();
const mockHandleToggleDoor = vi.fn();
const mockHandleViewStats = vi.fn();
const mockOnRenameClicked = vi.fn();
const mockOnClose = vi.fn();

const baseMocks = {
    handleToggleItemVisibility: mockHandleToggleItemVisibility,
    handleDeleteItem: mockHandleDeleteItem,
    handleRotate: mockHandleRotate,
    handleToggleDoor: mockHandleToggleDoor,
    handleViewStats: mockHandleViewStats,
    onRenameClicked: mockOnRenameClicked,
    onClose: mockOnClose,
};

const defaultSelectedItem = { id: 'item-1', gridX: 0, gridY: 0 };

const createPlacedItem = (overrides = {}) => ({
    id: 'item-1',
    type: 'token',
    visible: true,
    open: false,
    name: 'Test NPC',
    ...overrides,
});

// ── Null item renders nothing ──────────────────────────────────

describe('null item', () => {
    it('returns null when selectedItem is undefined', () => {
        const { container } = render(
            <ItemContextMenu
                selectedItem={undefined}
                placedItems={[]}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('returns null when selectedItem is null', () => {
        const { container } = render(
            <ItemContextMenu
                selectedItem={null}
                placedItems={[]}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(container.innerHTML).toBe('');
    });
});

// ── Basic token (non-NPC, non-door) ───────────────────────────

describe('basic token item', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Hide/Show toggle text based on visibility', () => {
        const placedItems = [createPlacedItem({ visible: true })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('renders Show when item is not visible', () => {
        const placedItems = [createPlacedItem({ visible: false })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Show')).toBeInTheDocument();
    });

    it('renders Delete option', () => {
        const placedItems = [createPlacedItem()];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('renders Rotate option', () => {
        const placedItems = [createPlacedItem()];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Rotate')).toBeInTheDocument();
    });

    it('does NOT render door-specific options for non-door items', () => {
        const placedItems = [createPlacedItem({ type: 'token' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.queryByText('Open Door')).not.toBeInTheDocument();
        expect(screen.queryByText('Close Door')).not.toBeInTheDocument();
    });

    it('does NOT render rename/view stats for non-NPC items', () => {
        const placedItems = [createPlacedItem({ type: 'token' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.queryByText('Rename')).not.toBeInTheDocument();
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
    });

    it('calls handleToggleItemVisibility when Hide/Show is clicked', () => {
        const placedItems = [createPlacedItem({ visible: true })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        screen.getByText('Hide').click();
        expect(mockHandleToggleItemVisibility).toHaveBeenCalledWith('item-1');
    });

    it('calls handleDeleteItem when Delete is clicked', () => {
        const placedItems = [createPlacedItem()];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        screen.getByText('Delete').click();
        expect(mockHandleDeleteItem).toHaveBeenCalledWith('item-1');
    });

    it('calls handleRotate when Rotate is clicked', () => {
        const placedItems = [createPlacedItem()];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        screen.getByText('Rotate').click();
        expect(mockHandleRotate).toHaveBeenCalledWith('item-1');
    });

    it('calls onClose with menuX and menuY when close button is clicked', () => {
        const placedItems = [createPlacedItem()];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        screen.getByText('✕').click();
        expect(mockOnClose).toHaveBeenCalledWith(30, 30);
    });

    it('renders the SVG group with class item-context-menu', () => {
        const placedItems = [createPlacedItem()];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const g = container.querySelector('.item-context-menu');
        expect(g).toBeTruthy();
    });

    it('renders the background rect', () => {
        const placedItems = [createPlacedItem()];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect).toBeTruthy();
    });
});

// ── NPC item ───────────────────────────────────────────────────

describe('NPC item', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows Rename option for NPC items', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    it('does NOT show View Stats when monsterFound is false', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
    });

    it('shows View Stats when monsterFound is true', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={true}
                {...baseMocks}
            />
        );
        expect(screen.getByText('View Stats')).toBeInTheDocument();
    });

    it('calls onRenameClicked when Rename is clicked', () => {
        const placedItems = [createPlacedItem({ type: 'npc', name: 'Goblin' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        screen.getByText('Rename').click();
        expect(mockOnRenameClicked).toHaveBeenCalled();
        const [calledEvent, calledSelItem, name] = mockOnRenameClicked.mock.calls[0];
        expect(calledEvent).toBeTruthy();
        expect(calledSelItem).toBe(defaultSelectedItem);
        expect(name).toBe('Goblin');
    });

    it('passes default name "NPC" when item has no name', () => {
        const placedItems = [createPlacedItem({ type: 'npc', name: null })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        screen.getByText('Rename').click();
        const [, , name] = mockOnRenameClicked.mock.calls[0];
        expect(name).toBe('NPC');
    });

    it('calls handleViewStats when View Stats is clicked', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={true}
                {...baseMocks}
            />
        );
        screen.getByText('View Stats').click();
        expect(mockHandleViewStats).toHaveBeenCalledWith('item-1');
    });

    it('renders Rotate option for NPC items', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Rotate')).toBeInTheDocument();
    });
});

// ── Door item ──────────────────────────────────────────────────

describe('door item', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows Open Door when door is closed', () => {
        const placedItems = [createPlacedItem({ type: 'door', open: false })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Open Door')).toBeInTheDocument();
    });

    it('shows Close Door when door is open', () => {
        const placedItems = [createPlacedItem({ type: 'door', open: true })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Close Door')).toBeInTheDocument();
    });

    it('calls handleToggleDoor when Open/Close Door is clicked', () => {
        const placedItems = [createPlacedItem({ type: 'door', open: false })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        screen.getByText('Open Door').click();
        expect(mockHandleToggleDoor).toHaveBeenCalledWith('item-1');
    });

    it('does NOT show Rename or View Stats for door items', () => {
        const placedItems = [createPlacedItem({ type: 'door' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={true}
                {...baseMocks}
            />
        );
        expect(screen.queryByText('Rename')).not.toBeInTheDocument();
        expect(screen.queryByText('View Stats')).not.toBeInTheDocument();
    });

    it('still shows Rotate for door items', () => {
        const placedItems = [createPlacedItem({ type: 'door' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Rotate')).toBeInTheDocument();
    });

    it('still shows Hide/Show for door items', () => {
        const placedItems = [createPlacedItem({ type: 'door', visible: true })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('still shows Delete for door items', () => {
        const placedItems = [createPlacedItem({ type: 'door' })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });
});

// ── Menu layout / positioning ──────────────────────────────────

describe('menu layout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('positions menu at correct grid offset', () => {
        const placedItems = [createPlacedItem()];
        const { container } = render(
            <ItemContextMenu
                selectedItem={{ id: 'item-1', gridX: 2, gridY: 3 }}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        // menuX = gridCenterX(2) + 10 = 110, menuY = gridCenterY(3) + 10 = 150
        expect(rect.getAttribute('x')).toBe('110');
        expect(rect.getAttribute('y')).toBe('150');
    });

    it('renders menu with default height 76 for basic token', () => {
        const placedItems = [createPlacedItem()];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('height')).toBe('76');
    });

    it('renders menu with height 120 for NPC without View Stats', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('height')).toBe('120');
    });

    it('renders menu with height 138 for NPC with View Stats', () => {
        const placedItems = [createPlacedItem({ type: 'npc' })];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={true}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('height')).toBe('138');
    });

    it('renders menu with height 116 for door', () => {
        const placedItems = [createPlacedItem({ type: 'door' })];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('height')).toBe('116');
    });

    it('stops propagation on the outer group click', () => {
        const placedItems = [createPlacedItem()];
        const { container } = render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        const outerG = container.querySelector('.item-context-menu');
        const stopSpy = vi.spyOn(Event.prototype, 'stopPropagation');
        outerG.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stopSpy).toHaveBeenCalled();
    });
});

// ── Item lookup from placedItems ───────────────────────────────

describe('item lookup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does NOT show Rename when selectedItem id is not in placedItems', () => {
        const placedItems = [];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                {...baseMocks}
            />
        );
        expect(screen.queryByText('Rename')).not.toBeInTheDocument();
    });

    it('falls back to "NPC" when placed item has no name for rename text', () => {
        const placedItems = [createPlacedItem({ type: 'npc', name: undefined })];
        render(
            <ItemContextMenu
                selectedItem={defaultSelectedItem}
                placedItems={placedItems}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                monsterFound={false}
                {...baseMocks}
            />
        );
        expect(screen.getByText('Rename')).toBeInTheDocument();
    });
});
