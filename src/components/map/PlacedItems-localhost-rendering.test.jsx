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

describe('PlacedItems - localhost hit area rendering', () => {
  describe('barrel', () => {
    it('renders barrel hit area circle on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'barrel' })], true);
      expect(container.querySelector('circle.item-hit-area')).toBeInTheDocument();
    });

    it('renders barrel reposition highlight circle when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'barrel' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('circle.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('table', () => {
    it('renders table hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'table' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders table reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'table' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('bed', () => {
    it('renders bed hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'bed' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders bed reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'bed' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('firepit', () => {
    it('renders firepit hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'firepit' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders firepit reposition highlight circle when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'firepit' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('circle.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('chest', () => {
    it('renders chest hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'chest' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders chest reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'chest' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('crate', () => {
    it('renders crate hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'crate' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders crate reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'crate' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('fountain', () => {
    it('renders fountain hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'fountain' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders fountain reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'fountain' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('skeleton', () => {
    it('renders skeleton hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'skeleton' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders skeleton reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'skeleton' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('statue', () => {
    it('renders statue hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'statue' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders statue reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'statue' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('torch', () => {
    it('renders torch hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'torch' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders torch reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'torch' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('web', () => {
    it('renders web hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'web' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders web reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'web' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('boulder', () => {
    it('renders boulder hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'boulder' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders boulder reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'boulder' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('bush', () => {
    it('renders bush hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'bush' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders bush reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'bush' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });

  describe('tree', () => {
    it('renders tree hit area rect on localhost', () => {
      const { container } = renderWithLocalhost([makeItem({ type: 'tree' })], true);
      expect(container.querySelector('rect.item-hit-area')).toBeInTheDocument();
    });

    it('renders tree reposition highlight rect when dragging', () => {
      const { container } = renderWithLocalhost(
        [makeItem({ type: 'tree' })],
        true,
        { itemId: 'item-1' }
      );
      expect(container.querySelector('rect.reposition-highlight')).toBeInTheDocument();
    });
  });
});
