import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerContextMenu from './PlayerContextMenu';

const mockGridCenterX = (gx) => gx * 40 + 20;
const mockGridCenterY = (gy) => gy * 40 + 20;
const mockHandleRemovePlayer = vi.fn();
const mockSetSelectedPlayer = vi.fn();

const defaultPlayer = { id: 'player-1', gridX: 1, gridY: 2 };

// ── Null/undefined player renders nothing ────────────────────────

describe('null/undefined player', () => {
    it('returns null when selectedPlayer is null', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={null}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
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
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        expect(container.innerHTML).toBe('');
    });
});

// ── Rendering with a selected player ─────────────────────────────

describe('selected player rendering', () => {
    it('renders the outer SVG group with class item-context-menu', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const outerG = container.querySelector('.item-context-menu');
        expect(outerG).toBeTruthy();
    });

    it('renders the background rect', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect).toBeTruthy();
    });

    it('positions the rect at the correct menuX/menuY', () => {
        // gridX=1 => gridCenterX(1)=60, menuX=60+10=70
        // gridY=2 => gridCenterY(2)=100, menuY=100+10=110
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('x')).toBe('70');
        expect(rect.getAttribute('y')).toBe('110');
    });

    it('sets rect width to 120 and height to 36', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        expect(rect.getAttribute('width')).toBe('120');
        expect(rect.getAttribute('height')).toBe('36');
    });

    it('renders the "Remove from Map" text option', () => {
        render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        expect(screen.getByText('Remove from Map')).toBeInTheDocument();
    });

    it('renders the close (✕) button text', () => {
        render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('applies menu-option class to the remove text', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const texts = container.querySelectorAll('text');
        const optionText = Array.from(texts).find(t => t.textContent === 'Remove from Map');
        expect(optionText).toBeTruthy();
        expect(optionText.getAttribute('class')).toBe('menu-option');
    });

    it('applies menu-close class to the close text', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const texts = container.querySelectorAll('text');
        const closeText = Array.from(texts).find(t => t.textContent === '✕');
        expect(closeText).toBeTruthy();
        expect(closeText.getAttribute('class')).toBe('menu-close');
    });

    it('positions "Remove from Map" text at menuX+8, menuY+24', () => {
        // menuX=70, menuY=110 => text at x=78, y=134
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const texts = container.querySelectorAll('text');
        const optionText = Array.from(texts).find(t => t.textContent === 'Remove from Map');
        expect(optionText.getAttribute('x')).toBe('78');
        expect(optionText.getAttribute('y')).toBe('134');
    });

    it('positions close text at menuX+108, menuY+12', () => {
        // menuX=70, menuY=110 => close at x=178, y=122
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const texts = container.querySelectorAll('text');
        const closeText = Array.from(texts).find(t => t.textContent === '✕');
        expect(closeText.getAttribute('x')).toBe('178');
        expect(closeText.getAttribute('y')).toBe('122');
    });

    it('stops propagation on outer group click', () => {
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const stopSpy = vi.spyOn(Event.prototype, 'stopPropagation');
        const outerG = container.querySelector('.item-context-menu');
        outerG.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stopSpy).toHaveBeenCalled();
    });
});

// ── Event handlers ───────────────────────────────────────────────

describe('event handlers', () => {
    it('calls handleRemovePlayer with selectedPlayer.id when "Remove from Map" is clicked', () => {
        render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        screen.getByText('Remove from Map').click();
        expect(mockHandleRemovePlayer).toHaveBeenCalledWith('player-1');
    });

    it('calls setSelectedPlayer with null when close (✕) is clicked', () => {
        render(
            <PlayerContextMenu
                selectedPlayer={defaultPlayer}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        screen.getByText('✕').click();
        expect(mockSetSelectedPlayer).toHaveBeenCalledWith(null);
    });
});

// ── Different grid positions ─────────────────────────────────────

describe('different grid positions', () => {
    it('positions menu correctly for gridX=0, gridY=0', () => {
        const player = { id: 'p0', gridX: 0, gridY: 0 };
        const { container } = render(
            <PlayerContextMenu
                selectedPlayer={player}
                gridCenterX={mockGridCenterX}
                gridCenterY={mockGridCenterY}
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
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
                handleRemovePlayer={mockHandleRemovePlayer}
                setSelectedPlayer={mockSetSelectedPlayer}
            />
        );
        const rect = container.querySelector('rect');
        // gridCenterX(-1)=-20, menuX=-10; gridCenterY(-1)=-20, menuY=-10
        expect(rect.getAttribute('x')).toBe('-10');
        expect(rect.getAttribute('y')).toBe('-10');
    });
});
