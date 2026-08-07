import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DoorSVG from './DoorSVG';

describe('DoorSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<DoorSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<DoorSVG id="door-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'door-1');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<DoorSVG className="custom-door" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-door');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<DoorSVG data-test="door" role="img" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'door');
    expect(g).toHaveAttribute('role', 'img');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<DoorSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the main board body rect', () => {
    const { container } = render(<DoorSVG />);
    const body = container.querySelector('rect[x="15"][y="0"][width="6"][height="36"]');
    expect(body).toBeInTheDocument();
    expect(body).toHaveAttribute('fill', '#8B5A2B');
  });

  it('renders wood grain line 1', () => {
    const { container } = render(<DoorSVG />);
    const line1 = container.querySelector('line[x1="16.5"][y1="0"][x2="16.5"][y2="36"]');
    expect(line1).toBeInTheDocument();
    expect(line1).toHaveAttribute('stroke', '#6B3E1F');
    expect(line1).toHaveAttribute('stroke-width', '0.3');
    expect(line1).toHaveAttribute('opacity', '0.5');
  });

  it('renders wood grain line 2', () => {
    const { container } = render(<DoorSVG />);
    const line2 = container.querySelector('line[x1="19.5"][y1="0"][x2="19.5"][y2="36"]');
    expect(line2).toBeInTheDocument();
    expect(line2).toHaveAttribute('stroke', '#6B3E1F');
    expect(line2).toHaveAttribute('stroke-width', '0.3');
    expect(line2).toHaveAttribute('opacity', '0.5');
  });

  it('renders highlight edge rect', () => {
    const { container } = render(<DoorSVG />);
    const highlight = container.querySelector('rect[x="15"][y="0"][width="0.5"][height="36"]');
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveAttribute('fill', '#A0652D');
    expect(highlight).toHaveAttribute('opacity', '0.6');
  });

  it('renders displayName as DoorSVG', () => {
    expect(DoorSVG.displayName).toBe('DoorSVG');
  });

  it('renders correct total element count', () => {
    const { container } = render(<DoorSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 2 rects + 2 lines = 4 child elements
    expect(allElements.length).toBe(4);
  });

  it('renders 2 rect elements', () => {
    const { container } = render(<DoorSVG />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);
  });

  it('renders 2 line elements', () => {
    const { container } = render(<DoorSVG />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });
});
