// @improved-by-ai
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BookshelfSVG from './BookshelfSVG';

describe('BookshelfSVG', () => {
  describe('root group element', () => {
    it('renders a <g> element', () => {
      const { container } = render(<BookshelfSVG />);
      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('applies the id attribute to the group', () => {
      const { container } = render(<BookshelfSVG id="bookshelf-1" />);
      expect(container.querySelector('g')).toHaveAttribute('id', 'bookshelf-1');
    });

    it('does not render id attribute when id is null', () => {
      const { container } = render(<BookshelfSVG id={null} />);
      expect(container.querySelector('g')).not.toHaveAttribute('id');
    });

    it('applies className to the group', () => {
      const { container } = render(<BookshelfSVG className="custom-bookshelf" />);
      expect(container.querySelector('g')).toHaveClass('custom-bookshelf');
    });

    it('does not render className attribute when className is undefined', () => {
      const { container } = render(<BookshelfSVG />);
      expect(container.querySelector('g')).not.toHaveAttribute('class');
    });

    it('spreads additional props as attributes on the group', () => {
      const { container } = render(
        <BookshelfSVG data-test="bookshelf-test" aria-label="Bookshelf" role="img" />,
      );
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('data-test', 'bookshelf-test');
      expect(g).toHaveAttribute('aria-label', 'Bookshelf');
      expect(g).toHaveAttribute('role', 'img');
    });

    it('accepts a ref via forwardRef', () => {
      const ref = React.createRef();
      render(<BookshelfSVG ref={ref} />);
      expect(ref.current).toBeTruthy();
      expect(ref.current.tagName.toLowerCase()).toBe('g');
    });

    it('combines id, className, rest props, and ref on the group', () => {
      const ref = { current: null };
      const { container } = render(
        <BookshelfSVG id="test-id" className="test-class" data-custom="value" ref={ref} />,
      );
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('id', 'test-id');
      expect(g).toHaveAttribute('class', 'test-class');
      expect(g).toHaveAttribute('data-custom', 'value');
      expect(ref.current).toBe(g);
    });
  });

  describe('outer frame', () => {
    it('renders the frame rect with correct attributes', () => {
      const { container } = render(<BookshelfSVG />);
      const frame = container.querySelector('rect[x="2"][y="2"][width="68"][height="16"]');
      expect(frame).toBeInTheDocument();
      expect(frame).toHaveAttribute('rx', '1');
      expect(frame).toHaveAttribute('fill', '#6B3E1F');
      expect(frame).toHaveAttribute('stroke', '#4A2810');
      expect(frame).toHaveAttribute('stroke-width', '0.8');
    });
  });

  describe('back panel', () => {
    it('renders the inner shadow rect behind books', () => {
      const { container } = render(<BookshelfSVG />);
      const backPanel = container.querySelector('rect[x="4"][y="4"][width="64"][height="12"]');
      expect(backPanel).toBeInTheDocument();
      expect(backPanel).toHaveAttribute('fill', '#4A2810');
      expect(backPanel).toHaveAttribute('opacity', '0.6');
    });
  });

  describe('shelves', () => {
    it('renders 3 shelf rects at correct positions with correct attributes', () => {
      const { container } = render(<BookshelfSVG />);
      const shelves = container.querySelectorAll('rect[x="4"][height="1.2"][width="64"]');
      expect(shelves).toHaveLength(3);
      shelves.forEach((shelf) => {
        expect(shelf).toHaveAttribute('fill', '#8B5E3C');
      });
    });
  });

  describe('row 1 books', () => {
    it('renders 12 upright books in row 1 with rounded corners', () => {
      const { container } = render(<BookshelfSVG />);
      const row1Books = container.querySelectorAll('rect[rx="0.3"][y="4"], rect[rx="0.3"][y="4.5"], rect[rx="0.3"][y="5"]');
      expect(row1Books).toHaveLength(12);
    });

    it('renders 1 leaning book with correct attributes', () => {
      const { container } = render(<BookshelfSVG />);
      const leaningBook = container.querySelector('rect[rx="0.2"][transform="rotate(6, 34, 6)"]');
      expect(leaningBook).toBeInTheDocument();
      expect(leaningBook).toHaveAttribute('fill', '#27AE60');
    });
  });

  describe('row 2 books', () => {
    it('renders 12 upright books', () => {
      const { container } = render(<BookshelfSVG />);
      const row2Upright = container.querySelectorAll('rect[rx="0.3"][y="9.5"], rect[rx="0.3"][y="10"]');
      expect(row2Upright).toHaveLength(12);
    });

    it('renders 2 leaning books with different angles', () => {
      const { container } = render(<BookshelfSVG />);
      const row2Leans = container.querySelectorAll('rect[transform="rotate(8, 21, 10.5)"], rect[transform="rotate(-6, 56, 10.5)"]');
      expect(row2Leans).toHaveLength(2);
    });
  });

  describe('book colors', () => {
    it('renders books in all 5 colors', () => {
      const { container } = render(<BookshelfSVG />);
      const redBooks = container.querySelectorAll('rect[fill="#C0392B"]');
      const blueBooks = container.querySelectorAll('rect[fill="#2980B9"]');
      const greenBooks = container.querySelectorAll('rect[fill="#27AE60"]');
      const purpleBooks = container.querySelectorAll('rect[fill="#8E44AD"]');
      const orangeBooks = container.querySelectorAll('rect[fill="#E67E22"]');
      expect(redBooks.length).toBeGreaterThan(0);
      expect(blueBooks.length).toBeGreaterThan(0);
      expect(greenBooks.length).toBeGreaterThan(0);
      expect(purpleBooks.length).toBeGreaterThan(0);
      expect(orangeBooks.length).toBeGreaterThan(0);
    });
  });

  describe('frame highlights', () => {
    it('renders left and right frame edge highlights', () => {
      const { container } = render(<BookshelfSVG />);
      const leftHighlight = container.querySelector('rect[x="2"][y="2"][width="2.5"][height="16"]');
      expect(leftHighlight).toBeInTheDocument();
      expect(leftHighlight).toHaveAttribute('fill', '#7A4E20');
      expect(leftHighlight).toHaveAttribute('opacity', '0.3');

      const rightHighlight = container.querySelector('rect[x="67.5"][y="2"][width="2.5"][height="16"]');
      expect(rightHighlight).toBeInTheDocument();
      expect(rightHighlight).toHaveAttribute('fill', '#7A4E20');
      expect(rightHighlight).toHaveAttribute('opacity', '0.3');
    });

    it('renders top frame highlight', () => {
      const { container } = render(<BookshelfSVG />);
      const topHighlight = container.querySelector('rect[x="2"][y="2"][width="68"][height="1"]');
      expect(topHighlight).toBeInTheDocument();
      expect(topHighlight).toHaveAttribute('fill', '#8B5E3C');
      expect(topHighlight).toHaveAttribute('opacity', '0.5');
    });
  });

  describe('shadows', () => {
    it('renders floor shadow with correct attributes', () => {
      const { container } = render(<BookshelfSVG />);
      const floorShadow = container.querySelector('rect[x="2"][y="19"][width="68"][height="14"]');
      expect(floorShadow).toBeInTheDocument();
      expect(floorShadow).toHaveAttribute('rx', '0.5');
      expect(floorShadow).toHaveAttribute('fill', '#333');
      expect(floorShadow).toHaveAttribute('opacity', '0.08');
    });

    it('renders wall shadow line at y=18', () => {
      const { container } = render(<BookshelfSVG />);
      const wallShadow = container.querySelector('line[x1="2"][y1="18"][x2="70"][y2="18"]');
      expect(wallShadow).toBeInTheDocument();
      expect(wallShadow).toHaveAttribute('stroke', '#333');
      expect(wallShadow).toHaveAttribute('stroke-width', '0.5');
      expect(wallShadow).toHaveAttribute('opacity', '0.06');
    });
  });

  describe('element structure', () => {
    it('renders the expected number of child elements', () => {
      const { container } = render(<BookshelfSVG />);
      const g = container.querySelector('g');
      expect(g.children.length).toBe(37);
    });

    it('renders the expected SVG element types', () => {
      const { container } = render(<BookshelfSVG />);
      const g = container.querySelector('g');
      const rects = g.querySelectorAll('rect');
      const lines = g.querySelectorAll('line');
      expect(rects.length).toBe(36);
      expect(lines.length).toBe(1);
    });
  });

  describe('displayName', () => {
    it('sets displayName to BookshelfSVG', () => {
      expect(BookshelfSVG.displayName).toBe('BookshelfSVG');
    });
  });
});
