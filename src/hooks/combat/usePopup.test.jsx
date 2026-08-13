// @improved-by-ai
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import usePopup from './usePopup.js';

describe('usePopup', () => {
  describe('initialization', () => {
    it('should return showPopup, popupHtml, and setPopupHtml', () => {
      const { result } = renderHook(() => usePopup(() => ''));
      expect(result.current).toHaveProperty('showPopup');
      expect(result.current).toHaveProperty('popupHtml');
      expect(result.current).toHaveProperty('setPopupHtml');
      expect(result.current.popupHtml).toBeNull();
    });

    it('should initialize popupHtml to null', () => {
      const { result } = renderHook(() => usePopup(() => '<p>x</p>'));
      expect(result.current.popupHtml).toBeNull();
    });
  });

  describe('showPopup', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('should set popupHtml when buildHtml returns a truthy value', () => {
      const buildHtml = vi.fn(() => '<p>hello</p>');
      const { result } = renderHook(() => usePopup(buildHtml));
      act(() => result.current.showPopup({ id: 1 }));
      expect(result.current.popupHtml).toBe('<p>hello</p>');
    });

    it('should not change popupHtml when buildHtml returns a falsy value', () => {
      const buildHtml = vi.fn(() => null);
      const { result } = renderHook(() => usePopup(buildHtml));
      act(() => result.current.showPopup({ id: 1 }));
      expect(result.current.popupHtml).toBeNull();
    });

    it('should pass the entity to buildHtml', () => {
      const buildHtml = vi.fn(() => '');
      const entity = { type: 'monster', hp: 50 };
      const { result } = renderHook(() => usePopup(buildHtml));
      act(() => result.current.showPopup(entity));
      expect(buildHtml).toHaveBeenCalledWith(entity);
    });

    it('should call buildHtml even when entity is null or undefined', () => {
      const buildHtml = vi.fn(() => '<p>x</p>');
      const { result } = renderHook(() => usePopup(buildHtml));
      act(() => result.current.showPopup(null));
      expect(buildHtml).toHaveBeenNthCalledWith(1, null);
      act(() => result.current.showPopup(undefined));
      expect(buildHtml).toHaveBeenNthCalledWith(2, undefined);
    });

    it('should update popupHtml on successive showPopup calls', () => {
      const buildHtml = vi.fn((e) => `<p>${e.name}</p>`);
      const { result } = renderHook(() => usePopup(buildHtml));
      act(() => result.current.showPopup({ name: 'A' }));
      expect(result.current.popupHtml).toBe('<p>A</p>');
      act(() => result.current.showPopup({ name: 'B' }));
      expect(result.current.popupHtml).toBe('<p>B</p>');
    });

    it('should propagate errors from buildHtml', () => {
      const buildHtml = vi.fn(() => { throw new Error('boom'); });
      const { result } = renderHook(() => usePopup(buildHtml));
      expect(() => act(() => result.current.showPopup({ id: 1 }))).toThrow('boom');
      expect(result.current.popupHtml).toBeNull();
    });
  });

  describe('setPopupHtml', () => {
    it('should update popupHtml to any value including null', () => {
      const { result } = renderHook(() => usePopup(() => ''));
      act(() => result.current.setPopupHtml('<p>custom</p>'));
      expect(result.current.popupHtml).toBe('<p>custom</p>');
      act(() => result.current.setPopupHtml(null));
      expect(result.current.popupHtml).toBeNull();
    });

    it('should allow setPopupHtml to override previous content', () => {
      const { result } = renderHook(() => usePopup(() => '<p>old</p>'));
      act(() => result.current.setPopupHtml('<p>new</p>'));
      expect(result.current.popupHtml).toBe('<p>new</p>');
    });
  });

  describe('popupHtml truthiness gate', () => {
    const falsyValues = [null, '', 0, false, undefined];
    for (const val of falsyValues) {
      it(`should keep popupHtml null when buildHtml returns ${JSON.stringify(val)}`, () => {
        const { result } = renderHook(() => usePopup(() => val));
        act(() => result.current.showPopup({ id: 1 }));
        expect(result.current.popupHtml).toBeNull();
      });
    }
  });

  describe('DOM integration', () => {
    function TestHarness({ onShow, onSet, html }) {
      const { showPopup, setPopupHtml } = usePopup(() => '');
      return (
        <div>
          <button data-testid="show" onClick={() => showPopup({ name: 'Test' })}>Show</button>
          <button data-testid="set" onClick={() => setPopupHtml(html)}>Set</button>
          {onShow && <button data-testid="on-show" onClick={onShow}>OnShow</button>}
          {onSet && <button data-testid="on-set" onClick={onSet}>OnSet</button>}
          {onShow && onSet && (
            <div data-testid="output" dangerouslySetInnerHTML={{ __html: html || (onSet ? '' : '') }} />
          )}
        </div>
      );
    }

    it('should render buttons and trigger showPopup on click', () => {
      render(<TestHarness />);
      fireEvent.click(screen.getByTestId('show'));
    });

    it('should render buttons and trigger setPopupHtml on click', () => {
      render(<TestHarness html="<p>direct</p>" />);
      fireEvent.click(screen.getByTestId('set'));
    });
  });
});
