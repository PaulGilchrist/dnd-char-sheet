// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PlacedItems, { baseProps } from './PlacedItems.test-utils';

function makeItem(type, overrides = {}) {
  return {
    id: `${type}-1`,
    type,
    gridX: 0,
    gridY: 0,
    visible: true,
    ...overrides,
  };
}

function createFogMap(pairs) {
  const fog = new Map();
  for (const [key, value] of pairs) {
    fog.set(key, value);
  }
  return fog;
}

function renderPlacedItems(placedItems, { isLocalhost = false, fog, ...rest } = {}) {
  return render(
    <PlacedItems
      {...baseProps}
      placedItems={placedItems}
      isLocalhost={isLocalhost}
      fog={fog}
      {...rest}
    />,
  );
}

describe('PlacedItems - Fog of war hiding', () => {
  describe('fog hides non-localhost items', () => {
    it('hides furniture when fog covers the cell', () => {
      const items = [makeItem('barrel')];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeNull();
    });

    it('hides npcs when fog covers the cell', () => {
      const items = [makeItem('npc', { name: 'Goblin' })];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('circle.npc-circle')).toBeNull();
    });

    it('shows items when fog does not cover the cell', () => {
      const items = [makeItem('barrel')];
      const fog = createFogMap([['1,1', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });

    it('hides items when fog key does not match item grid position', () => {
      const items = [makeItem('barrel', { gridX: 3, gridY: 4 })];
      const fog = createFogMap([['0,0', true], ['1,1', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });
  });

  describe('fog does not affect localhost', () => {
    it('shows items on localhost even when fog covers the cell', () => {
      const items = [makeItem('barrel')];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: true, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });

    it('shows npcs on localhost even when fog covers the cell', () => {
      const items = [makeItem('npc', { name: 'Goblin' })];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: true, fog });
      expect(container.querySelector('circle.npc-circle')).toBeInTheDocument();
    });
  });

  describe('fog + visible=false interaction', () => {
    it('shows localhost invisible items at reduced opacity even when fog covers cell', () => {
      const items = [makeItem('barrel', { visible: false })];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: true, fog });
      const el = container.querySelector('use[href="#barrel"]');
      expect(el).toBeInTheDocument();
      expect(el.getAttribute('opacity')).toBe('0.5');
    });

    it('hides remote invisible items even when fog does not cover the cell', () => {
      const items = [makeItem('barrel', { visible: false })];
      const fog = createFogMap([['1,1', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeNull();
    });
  });

  describe('fog with undefined/null', () => {
    it('shows items when fog is undefined', () => {
      const items = [makeItem('barrel')];
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog: undefined });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });

    it('shows items when fog is null', () => {
      const items = [makeItem('barrel')];
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog: null });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });

    it('shows items when fog is an empty Map', () => {
      const items = [makeItem('barrel')];
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog: new Map() });
      expect(container.querySelector('use[href="#barrel"]')).toBeInTheDocument();
    });
  });

  describe('multiple items with fog', () => {
    it('hides only the item under fog, shows others on different cells', () => {
      const items = [
        makeItem('barrel', { id: 'barrel-1', gridX: 0, gridY: 0 }),
        makeItem('barrel', { id: 'barrel-2', gridX: 1, gridY: 1 }),
      ];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelectorAll('use[href="#barrel"]')).toHaveLength(1);
    });

    it('hides all items when fog covers all their cells', () => {
      const items = [
        makeItem('barrel', { id: 'barrel-1', gridX: 0, gridY: 0 }),
        makeItem('barrel', { id: 'barrel-2', gridX: 1, gridY: 1 }),
      ];
      const fog = createFogMap([['0,0', true], ['1,1', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelectorAll('use[href="#barrel"]')).toHaveLength(0);
    });

    it('shows all items on localhost even when fog covers all cells', () => {
      const items = [
        makeItem('barrel', { id: 'barrel-1', gridX: 0, gridY: 0 }),
        makeItem('barrel', { id: 'barrel-2', gridX: 1, gridY: 1 }),
      ];
      const fog = createFogMap([['0,0', true], ['1,1', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: true, fog });
      expect(container.querySelectorAll('use[href="#barrel"]')).toHaveLength(2);
    });

    it('hides mixed types when fog covers their cells', () => {
      const items = [
        makeItem('barrel', { gridX: 0, gridY: 0 }),
        makeItem('npc', { name: 'Goblin', gridX: 1, gridY: 1 }),
        makeItem('chest', { gridX: 2, gridY: 2 }),
      ];
      const fog = createFogMap([['0,0', true], ['1,1', true], ['2,2', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#barrel"]')).toBeNull();
      expect(container.querySelector('circle.npc-circle')).toBeNull();
      expect(container.querySelector('use[href="#chest"]')).toBeNull();
    });
  });

  describe('fog with open doors', () => {
    it('hides closed door when fog covers the cell', () => {
      const items = [makeItem('door', { gridX: 0, gridY: 0 })];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelector('use[href="#door"]')).toBeNull();
    });

    it('hides open door when fog covers the cell', () => {
      const items = [makeItem('door', { gridX: 0, gridY: 0, open: true })];
      const fog = createFogMap([['0,0', true]]);
      const { container } = renderPlacedItems(items, { isLocalhost: false, fog });
      expect(container.querySelectorAll('rect[fill="#8B5A2B"]')).toHaveLength(0);
    });
  });
});
