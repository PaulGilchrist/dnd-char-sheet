// @improved-by-ai
// Event handler behavioral tests.
//
// These tests verify behavior through the mock functions that the component
// receives as props (handleItemPointerDown, setSelectedItem), confirming the
// component wires up the correct callbacks with the right arguments.
//
// All hit-area rendering (circle vs rect, NPC vs placed-item), reposition
// highlights, and localhost/remote visibility are covered in:
//   - PlacedItems.test.jsx (structural + event handler tests)
//   - PlacedItems-fog.test.jsx (fog interaction)
//   - PlacedItems-localhost-rendering.test.jsx (hit area presence per type)
//   - PlacedItems-localhost-rendering-2.test.jsx (negative assertions)

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// ── Event handler tests ─────────────────────────────────────────────────────
describe('PlacedItems - event handler wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the correct item id to handleItemPointerDown on barrel pointerdown', () => {
    const items = [makeItem({ type: 'barrel', id: 'barrel-42' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    const hitArea = container.querySelector('circle.item-hit-area');
    hitArea.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(mockHandleItemPointerDown).toHaveBeenCalledWith(expect.anything(), 'barrel-42');
  });

  it('passes the correct item id to handleItemPointerDown on NPC pointerdown', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin', id: 'npc-7' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    // NPC hit area is the transparent rect (not the circle with .npc-circle class)
    const hitArea = container.querySelector('rect[fill="transparent"]');
    hitArea.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(mockHandleItemPointerDown).toHaveBeenCalledWith(expect.anything(), 'npc-7');
  });

  it('passes the correct item id to setSelectedItem on barrel contextmenu', () => {
    const items = [makeItem({ id: 'chest-99', gridX: 3, gridY: 5 })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} />);
    // Barrel uses circle hit area
    const hitArea = container.querySelector('circle.item-hit-area');
    hitArea.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(baseProps.setSelectedItem).toHaveBeenCalledWith({ id: 'chest-99', gridX: 3, gridY: 5 });
  });

  it('passes the correct item id to setSelectedItem on NPC contextmenu', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Dragon', id: 'dragon-1', gridX: 2, gridY: 4 });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} />);
    const hitArea = container.querySelector('rect[fill="transparent"]');
    hitArea.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(baseProps.setSelectedItem).toHaveBeenCalledWith({ id: 'dragon-1', gridX: 2, gridY: 4 });
  });

  it('does not call handleItemPointerDown when hit area is not rendered (remote client)', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} />);
    // No hit area should exist on remote
    const hitArea = container.querySelector('.item-hit-area');
    expect(hitArea).toBeNull();
    expect(mockHandleItemPointerDown).not.toHaveBeenCalled();
  });

  it('does not call setSelectedItem when hit area is not rendered (remote client)', () => {
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} />);
    const hitArea = container.querySelector('.item-hit-area');
    expect(hitArea).toBeNull();
    expect(baseProps.setSelectedItem).not.toHaveBeenCalled();
  });

  it('does not render any hit area for fog-covered items on remote', () => {
    const fog = new Map([['0,0', true]]);
    const items = [makeItem({ type: 'barrel' })];
    const { container } = render(<PlacedItems {...baseProps} placedItems={items} isLocalhost={false} fog={fog} />);
    const hitArea = container.querySelector('.item-hit-area');
    expect(hitArea).toBeNull();
  });

  it('does not call handleItemPointerDown for NPC hit area on remote', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} isLocalhost={false} />);
    // NPC on remote should not have the transparent rect hit area
    const hitArea = container.querySelector('rect[fill="transparent"]');
    expect(hitArea).toBeNull();
    expect(mockHandleItemPointerDown).not.toHaveBeenCalled();
  });

  it('does not call setSelectedItem for NPC hit area on remote', () => {
    const npcItem = makeItem({ type: 'npc', name: 'Goblin' });
    const { container } = render(<PlacedItems {...baseProps} placedItems={[npcItem]} isLocalhost={false} />);
    const hitArea = container.querySelector('rect[fill="transparent"]');
    expect(hitArea).toBeNull();
    expect(baseProps.setSelectedItem).not.toHaveBeenCalled();
  });
});
