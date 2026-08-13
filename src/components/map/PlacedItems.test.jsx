// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlacedItems, { baseProps, mockHandleItemPointerDown } from './PlacedItems.test-utils';

// ── Item factory ────────────────────────────────────────────────────────────
const makeItem = (overrides) => ({
  id: 'item-1',
  type: 'barrel',
  gridX: 0,
  gridY: 0,
  visible: true,
  ...overrides,
});

// ── Empty / edge cases ──────────────────────────────────────────────────────
describe('PlacedItems - edge cases and empty input', () => {
  it('renders nothing when placedItems is empty', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[]} />);
    expect(container.querySelector('g.placed-item')).toBeNull();
    expect(container.querySelector('g.npc-group')).toBeNull();
  });

  it('renders nothing when placedItems is undefined', () => {
    const { container } = render(<PlacedItems {...baseProps} />);
    expect(container.querySelector('g.placed-item')).toBeNull();
    expect(container.querySelector('g.npc-group')).toBeNull();
  });
});

// ── Barrel - circle hit area, basic positioning ─────────────────────────────
describe('PlacedItems - barrel circle hit area', () => {
  it('renders barrel use element at grid position', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const useEl = container.querySelector('use[href="#barrel"]');
    expect(useEl).toBeInTheDocument();
    expect(useEl).toHaveAttribute('x');
    expect(useEl).toHaveAttribute('y');
  });

  it('renders barrel hit area circle', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const circle = container.querySelector('circle.item-hit-area');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('cx');
    expect(circle).toHaveAttribute('cy');
    expect(circle).toHaveAttribute('r');
  });

  it('renders barrel reposition highlight circle when dragging', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={items} itemDragging={{ itemId: 'item-1' }} />
    );
    const highlight = container.querySelector('circle.reposition-highlight');
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveAttribute('r');
  });

  it('does not render reposition highlight when not dragging', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    expect(container.querySelector('circle.reposition-highlight')).toBeNull();
  });
});

// ── Door - open/closed state ────────────────────────────────────────────────
describe('PlacedItems - door open/closed state', () => {
  it('renders closed door with use element', () => {
    const items = [makeItem({ type: 'door' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    expect(container.querySelector('use[href="#door"]')).toBeInTheDocument();
  });

  it('renders open door without use element', () => {
    const items = [makeItem({ type: 'door', open: true })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    expect(container.querySelector('use[href="#door"]')).toBeNull();
  });

  it('renders open door hit area as rect', () => {
    const items = [makeItem({ type: 'door' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea).toBeInTheDocument();
  });

  it('renders open door as horizontal rects when not rotated', () => {
    const items = [makeItem({ type: 'door', open: true })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const rects = container.querySelectorAll('rect[fill="#8B5A2B"]');
    expect(rects.length).toBe(2);
    expect(rects[0]).toHaveAttribute('width', '36');
    expect(rects[0]).toHaveAttribute('height', '5');
  });

  it('renders open door as vertical rects when rotated 90', () => {
    const items = [makeItem({ type: 'door', open: true, rotation: 90 })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const rects = container.querySelectorAll('rect[fill="#8B5A2B"]');
    expect(rects.length).toBe(2);
    expect(rects[0]).toHaveAttribute('width', '5');
    expect(rects[0]).toHaveAttribute('height', '36');
  });
});

// ── NPC rendering ───────────────────────────────────────────────────────────
describe('PlacedItems - NPC rendering', () => {
  const npcItem = makeItem({ type: 'npc', name: 'Goblin' });

  it('renders NPC in npc-group instead of placed-item group', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    expect(container.querySelector('g.npc-group')).toBeInTheDocument();
    expect(container.querySelector('g.placed-item')).toBeNull();
  });

  it('renders NPC circle with correct class', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    expect(container.querySelector('circle.npc-circle')).toBeInTheDocument();
  });

  it('renders NPC initial text from name first character', () => {
    render(<PlacedItems {...baseProps} placedItems={[npcItem]} npcImages={{}} />);
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('renders NPC name text', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} npcImages={{}} />);
    const nameText = container.querySelector('text.npc-name');
    expect(nameText).toBeInTheDocument();
    expect(nameText).toHaveTextContent('Goblin');
  });

  it('renders NPC image from npcImages prop', () => {
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={[npcItem]} npcImages={{ Goblin: '/goblin.png' }} />
    );
    const image = container.querySelector('image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('xlink:href', '/goblin.png');
  });

  it('renders NPC image from imageUrl prop when npcImages is empty', () => {
    const itemWithUrl = makeItem({ type: 'npc', name: 'Goblin', imageUrl: '/custom.png' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[itemWithUrl]} npcImages={{}} />);
    const image = container.querySelector('image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('xlink:href', '/custom.png');
  });

  it('prefers npcImages over imageUrl when both are present', () => {
    const itemWithUrl = makeItem({ type: 'npc', name: 'Goblin', imageUrl: '/custom.png' });
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={[itemWithUrl]} npcImages={{ Goblin: '/goblin.png' }} />
    );
    const image = container.querySelector('image');
    expect(image).toHaveAttribute('xlink:href', '/goblin.png');
  });

  it('renders NPC text initial when no image is available', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} npcImages={{}} />);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('text.npc-initial')).toBeInTheDocument();
  });

  it('does not render NPC hit area with .item-hit-area class', () => {
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    expect(container.querySelector('rect.item-hit-area')).toBeNull();
  });

  it('renders NPC at reduced opacity when visible=false on localhost', () => {
    const invisibleNpc = makeItem({ type: 'npc', name: 'Goblin', visible: false });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[invisibleNpc]} isLocalhost={true} />);
    const circle = container.querySelector('circle.npc-circle');
    expect(circle).toBeInTheDocument();
    expect(circle.style.opacity).toBe('0.5');
  });
});

