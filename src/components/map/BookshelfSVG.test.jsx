// @improved-by-ai
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BookshelfSVG from './BookshelfSVG';

describe('BookshelfSVG', () => {
  describe('root group element', () => {
    it('renders a <g> element with id, className, rest props, and ref', () => {
      const ref = React.createRef();
      const { container } = render(
        <BookshelfSVG id="bookshelf-1" className="custom-bookshelf" data-test="bookshelf-test" ref={ref} />
      );
      const g = container.querySelector('g');
      expect(g).toBeInTheDocument();
      expect(g).toHaveAttribute('id', 'bookshelf-1');
      expect(g).toHaveClass('custom-bookshelf');
      expect(g).toHaveAttribute('data-test', 'bookshelf-test');
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
});

// @cleaned-by-ai
