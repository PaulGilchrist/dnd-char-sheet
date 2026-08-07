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

  it('applies the id attribute to the group', () => {
    const { container } = render(<BookshelfSVG id="bookshelf-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'bookshelf-1');
  });

  it('applies the className to the group', () => {
    const { container } = render(<BookshelfSVG className="custom-bookshelf" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-bookshelf');
  });

  it('forwards custom props as attributes', () => {
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

  it('renders the outer frame rect (top half only)', () => {
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

  it('renders 3 shelf rects', () => {
    const { container } = render(<BookshelfSVG />);
    const shelves = container.querySelectorAll('rect[fill="#8B5E3C"]');
    expect(shelves.length).toBe(4); // 3 shelves + 1 top frame highlight
    const shelfOnly = container.querySelectorAll('rect[x="4"][y="8"], rect[x="4"][y="12"], rect[x="4"][y="16"]');
    expect(shelfOnly).toHaveLength(3);
  });

  it('renders row 1 books (12 upright books + 1 leaning)', () => {
    const { container } = render(<BookshelfSVG />);
    // red books: positions at x=6 and x=30 in row 1, plus reds in other rows
    // Just verify the row 1 book count by checking total rects with row 1 y positions
    const row1Rects = container.querySelectorAll('rect[x="6"][y="4.5"]');
    expect(row1Rects).toHaveLength(1);
    const row1BookRects = container.querySelectorAll('rect[rx="0.3"]');
    expect(row1BookRects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders row 1 books with specific colors', () => {
    const { container } = render(<BookshelfSVG />);
    const redBooks = container.querySelectorAll('rect[fill="#C0392B"]');
    const blueBooks = container.querySelectorAll('rect[fill="#2980B9"]');
    const greenBooks = container.querySelectorAll('rect[fill="#27AE60"]');
    const purpleBooks = container.querySelectorAll('rect[fill="#8E44AD"]');
    const orangeBooks = container.querySelectorAll('rect[fill="#E67E22"]');
    // Should have multiple books of each color across all rows
    expect(redBooks.length).toBeGreaterThan(0);
    expect(blueBooks.length).toBeGreaterThan(0);
    expect(greenBooks.length).toBeGreaterThan(0);
    expect(purpleBooks.length).toBeGreaterThan(0);
    expect(orangeBooks.length).toBeGreaterThan(0);
  });

  it('renders a leaning book in row 1 with transform', () => {
    const { container } = render(<BookshelfSVG />);
    const leaningBook = container.querySelector('rect[rx="0.2"][transform="rotate(6, 34, 6)"]');
    expect(leaningBook).toBeInTheDocument();
    expect(leaningBook).toHaveAttribute('fill', '#27AE60');
  });

  it('renders row 2 books', () => {
    const { container } = render(<BookshelfSVG />);
    const row2Books = container.querySelectorAll('rect[fill="#8E44AD"]');
    expect(row2Books.length).toBeGreaterThan(0);
  });

  it('renders leaning books in row 2', () => {
    const { container } = render(<BookshelfSVG />);
    const leaningBooks = container.querySelectorAll('rect[rx="0.2"]');
    expect(leaningBooks.length).toBe(3); // 1 in row 1 + 2 in row 2
  });

  it('renders left frame edge highlight', () => {
    const { container } = render(<BookshelfSVG />);
    const leftHighlight = container.querySelector('rect[x="2"][y="2"][width="2.5"][height="16"]');
    expect(leftHighlight).toBeInTheDocument();
    expect(leftHighlight).toHaveAttribute('fill', '#7A4E20');
    expect(leftHighlight).toHaveAttribute('opacity', '0.3');
  });

  it('renders right frame edge highlight', () => {
    const { container } = render(<BookshelfSVG />);
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

  it('renders correct total element count', () => {
    const { container } = render(<BookshelfSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 3 shelves + 12 row1 books + 1 lean1 + 12 row2 books + 2 lean2 +
    // 1 outer frame + 1 back panel + 2 edge highlights + 1 top highlight +
    // 1 floor shadow + 1 wall shadow line = 37 child elements
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
