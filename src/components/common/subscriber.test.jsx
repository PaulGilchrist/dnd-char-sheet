import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

import Subscriber from './subscriber.jsx';

let mockEventSources;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockEventSources = [];
  global.EventSource = vi.fn(function () {
    const instance = { onmessage: null, close: vi.fn() };
    mockEventSources.push(instance);
    return instance;
  });
  global.EventSource.prototype.close = function () {};
});

function getLatestMockEventSource() {
  return mockEventSources[mockEventSources.length - 1];
}

describe('Subscriber', () => {
  describe('rendering', () => {
    it('renders an empty fragment (no visible DOM nodes)', () => {
      const { container } = render(
        <Subscriber
          handleEvent={vi.fn()}
          campaignName="test-campaign"
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('EventSource creation', () => {
    it('creates EventSource with campaign param when campaignName is provided', () => {
      const handleEvent = vi.fn();
      render(
        <Subscriber
          handleEvent={handleEvent}
          campaignName="test-campaign"
        />
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost/subscribe?campaign=test-campaign'
      );
    });

    it('creates EventSource without campaign param when campaignName is falsy', () => {
      const handleEvent = vi.fn();
      render(
        <Subscriber
          handleEvent={handleEvent}
          campaignName={null}
        />
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost/subscribe?'
      );
    });

    it('creates EventSource with empty string campaignName as no param', () => {
      const handleEvent = vi.fn();
      render(
        <Subscriber
          handleEvent={handleEvent}
          campaignName=""
        />
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost/subscribe?'
      );
    });
  });

  describe('event handling', () => {
    it('calls handleEvent with parsed SSE data', () => {
      const handleEvent = vi.fn();
      render(
        <Subscriber
          handleEvent={handleEvent}
          campaignName="test-campaign"
        />
      );

      const eventData = { type: 'test', data: 'value' };
      act(() => {
        getLatestMockEventSource().onmessage({
          data: JSON.stringify(eventData),
        });
      });

      expect(handleEvent).toHaveBeenCalledWith(eventData);
    });

    it('handles SSE events with complex nested data', () => {
      const handleEvent = vi.fn();
      render(
        <Subscriber
          handleEvent={handleEvent}
          campaignName="test-campaign"
        />
      );

      const complexData = {
        key: 'combat-start',
        data: {
          round: 1,
          initiative: [{ name: 'hero', value: 15 }],
        },
      };
      act(() => {
        getLatestMockEventSource().onmessage({
          data: JSON.stringify(complexData),
        });
      });

      expect(handleEvent).toHaveBeenCalledWith(complexData);
    });
  });

  describe('handleEvent ref staleness prevention', () => {
    it('calls the latest handleEvent when props change', async () => {
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();

      // Use render with initial handler
      const { rerender } = render(
        <Subscriber
          handleEvent={firstHandler}
          campaignName="test-campaign"
        />
      );

      // Flush effects so EventSource is created
      await act(async () => {});

      // Capture the EventSource instance
      const capturedEs = mockEventSources[mockEventSources.length - 1];

      // Rerender with a new handler
      // useEffect only depends on [campaignName], so the same
      // EventSource is kept; only the ref is updated in-place.
      rerender(
        <Subscriber
          handleEvent={secondHandler}
          campaignName="test-campaign"
        />
      );

      act(() => {
        capturedEs.onmessage({
          data: JSON.stringify({ type: 'test' }),
        });
      });

      expect(secondHandler).toHaveBeenCalledWith({ type: 'test' });
      expect(firstHandler).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('calls EventSource.close on unmount', () => {
      const { unmount } = render(
        <Subscriber
          handleEvent={vi.fn()}
          campaignName="test-campaign"
        />
      );

      const es = getLatestMockEventSource();
      expect(es.close).not.toHaveBeenCalled();
      unmount();
      expect(es.close).toHaveBeenCalled();
    });
  });
});
