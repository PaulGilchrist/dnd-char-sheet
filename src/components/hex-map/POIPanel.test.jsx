import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import POIPanel from './POIPanel.jsx';
import { POI_TYPES } from '../../config/outdoorConfig.js';

function renderPanel(onClose = vi.fn()) {
    return render(<POIPanel onClose={onClose} />);
}

describe('POIPanel', () => {
    let onClose;

    beforeEach(() => {
        onClose = vi.fn();
    });

    describe('close button', () => {
        it('calls onClose when clicked', () => {
            renderPanel(onClose);
            fireEvent.click(screen.getByRole('button'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('renders with fa-times icon', () => {
            renderPanel();
            const icon = document.querySelector('.poi-panel-close .fa-solid.fa-times');
            expect(icon).toBeInTheDocument();
        });

        it('has poi-panel-close class', () => {
            renderPanel();
            const closeBtn = document.querySelector('.poi-panel-close');
            expect(closeBtn).toBeInTheDocument();
        });
    });

    describe('POI items', () => {
        it('renders exactly 9 POI items', () => {
            const { container } = renderPanel();
            const items = container.querySelectorAll('.poi-panel-item');
            expect(items).toHaveLength(9);
        });

        it('renders all POI type names as text', () => {
            renderPanel();
            for (const poiType of POI_TYPES) {
                expect(screen.getByText(poiType.name)).toBeInTheDocument();
            }
        });

        it('each POI item has poi-panel-item class', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            items.forEach(item => {
                expect(item).toHaveClass('poi-panel-item');
            });
        });

        it('each POI item is draggable', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            items.forEach(item => {
                expect(item).toHaveAttribute('draggable', 'true');
            });
        });

        it('renders SVG with correct viewBox and dimensions for each POI', () => {
            const { container } = renderPanel();
            const svgs = container.querySelectorAll('.poi-panel-item svg');
            expect(svgs).toHaveLength(9);
            svgs.forEach(svg => {
                expect(svg).toHaveAttribute('viewBox', '0 0 36 36');
                expect(svg).toHaveAttribute('width', '36');
                expect(svg).toHaveAttribute('height', '36');
            });
        });

        it('renders SVG component content inside each POI item', () => {
            const { container } = renderPanel();
            const items = container.querySelectorAll('.poi-panel-item');
            items.forEach(item => {
                const svg = item.querySelector('svg');
                expect(svg).toBeInTheDocument();
                const gElement = svg.querySelector('g');
                expect(gElement).toBeInTheDocument();
            });
        });

        it('renders POI items in the correct order matching POI_TYPES', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item span');
            const names = [...items].map(span => span.textContent);
            const expectedNames = POI_TYPES.map(poi => poi.name);
            expect(names).toEqual(expectedNames);
        });
    });

    describe('drag behavior', () => {
        function createDataTransfer() {
            const data = {};
            return {
                data,
                setData: vi.fn((format, value) => {
                    data[format] = value;
                }),
                setDragImage: vi.fn(),
            };
        }

        it('sets drag data and creates a ghost image on drag start', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const dataTransfer = createDataTransfer();
            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });
            expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'camp');
            expect(dataTransfer.setDragImage).toHaveBeenCalled();
        });

        it('sets correct drag data for each POI type', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            items.forEach((item, index) => {
                const expectedId = POI_TYPES[index].id;
                const dataTransfer = createDataTransfer();
                fireEvent.dragStart(item, { dataTransfer, currentTarget: item });
                expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', expectedId);
            });
        });

        it('creates a drag ghost element appended to body', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const dataTransfer = createDataTransfer();

            const beforeCount = document.body.querySelectorAll('div[style*="position: absolute"]').length;

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            const afterCount = document.body.querySelectorAll('div[style*="position: absolute"]');
            expect(afterCount.length).toBe(beforeCount + 1);
        });

        it('removes the ghost element after timeout', async () => {
            vi.useFakeTimers();
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const dataTransfer = createDataTransfer();

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            const ghostSelectors = document.body.querySelectorAll('div[style*="position: absolute"]');
            expect(ghostSelectors.length).toBeGreaterThan(0);

            vi.advanceTimersByTime(1);
            vi.useRealTimers();

            await new Promise(resolve => setTimeout(resolve, 10));
            vi.useFakeTimers();

            const remaining = document.body.querySelectorAll('div[style*="position: absolute"]');
            expect(remaining.length).toBe(0);

            vi.useRealTimers();
        });

        it('scales the ghost image based on SVG dimensions', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const dataTransfer = createDataTransfer();

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            expect(dataTransfer.setDragImage).toHaveBeenCalled();
            const callArgs = dataTransfer.setDragImage.mock.calls[0];
            expect(callArgs.length).toBe(3);
            expect(callArgs[1]).toBeGreaterThan(0);
            expect(callArgs[2]).toBeGreaterThan(0);
        });
    });

    describe('panel container', () => {
        it('renders with poi-panel class', () => {
            renderPanel();
            const panel = document.querySelector('.poi-panel');
            expect(panel).toBeInTheDocument();
        });

        it('renders poi-panel-content container', () => {
            renderPanel();
            const content = document.querySelector('.poi-panel-content');
            expect(content).toBeInTheDocument();
        });
    });

    describe('drag ghost fallback behavior', () => {
        function createDataTransfer() {
            const data = {};
            return {
                data,
                setData: vi.fn((format, value) => {
                    data[format] = value;
                }),
                setDragImage: vi.fn(),
            };
        }

        it('uses fallback dimensions of 36 when SVG width attribute is missing', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const svg = firstItem.querySelector('svg');
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            const dataTransfer = createDataTransfer();

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            expect(dataTransfer.setDragImage).toHaveBeenCalled();
            const callArgs = dataTransfer.setDragImage.mock.calls[0];
            expect(callArgs[1]).toBe(18);
            expect(callArgs[2]).toBe(18);
        });

        it('uses fallback dimensions when SVG width attribute parses to 0', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const svg = firstItem.querySelector('svg');
            svg.setAttribute('width', '0');
            svg.setAttribute('height', '0');
            const dataTransfer = createDataTransfer();

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            expect(dataTransfer.setDragImage).toHaveBeenCalled();
            const callArgs = dataTransfer.setDragImage.mock.calls[0];
            expect(callArgs[1]).toBe(18);
            expect(callArgs[2]).toBe(18);
        });

        it('returns early without creating ghost when SVG element is not found', () => {
            renderPanel();
            const items = document.querySelectorAll('.poi-panel-item');
            const firstItem = items[0];
            const svg = firstItem.querySelector('svg');
            svg.remove();
            const dataTransfer = createDataTransfer();

            fireEvent.dragStart(firstItem, { dataTransfer, currentTarget: firstItem });

            expect(dataTransfer.setDragImage).not.toHaveBeenCalled();
        });
    });
});