// ── Visibility: localhost vs remote ─────────────────────────────────────────
describe('PlacedItems - visibility rules', () => {
  it('hides hit areas and reposition highlights on remote', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} />);
    expect(container.querySelectorAll('.item-hit-area').length).toBe(0);
    expect(container.querySelectorAll('.reposition-highlight').length).toBe(0);
  });

  it('shows hit areas and reposition highlights on localhost', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={items} isLocalhost={true} itemDragging={{ itemId: 'item-1' }} />
    );
    expect(container.querySelectorAll('.item-hit-area').length).toBe(1);
    expect(container.querySelectorAll('.reposition-highlight').length).toBe(1);
  });

  it('renders localhost invisible items at reduced opacity', () => {
    const items = [makeItem({ type: 'barrel', visible: false })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={true} />);
    const useEl = container.querySelector('use[href="#barrel"]');
    expect(useEl).toHaveAttribute('opacity', '0.5');
  });

  it('hides remote invisible items entirely', () => {
    const items = [makeItem({ type: 'barrel', visible: false })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeNull();
  });

  it('shows remote visible items normally', () => {
    const items = [makeItem({ type: 'barrel', visible: true })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} />);
    const useEl = container.querySelector('use[href="#barrel"]');
    expect(useEl).toBeInTheDocument();
    expect(useEl).toHaveAttribute('opacity', '1');
  });

  it('applies opacity 0.5 to NPC on localhost when invisible', () => {
    const invisibleNpc = makeItem({ type: 'npc', name: 'Goblin', visible: false });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[invisibleNpc]} isLocalhost={true} />);
    const circle = container.querySelector('circle.npc-circle');
    expect(circle).toHaveAttribute('style');
    expect(circle.style.opacity).toBe('0.5');
  });
});

// ── Fog of war ──────────────────────────────────────────────────────────────
describe('PlacedItems - fog of war', () => {
  it('hides fog-covered items on remote', () => {
    const fog = new Map([['0,0', true]]);
    const items = [makeItem({ type: 'barrel', gridX: 0, gridY: 0 })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={fog} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeNull();
  });

  it('shows fog-covered items on localhost', () => {
    const fog = new Map([['0,0', true]]);
    const items = [makeItem({ type: 'barrel', gridX: 0, gridY: 0 })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={true} fog={fog} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
  });

  it('shows items when fog does not cover the cell', () => {
    const fog = new Map([['1,1', true]]);
    const items = [makeItem({ type: 'barrel', gridX: 0, gridY: 0 })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={fog} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
  });

  it('handles undefined fog gracefully', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={undefined} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
  });

  it('handles null fog gracefully', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={null} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
  });

  it('hides only the fog-covered item among multiple', () => {
    const fog = new Map([['0,0', true]]);
    const items = [
      makeItem({ id: 'barrel-1', type: 'barrel', gridX: 0, gridY: 0 }),
      makeItem({ id: 'barrel-2', type: 'barrel', gridX: 1, gridY: 1 }),
    ];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={fog} />);
    expect(container.querySelectorAll('use[href="#barrel"]')).toHaveLength(1);
  });
});

// ── Reposition highlight shapes per type ────────────────────────────────────
describe('PlacedItems - reposition highlight shapes', () => {
  it.each(['barrel', 'firepit'])('renders circle highlight for %s when dragging', (type) => {
    const items = [makeItem({ type })];
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={items} isLocalhost={true} itemDragging={{ itemId: 'item-1' }} />
    );
    expect(container.querySelector('circle.reposition-highlight')).toBeInTheDocument();
  });

  it.each([
    'altar', 'arrowSlitWall', 'bed', 'bookshelf', 'chair', 'chest', 'crate',
    'door', 'fountain', 'pillar', 'secretDoor', 'skeleton', 'stairs',
    'statue', 'table', 'torch', 'trap', 'tree', 'web',
  ])('renders rect highlight for %s when dragging', (type) => {
    const items = [makeItem({ type })];
    const { container } = render(
      <PlacedItems {...baseProps} placedItems={items} isLocalhost={true} itemDragging={{ itemId: 'item-1' }} />
    );
    expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
  });
});

