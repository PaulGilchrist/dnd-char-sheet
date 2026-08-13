// @improved-by-ai
// Localhost-specific rendering tests.
//
// Structural + event handler + fog + visibility tests are covered in:
//   - PlacedItems.test.jsx (all structural, visibility, fog, rotation, event handler, mixed-type tests)
//   - PlacedItems-fog.test.jsx (extensive fog interaction tests)
//   - PlacedItems-event-handlers.test.jsx (event handler wiring with unique IDs)
//   - PlacedItems-localhost-rendering-2.test.jsx (negative assertions for rect-type items, remote hiding)
//
// This file focuses on localhost-specific details not covered elsewhere:
//   - cursor: grab style on hit areas
//   - NPC reposition highlight uses circle (not rect)
//   - NPC circle has correct class and attributes
//   - NPC text elements have correct classes
//   - NPC defs/clipPath rendering
//   - NPC image rendering with correct attributes
//   - NPC group does not render placed-item group
//   - NPC does not render item-hit-area class
//   - NPC does not render reposition-highlight rect
//   - Barrel hit area has cursor: grab
//   - Barrel reposition highlight has correct r value
//   - All localhost-only elements have cursor: grab

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlacedItems, { baseProps } from './PlacedItems.test-utils';

function makeItem(overrides) {
  return {
    id: 'item-1',
    type: 'barrel',
    gridX: 0,
    gridY: 0,
    visible: true,
    ...overrides,
  };
}

function renderOnLocalhost(placedItems, itemDragging = null, fog = new Map()) {
  return render(
    <PlacedItems
      {...baseProps}
      placedItems={placedItems}
      isLocalhost={true}
      itemDragging={itemDragging}
      fog={fog}
    />,
  );
}

describe('PlacedItems - localhost hit area cursor style', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders barrel hit area with cursor: grab', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'barrel' })]);
    const hitArea = container.querySelector('circle.item-hit-area');
    expect(hitArea.style.cursor).toBe('grab');
  });

  it('renders table hit area with cursor: grab', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'table' })]);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea.style.cursor).toBe('grab');
  });

  it('renders door hit area with cursor: grab', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'door' })]);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea.style.cursor).toBe('grab');
  });

  it('renders NPC transparent hit area with cursor: grab', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem]);
    const hitArea = container.querySelector('rect[fill="transparent"]');
    expect(hitArea.style.cursor).toBe('grab');
  });
});

describe('PlacedItems - NPC localhost rendering details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders NPC in npc-group with correct class', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem]);
    expect(container.querySelector('g.npc-group')).toBeInTheDocument();
  });

  it('does not render placed-item group for NPC', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem]);
    expect(container.querySelector('g.placed-item')).toBeNull();
  });

  it('renders NPC circle with npc-circle class and correct attributes', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem]);
    const circle = container.querySelector('circle.npc-circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('cx');
    expect(circle).toHaveAttribute('cy');
    expect(circle).toHaveAttribute('r', '20');
  });

  it('renders NPC initial text with npc-initial class', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    renderOnLocalhost([npcItem]);
    expect(screen.getByText('G')).toHaveClass('npc-initial');
  });

  it('renders NPC name text with npc-name class', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem]);
    const nameText = container.querySelector('text.npc-name');
    expect(nameText).toBeInTheDocument();
    expect(nameText).toHaveTextContent('Goblin');
  });

  it('renders NPC clipPath def with correct id pattern', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin', id: 'npc-42' });
    const { container } = renderOnLocalhost([npcItem]);
    const clipPath = container.querySelector('clipPath');
    expect(clipPath).toBeInTheDocument();
    expect(clipPath.getAttribute('id')).toMatch(/^npc-clip-npc-42$/);
  });

  it('renders NPC image with clipPath reference when imageUrl provided', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin', id: 'npc-1', imageUrl: '/goblin.png' });
    const { container } = renderOnLocalhost([npcItem]);
    const image = container.querySelector('image.creature-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('clip-path', 'url(#npc-clip-npc-1)');
    expect(image).toHaveAttribute('xlink:href', '/goblin.png');
  });

  it('renders NPC image with correct dimensions', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin', id: 'npc-1', imageUrl: '/goblin.png' });
    const { container } = renderOnLocalhost([npcItem]);
    const image = container.querySelector('image.creature-image');
    expect(image).toHaveAttribute('width', '36');
    expect(image).toHaveAttribute('height', '36');
  });

  it('renders NPC reposition highlight as circle (not rect)', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem], { itemId: 'item-1' });
    const circleHighlight = container.querySelector('circle.reposition-highlight');
    expect(circleHighlight).toBeInTheDocument();
    expect(container.querySelector('rect.reposition-highlight')).toBeNull();
  });

  it('renders NPC reposition highlight with correct radius', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderOnLocalhost([npcItem], { itemId: 'item-1' });
    const highlight = container.querySelector('circle.reposition-highlight');
    expect(highlight).toHaveAttribute('r', '24');
  });
});

