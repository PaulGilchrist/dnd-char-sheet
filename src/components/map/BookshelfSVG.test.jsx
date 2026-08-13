import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BookshelfSVG from './BookshelfSVG';

describe('BookshelfSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<BookshelfSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<BookshelfSVG id="bookshelf-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'bookshelf-1');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<BookshelfSVG className="custom-bookshelf" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-bookshelf');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<BookshelfSVG data-test="bookshelf-test" aria-label="Bookshelf" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'bookshelf-test');
    expect(g).toHaveAttribute('aria-label', 'Bookshelf');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<BookshelfSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the outer frame rect', () => {
    const { container } = render(<BookshelfSVG />);
    const frame = container.querySelector('rect[x="2"][y="2"][width="68"][height="16"]');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('fill', '#6B3E1F');
    expect(frame).toHaveAttribute('stroke', '#4A2810');
    expect(frame).toHaveAttribute('stroke-width', '0.8');
  });

  it('renders the back panel inner shadow rect', () => {
    const { container } = render(<BookshelfSVG />);
    const backPanel = container.querySelector('rect[x="4"][y="4"][width="64"][height="12"]');
    expect(backPanel).toBeInTheDocument();
    expect(backPanel).toHaveAttribute('fill', '#4A2810');
    expect(backPanel).toHaveAttribute('opacity', '0.6');
  });

  it('renders 3 shelf rects at y=8, y=12, and y=16', () => {
    const { container } = render(<BookshelfSVG />);
    const shelves = container.querySelectorAll('rect[x="4"][y="8"], rect[x="4"][y="12"], rect[x="4"][y="16"]');
    expect(shelves).toHaveLength(3);
    shelves.forEach((shelf) => {
      expect(shelf).toHaveAttribute('fill', '#8B5E3C');
      expect(shelf).toHaveAttribute('width', '64');
    });
  });

  it('renders 12 upright books in row 1 with rounded corners', () => {
    const { container } = render(<BookshelfSVG />);
    // Row 1 books have rx="0.3" and sit between y=4 and y=8
    const row1Books = container.querySelectorAll('rect[rx="0.3"]');
    expect(row1Books.length).toBeGreaterThanOrEqual(12);
  });

  it('renders books in all 5 colors across both rows', () => {
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

  it('renders a leaning book in row 1 with green fill and rotation', () => {
    const { container } = render(<BookshelfSVG />);
    const leaningBook = container.querySelector('rect[rx="0.2"][transform="rotate(6, 34, 6)"]');
    expect(leaningBook).toBeInTheDocument();
    expect(leaningBook).toHaveAttribute('fill', '#27AE60');
  });

  it('renders 2 leaning books in row 2 with different angles', () => {
    const { container } = render(<BookshelfSVG />);
    const leaningBooks = container.querySelectorAll('rect[rx="0.2"]');
    expect(leaningBooks).toHaveLength(3); // 1 row 1 + 2 row 2
    const row2Leans = container.querySelectorAll('rect[transform="rotate(8, 21, 10.5)"], rect[transform="rotate(-6, 56, 10.5)"]');
    expect(row2Leans).toHaveLength(2);
  });

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

  it('renders floor shadow rect', () => {
    const { container } = render(<BookshelfSVG />);
    const floorShadow = container.querySelector('rect[x="2"][y="19"][width="68"][height="14"]');
    expect(floorShadow).toBeInTheDocument();
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

  it('renders displayName as BookshelfSVG', () => {
    expect(BookshelfSVG.displayName).toBe('BookshelfSVG');
  });

  it('renders 37 child elements inside the root group', () => {
    const { container } = render(<BookshelfSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    expect(allElements.length).toBe(37);
  });

  it('renders 36 rect elements and 1 line element', () => {
    const { container } = render(<BookshelfSVG />);
    const rects = container.querySelectorAll('rect');
    const lines = container.querySelectorAll('line');
    expect(rects.length).toBe(36);
    expect(lines.length).toBe(1);
  });
});
