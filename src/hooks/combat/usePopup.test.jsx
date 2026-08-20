// @improved-by-ai
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import usePopup from './usePopup.js';

describe('usePopup', () => {
  describe('initialization', () => {
    it('should return showPopup, popupHtml, and setPopupHtml', () => {
      const { result } = renderHook(() => usePopup(() => ''));
      expect(result.current).toHaveProperty('showPopup');
      expect(result.current).toHaveProperty('popupHtml');
      expect(result.current).toHaveProperty('setPopupHtml');
    });

    it('should initialize popupHtml to null regardless of buildHtml return value', () => {
      const { result: r1 } = renderHook(() => usePopup(() => ''));
      const { result: r2 } = renderHook(() => usePopup(() => '<p>x</p>'));
      expect(r1.current.popupHtml).toBeNull();
      expect(r2.current.popupHtml).toBeNull();
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

    it('should not set popupHtml when buildHtml returns a falsy value', () => {
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
    function TestHarness() {
      const { showPopup, popupHtml, setPopupHtml } = usePopup((entity) => `<p>${entity.name}</p>`);
      return (
        <div>
          <button data-testid="show" onClick={() => showPopup({ name: 'Test' })}>Show</button>
          <button data-testid="set" onClick={() => setPopupHtml('<p>direct</p>')} data-testid="set">Set</button>
          <button data-testid="clear" onClick={() => setPopupHtml(null)}>Clear</button>
          <div data-testid="output" dangerouslySetInnerHTML={{ __html: popupHtml || '' }} />
        </div>
      );
    }

    it('should render the popup content when showPopup is triggered', () => {
      render(<TestHarness />);
      act(() => {
        fireEvent.click(screen.getByTestId('show'));
      });
      expect(screen.getByTestId('output').innerHTML).toBe('<p>Test</p>');
    });

    it('should render the popup content when setPopupHtml is called directly', () => {
      render(<TestHarness />);
      act(() => {
        fireEvent.click(screen.getByTestId('set'));
      });
      expect(screen.getByTestId('output').innerHTML).toBe('<p>direct</p>');
    });

    it('should update popup content when switching between showPopup and setPopupHtml', () => {
      render(<TestHarness />);
      act(() => {
        fireEvent.click(screen.getByTestId('show'));
      });
      expect(screen.getByTestId('output').innerHTML).toBe('<p>Test</p>');

      act(() => {
        fireEvent.click(screen.getByTestId('set'));
      });
      expect(screen.getByTestId('output').innerHTML).toBe('<p>direct</p>');

      act(() => {
        fireEvent.click(screen.getByTestId('clear'));
      });
      expect(screen.getByTestId('output').innerHTML).toBe('');
    });
  });
});
