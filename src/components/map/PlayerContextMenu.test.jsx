// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerContextMenu from './PlayerContextMenu';

const mockGridCenterX = (gx) => gx * 40 + 20;
const mockGridCenterY = (gy) => gy * 40 + 20;

const createMocks = () => ({
    handleRemovePlayer: vi.fn(),
    setSelectedPlayer: vi.fn(),
});

const defaultPlayer = { id: 'player-1', gridX: 1, gridY: 2 };

const defaultProps = (player = defaultPlayer) => ({
    selectedPlayer: player,
    gridCenterX: mockGridCenterX,
    gridCenterY: mockGridCenterY,
});

// ── Null / undefined player renders nothing ──────────────────────

describe('null/undefined player', () => {
    it('returns null when selectedPlayer is null', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={null}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={vi.fn()}
                setSelectedPlayer={vi.fn()}
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('returns null when selectedPlayer is undefined', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={undefined}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={vi.fn()}
                setSelectedPlayer={vi.fn()}
            />
        );
        expect(container.innerHTML).toBe('');
    });
});

// ── Rendering with a selected player ─────────────────────────────

describe('selected player rendering', () => {
    let mocks;

    beforeEach(() => {
        mocks = createMocks();
    });

    const renderWithContext = (player = defaultPlayer) => {
        return render(
            <PlayerContextMenu
                {...defaultProps(player)}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
    };

    it('renders the outer SVG group with class item-context-menu', () => {
        const { container } = renderWithContext();
        expect(container.querySelector('.item-context-menu')).toBeTruthy();
    });

    it('renders a background rect for the menu', () => {
        const { container } = renderWithContext();
        expect(container.querySelector('rect')).toBeTruthy();
    });

    it('positions the rect at menuX/menuY = gridCenter + 10', () => {
        // gridX=1 => gridCenterX(1)=60, menuX=60+10=70
        // gridY=2 => gridCenterY(2)=100, menuY=100+10=110
        const { container } = renderWithContext();
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('x')).toBe('70');
        expect(rect.getAttribute('y')).toBe('110');
    });

    it('sets rect width to 120 and height to 36', () => {
        const { container } = renderWithContext();
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('width')).toBe('120');
        expect(rect.getAttribute('height')).toBe('36');
    });

    it('renders the "Remove from Map" text option', () => {
        renderWithContext();
        expect(screen.getByText('Remove from Map')).toBeInTheDocument();
    });

    it('renders the close (✕) button', () => {
        renderWithContext();
        expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('applies menu-option class to the remove text', () => {
        const { container } = renderWithContext();
        const texts = container.querySelectorAll('text');
        const optionText = Array.from(texts).find((t) => t.textContent === 'Remove from Map');
        expect(optionText).toBeTruthy();
        expect(optionText.getAttribute('class')).toBe('menu-option');
    });

    it('applies menu-close class to the close text', () => {
        const { container } = renderWithContext();
        const texts = container.querySelectorAll('text');
        const closeText = Array.from(texts).find((t) => t.textContent === '✕');
        expect(closeText).toBeTruthy();
        expect(closeText.getAttribute('class')).toBe('menu-close');
    });

    it('positions "Remove from Map" text at menuX+8, menuY+24', () => {
        // menuX=70, menuY=110 => text at x=78, y=134
        const { container } = renderWithContext();
        const texts = container.querySelectorAll('text');
        const optionText = Array.from(texts).find((t) => t.textContent === 'Remove from Map');
        expect(optionText.getAttribute('x')).toBe('78');
        expect(optionText.getAttribute('y')).toBe('134');
    });

    it('positions close text at menuX+108, menuY+12', () => {
        // menuX=70, menuY=110 => close at x=178, y=122
        const { container } = renderWithContext();
        const texts = container.querySelectorAll('text');
        const closeText = Array.from(texts).find((t) => t.textContent === '✕');
        expect(closeText.getAttribute('x')).toBe('178');
        expect(closeText.getAttribute('y')).toBe('122');
    });

    it('stops propagation on outer group click', () => {
        const { container } = renderWithContext();
        const stopSpy = vi.spyOn(Event.prototype, 'stopPropagation');
        const outerG = container.querySelector('.item-context-menu');
        outerG.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stopSpy).toHaveBeenCalled();
        stopSpy.mockRestore();
    });
});

// ── Event handlers ───────────────────────────────────────────────

describe('event handlers', () => {
    let mocks;

    beforeEach(() => {
        mocks = createMocks();
    });

    it('calls handleRemovePlayer with selectedPlayer.id when "Remove from Map" is clicked', () => {
        render(
            <PlayerContextMenu
                {...defaultProps()}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        fireEvent.click(screen.getByText('Remove from Map'));
        expect(mocks.handleRemovePlayer).toHaveBeenCalledWith('player-1');
    });

    it('calls setSelectedPlayer with null when close (✕) is clicked', () => {
        render(
            <PlayerContextMenu
                {...defaultProps()}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        fireEvent.click(screen.getByText('✕'));
        expect(mocks.setSelectedPlayer).toHaveBeenCalledWith(null);
    });
});

// ── Different grid positions ─────────────────────────────────────

describe('different grid positions', () => {
    let mocks;

    beforeEach(() => {
        mocks = createMocks();
    });

    it('positions menu correctly for gridX=0, gridY=0', () => {
        const player = { id: 'p0', gridX: 0, gridY: 0 };
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={player}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        // gridCenterX(0)=20, menuX=30; gridCenterY(0)=20, menuY=30
        expect(rect.getAttribute('x')).toBe('30');
        expect(rect.getAttribute('y')).toBe('30');
    });

    it('positions menu correctly for negative grid coordinates', () => {
        const player = { id: 'pn', gridX: -1, gridY: -1 };
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={player}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        // gridCenterX(-1)=-20, menuX=-10; gridCenterY(-1)=-20, menuY=-10
        expect(rect.getAttribute('x')).toBe('-10');
        expect(rect.getAttribute('y')).toBe('-10');
    });
});

// ── Edge cases ───────────────────────────────────────────────────

describe('edge cases', () => {
    let mocks;

    beforeEach(() => {
        mocks = createMocks();
    });

    it('calls handleRemovePlayer with the player id even for different ids', () => {
        const player = { id: 'unique-player-id', gridX: 5, gridY: 5 };
        render(
            <PlayerContextMenu
                selectedPlayer={player}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        fireEvent.click(screen.getByText('Remove from Map'));
        expect(mocks.handleRemovePlayer).toHaveBeenCalledWith('unique-player-id');
    });

    it('renders the menu for players with large grid coordinates', () => {
        const player = { id: 'far', gridX: 100, gridY: 200 };
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={player}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mocks.handleRemovePlayer}
                setSelectedPlayer={mocks.setSelectedPlayer}
            />
        );
        expect(container.querySelector('.item-context-menu')).toBeTruthy();
        const rect = container.querySelector('rect');
        // gridCenterX(100)=4020, menuX=4030; gridCenterY(200)=8020, menuY=8030
        expect(rect.getAttribute('x')).toBe('4030');
        expect(rect.getAttribute('y')).toBe('8030');
    });
});
