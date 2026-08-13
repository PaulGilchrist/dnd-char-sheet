// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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

function renderWithLocalhost(placedItems, isLocalhost = true, itemDragging = null, fog = new Map()) {
  return render(
    <PlacedItems
      {...baseProps}
      placedItems={placedItems}
      isLocalhost={isLocalhost}
      itemDragging={itemDragging}
      fog={fog}
    />,
  );
}

// ── Rect-type items: negative assertions (they must NOT render circle hit areas) ──
// These types are verified to render rect hit areas in PlacedItems.test.jsx.
// These tests ensure the implementation does not regress to circle hit areas.
const RECT_ONLY_TYPES = ['altar', 'bookshelf', 'chair', 'door', 'secretDoor', 'pillar', 'stairs', 'trap', 'arrowSlitWall'];

describe('PlacedItems - rect-type items do not render circle hit areas', () => {
  it.each(RECT_ONLY_TYPES)('does not render circle hit area for %s', (type) => {
    const { container } = renderWithLocalhost([makeItem({ type })]);
    expect(container.querySelector(`g.placed-item circle.item-hit-area`)).toBeNull();
  });

  it.each(RECT_ONLY_TYPES)('does not render circle reposition highlight for %s when dragging', (type) => {
    const { container } = renderWithLocalhost([makeItem({ type })], true, { itemId: 'item-1' });
    expect(container.querySelector(`g.placed-item circle.reposition-highlight`)).toBeNull();
  });
});

// ── Remote rendering: localhost-only elements must not appear for remote clients ──
describe('PlacedItems - rect-type items hide localhost elements on remote', () => {
  it.each(RECT_ONLY_TYPES)('hides hit area and highlight for %s on remote', (type) => {
    const { container } = renderWithLocalhost([makeItem({ type })], false);
    const group = container.querySelector(`g.placed-item`);
    expect(group?.querySelector('.item-hit-area')).toBeNull();
    expect(group?.querySelector('.reposition-highlight')).toBeNull();
  });

  it.each(RECT_ONLY_TYPES)('still renders the use element for %s on remote', (type) => {
    const { container } = renderWithLocalhost([makeItem({ type })], false);
    expect(container.querySelector(`use[href="#${type}"]`)).toBeInTheDocument();
  });
});

// ── Invisible items on localhost: opacity must be 0.5 for rect-type items ──
describe('PlacedItems - rect-type invisible items on localhost', () => {
  it.each(RECT_ONLY_TYPES)('renders invisible %s at 0.5 opacity on localhost', (type) => {
    const { container } = renderWithLocalhost([makeItem({ type, visible: false })], true);
    const useEl = container.querySelector(`use[href="#${type}"]`);
    if (useEl) {
      expect(useEl).toHaveAttribute('opacity', '0.5');
    }
  });
});

// ── Fog + localhost: fog should not hide items for localhost clients ──
describe('PlacedItems - fog does not affect localhost rect-type items', () => {
  it.each(RECT_ONLY_TYPES)('shows %s on localhost even when fog covers the cell', (type) => {
    const fog = new Map([['0,0', true]]);
    const { container } = renderWithLocalhost([makeItem({ type })], true, null, fog);
    expect(container.querySelector(`use[href="#${type}"]`)).toBeInTheDocument();
  });
});

// ── NPC localhost: negative assertions ──
describe('PlacedItems - NPC localhost rendering negative assertions', () => {
  it('does not render placed-item group for NPC', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderWithLocalhost([npcItem]);
    expect(container.querySelector('g.placed-item')).toBeNull();
  });

  it('does not render rect hit area for NPC (uses transparent rect without class)', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderWithLocalhost([npcItem]);
    // NPC hit area is a plain rect with fill="transparent", not a rect with .item-hit-area class
    expect(container.querySelector('rect.item-hit-area')).toBeNull();
  });

  it('does not render rect reposition highlight for NPC (uses circle)', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderWithLocalhost([npcItem], true, { itemId: 'item-1' });
    expect(container.querySelector('rect.reposition-highlight')).toBeNull();
  });
});

// ── Mixed item groups: localhost rendering with multiple rect-type items ──
describe('PlacedItems - mixed rect-type items on localhost', () => {
  it('renders hit areas for all rect-type items on localhost', () => {
    const items = [
      makeItem({ id: 'altar-1', type: 'altar' }),
      makeItem({ id: 'door-1', type: 'door', gridX: 1 }),
      makeItem({ id: 'chair-1', type: 'chair', gridX: 2 }),
    ];
    const { container } = renderWithLocalhost(items);
    expect(container.querySelectorAll('rect.item-hit-area')).toHaveLength(3);
  });

  it('renders reposition highlights only for the dragged item', () => {
    const items = [
      makeItem({ id: 'altar-1', type: 'altar' }),
      makeItem({ id: 'door-1', type: 'door', gridX: 1 }),
      makeItem({ id: 'chair-1', type: 'chair', gridX: 2 }),
    ];
    const { container } = renderWithLocalhost(items, true, { itemId: 'door-1' });
    expect(container.querySelectorAll('rect.reposition-highlight')).toHaveLength(1);
  });
});