// ── Type filtering and unknown types ────────────────────────────────────────
describe('PlacedItems - mixed items', () => {
  it('renders multiple item types in a single render', () => {
    const items = [
      makeItem({ id: 'barrel-1', type: 'barrel' }),
      makeItem({ id: 'chest-1', type: 'chest', gridX: 1 }),
      makeItem({ id: 'npc-1', type: 'npc', name: 'Goblin', gridX: 2 }),
    ];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    expect(container.querySelector('use[href="#chest"]')).toBeInTheDocument();
    expect(container.querySelector('circle.npc-circle')).toBeInTheDocument();
  });

  it('renders all non-NPC types as placed-item groups with use elements', () => {
    const types = [
      'altar', 'arrowSlitWall', 'barrel', 'bed', 'bookshelf', 'boulder', 'bush',
      'chair', 'chest', 'crate', 'door', 'firepit', 'fountain', 'pillar',
      'secretDoor', 'skeleton', 'stairs', 'statue', 'table', 'torch', 'trap',
      'tree', 'web',
    ];
    types.forEach((type) => {
      const items = [makeItem({ type })];
      const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
      expect(container.querySelector('g.placed-item')).toBeInTheDocument();
      expect(container.querySelector(`use[href="#${type}"]`)).toBeInTheDocument();
    });
  });

  it('renders barrel and other types with circle vs rect hit areas correctly', () => {
    const { container: barrelContainer } = render(<PlacedItems {...baseProps} placedItems={[makeItem({ type: 'barrel' })]} />);
    expect(barrelContainer.querySelector('circle.item-hit-area')).toBeInTheDocument();
    expect(barrelContainer.querySelector('rect.item-hit-area')).toBeNull();

    const { container: tableContainer } = render(<PlacedItems {...baseProps} placedItems={[makeItem({ type: 'table' })]} />);
    expect(tableContainer.querySelector('rect.item-hit-area')).toBeInTheDocument();
    expect(tableContainer.querySelector('circle.item-hit-area')).toBeNull();
  });
});

// ── Rotation support ────────────────────────────────────────────────────────
describe('PlacedItems - rotation', () => {
  it.each(['bed', 'altar', 'bookshelf', 'door', 'secretDoor', 'stairs', 'chair', 'torch', 'arrowSlitWall'])('renders %s with rotation transform when rotation is set', (type) => {
      const items = [makeItem({ type, rotation: 90 })];
      const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
      const useEl = container.querySelector(`use[href="#${type}"]`);
      expect(useEl).toHaveAttribute('transform');
      expect(useEl.getAttribute('transform')).toMatch(/rotate\(/);
    });

  it.each(['bed', 'altar', 'bookshelf', 'door', 'secretDoor', 'stairs', 'chair', 'torch', 'arrowSlitWall'])('renders %s without transform when rotation is absent', (type) => {
      const items = [makeItem({ type })];
      const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
      const useEl = container.querySelector(`use[href="#${type}"]`);
      expect(useEl).not.toHaveAttribute('transform');
    });
});

// ── Event handlers ──────────────────────────────────────────────────────────
describe('PlacedItems - event handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls handleItemPointerDown on barrel hit area pointerdown', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('circle.item-hit-area');
    hitArea.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(mockHandleItemPointerDown).toHaveBeenCalledWith(expect.anything(), 'item-1');
  });

  it('calls handleItemPointerDown on table hit area pointerdown', () => {
    const items = [makeItem({ type: 'table' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('rect.item-hit-area');
    hitArea.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(mockHandleItemPointerDown).toHaveBeenCalledWith(expect.anything(), 'item-1');
  });

  it('calls handleItemPointerDown on NPC hit area pointerdown', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    const hitArea = container.querySelector('rect[fill="transparent"]');
    hitArea.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(mockHandleItemPointerDown).toHaveBeenCalledWith(expect.anything(), 'item-1');
  });

  it('calls setSelectedItem on barrel contextmenu', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('circle.item-hit-area');
    hitArea.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(baseProps.setSelectedItem).toHaveBeenCalledWith({ id: 'item-1', gridX: 0, gridY: 0 });
  });

  it('calls setSelectedItem on NPC contextmenu', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    const hitArea = container.querySelector('rect[fill="transparent"]');
    hitArea.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(baseProps.setSelectedItem).toHaveBeenCalledWith({ id: 'item-1', gridX: 0, gridY: 0 });
  });

  it('prevents default and propagation on contextmenu', () => {
    const items = [makeItem({ type: 'chest' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('rect.item-hit-area');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    hitArea.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});