describe('PlacedItems - barrel localhost rendering details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders barrel hit area circle with correct r value', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'barrel' })]);
    const hitArea = container.querySelector('circle.item-hit-area');
    expect(hitArea).toHaveAttribute('r', '20');
  });

  it('renders barrel reposition highlight with r = 24', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'barrel' })], { itemId: 'item-1' });
    const highlight = container.querySelector('circle.reposition-highlight');
    expect(highlight).toHaveAttribute('r', '24');
  });

  it('renders barrel use element with correct offset positioning', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'barrel' })]);
    const useEl = container.querySelector('use[href="#barrel"]');
    expect(useEl).toHaveAttribute('x');
    expect(useEl).toHaveAttribute('y');
    // gridCenterX(0) = 0*50+25 = 25, x = 25-18 = 7
    expect(useEl.getAttribute('x')).toBe('7');
    expect(useEl.getAttribute('y')).toBe('7');
  });
});

describe('PlacedItems - table localhost rendering details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table hit area rect with correct dimensions when not rotated', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'table' })]);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea).toHaveAttribute('width', '72');
    expect(hitArea).toHaveAttribute('height', '36');
  });

  it('renders table hit area rect with swapped dimensions when rotated 90', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'table', rotation: 90 })]);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea).toHaveAttribute('width', '36');
    expect(hitArea).toHaveAttribute('height', '72');
  });

  it('renders table reposition highlight matching hit area dimensions', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'table' })], { itemId: 'item-1' });
    const highlight = container.querySelector('rect.reposition-highlight');
    expect(highlight).toHaveAttribute('width', '72');
    expect(highlight).toHaveAttribute('height', '36');
  });

  it('renders table reposition highlight matching rotated hit area dimensions', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'table', rotation: 90 })], { itemId: 'item-1' });
    const highlight = container.querySelector('rect.reposition-highlight');
    expect(highlight).toHaveAttribute('width', '36');
    expect(highlight).toHaveAttribute('height', '72');
  });
});

describe('PlacedItems - firepit localhost rendering details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders firepit hit area rect with correct dimensions', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'firepit' })]);
    const hitArea = container.querySelector('rect.item-hit-area');
    expect(hitArea).toHaveAttribute('width', '36');
    expect(hitArea).toHaveAttribute('height', '36');
  });

  it('renders firepit reposition highlight as circle (not rect)', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'firepit' })], { itemId: 'item-1' });
    const circleHighlight = container.querySelector('circle.reposition-highlight');
    expect(circleHighlight).toBeInTheDocument();
    expect(container.querySelector('rect.reposition-highlight')).toBeNull();
  });

  it('renders firepit reposition highlight with correct radius', () => {
    const { container } = renderOnLocalhost([makeItem({ type: 'firepit' })], { itemId: 'item-1' });
    const highlight = container.querySelector('circle.reposition-highlight');
    expect(highlight).toHaveAttribute('r', '18');
  });
});

describe('PlacedItems - localhost group key uniqueness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each item in its own placed-item group', () => {
    const items = [
      makeItem({ id: 'barrel-1', type: 'barrel' }),
      makeItem({ id: 'barrel-2', type: 'barrel', gridX: 1 }),
      makeItem({ id: 'barrel-3', type: 'barrel', gridX: 2 }),
    ];
    const { container } = renderOnLocalhost(items);
    const groups = container.querySelectorAll('g.placed-item');
    expect(groups).toHaveLength(3);
  });

  it('renders mixed types in separate groups', () => {
    const items = [
      makeItem({ id: 'barrel-1', type: 'barrel' }),
      makeItem({ id: 'chest-1', type: 'chest', gridX: 1 }),
      makeItem({ id: 'npc-1', type: 'npc', name: 'Goblin', gridX: 2 }),
    ];
    const { container } = renderOnLocalhost(items);
    expect(container.querySelectorAll('g.placed-item')).toHaveLength(2);
    expect(container.querySelectorAll('g.npc-group')).toHaveLength(1);
  });
});
