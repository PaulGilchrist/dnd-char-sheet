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

describe('PlacedItems - localhost hit area rendering (altar, bookshelf, chair)', () => {
  describe('altar', () => {
    it('renders altar hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'altar' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders altar reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'altar' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('bookshelf', () => {
    it('renders bookshelf hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'bookshelf' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders bookshelf reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'bookshelf' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('chair', () => {
    it('renders chair hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'chair' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders chair reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'chair' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });
});

describe('PlacedItems - localhost hit area rendering (door, secretDoor, pillar)', () => {
  describe('door', () => {
    it('renders door hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'door' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders door reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'door' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('secretDoor', () => {
    it('renders secretDoor hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'secretDoor' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders secretDoor reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'secretDoor' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('pillar', () => {
    it('renders pillar hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'pillar' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders pillar reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'pillar' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });
});

describe('PlacedItems - localhost hit area rendering (stairs, trap, arrowSlitWall)', () => {
  describe('stairs', () => {
    it('renders stairs hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'stairs' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders stairs reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'stairs' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('trap', () => {
    it('renders trap hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'trap' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders trap reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'trap' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('arrowSlitWall', () => {
    it('renders arrowSlitWall hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'arrowSlitWall' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders arrowSlitWall reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'arrowSlitWall' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });
});

describe('PlacedItems - NPC localhost hit area', () => {
  it('renders NPC hit area rect on localhost', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderWithLocalhost([npcItem], true);
    expect(container.querySelector('rect[fill="transparent"]')).toBeInTheDocument();
  });

  it('renders NPC reposition highlight circle when dragging', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = renderWithLocalhost(
      [npcItem],
      true,
      { itemId: 'item-1' }
    );
    expect(container.querySelector('circle.reposition-highlight')).toBeInTheDocument();
  });
});
