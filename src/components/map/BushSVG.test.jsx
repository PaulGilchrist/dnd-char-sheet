import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BushSVG from './BushSVG';

describe('BushSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<BushSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<BushSVG id="bush-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'bush-1');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<BushSVG className="custom-bush" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-bush');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<BushSVG data-test="bush" role="img" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'bush');
    expect(g).toHaveAttribute('role', 'img');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<BushSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the shadow ellipse', () => {
    const { container } = render(<BushSVG />);
    const shadow = container.querySelector('ellipse[cx="18"][cy="33"][rx="11"][ry="2.5"]');
    expect(shadow).toBeInTheDocument();
    expect(shadow).toHaveAttribute('fill', '#000');
    expect(shadow).toHaveAttribute('opacity', '0.12');
  });

  it('renders the bottom layer circles', () => {
    const { container } = render(<BushSVG />);
    const bottomLayer = [
      container.querySelector('circle[cx="18"][cy="22"][r="12"]'),
      container.querySelector('circle[cx="10"][cy="24"][r="8"]'),
      container.querySelector('circle[cx="26"][cy="24"][r="8"]'),
    ];
    bottomLayer.forEach((circle) => {
      expect(circle).toBeInTheDocument();
    });
    expect(bottomLayer[0]).toHaveAttribute('fill', '#3D7A4A');
    expect(bottomLayer[0]).toHaveAttribute('stroke', '#2D5E37');
    expect(bottomLayer[0]).toHaveAttribute('stroke-width', '0.5');
    expect(bottomLayer[1]).toHaveAttribute('fill', '#3D7A4A');
    expect(bottomLayer[2]).toHaveAttribute('fill', '#3D7A4A');
  });

  it('renders the middle layer circles', () => {
    const { container } = render(<BushSVG />);
    const middleLayer = [
      container.querySelector('circle[cx="18"][cy="20"][r="10"]'),
      container.querySelector('circle[cx="12"][cy="22"][r="7"]'),
      container.querySelector('circle[cx="24"][cy="22"][r="7"]'),
    ];
    middleLayer.forEach((circle) => {
      expect(circle).toBeInTheDocument();
    });
    middleLayer.forEach((circle) => {
      expect(circle).toHaveAttribute('fill', '#4A9A5A');
    });
  });

  it('renders the top layer circles', () => {
    const { container } = render(<BushSVG />);
    const topLayer = [
      container.querySelector('circle[cx="18"][cy="18"][r="7"]'),
      container.querySelector('circle[cx="14"][cy="19"][r="5"]'),
      container.querySelector('circle[cx="22"][cy="19"][r="5"]'),
    ];
    topLayer.forEach((circle) => {
      expect(circle).toBeInTheDocument();
    });
    topLayer.forEach((circle) => {
      expect(circle).toHaveAttribute('fill', '#5AAB6A');
    });
  });

  it('renders the top highlight circles', () => {
    const { container } = render(<BushSVG />);
    const highlight1 = container.querySelector('circle[cx="16"][cy="16"][r="3"]');
    const highlight2 = container.querySelector('circle[cx="20"][cy="17"][r="2"]');
    expect(highlight1).toBeInTheDocument();
    expect(highlight2).toBeInTheDocument();
    expect(highlight1).toHaveAttribute('fill', '#6ABC7A');
    expect(highlight1).toHaveAttribute('opacity', '0.5');
    expect(highlight2).toHaveAttribute('fill', '#6ABC7A');
    expect(highlight2).toHaveAttribute('opacity', '0.4');
  });

  it('renders the branch detail paths', () => {
    const { container } = render(<BushSVG />);
    const leftBranch = container.querySelector('path[d="M 10 20 Q 8 16 9 14"]');
    const rightBranch = container.querySelector('path[d="M 26 20 Q 28 16 27 14"]');
    expect(leftBranch).toBeInTheDocument();
    expect(rightBranch).toBeInTheDocument();
    expect(leftBranch).toHaveAttribute('fill', 'none');
    expect(leftBranch).toHaveAttribute('stroke', '#4A9A5A');
    expect(leftBranch).toHaveAttribute('stroke-width', '0.8');
    expect(rightBranch).toHaveAttribute('fill', 'none');
    expect(rightBranch).toHaveAttribute('stroke', '#4A9A5A');
    expect(rightBranch).toHaveAttribute('stroke-width', '0.8');
  });

  it('renders displayName as BushSVG', () => {
    expect(BushSVG.displayName).toBe('BushSVG');
  });

  it('renders total element counts as expected', () => {
    const { container } = render(<BushSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 1 shadow ellipse + 9 body circles (3 bottom + 3 middle + 3 top)
    // + 2 highlight circles + 2 branch paths = 14 child elements
    expect(allElements.length).toBe(14);
  });

  it('renders 1 ellipse (shadow)', () => {
    const { container } = render(<BushSVG />);
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(1);
  });

  it('renders 11 circles (9 body + 2 highlight)', () => {
    const { container } = render(<BushSVG />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(11);
  });

  it('renders 2 paths (branch details)', () => {
    const { container } = render(<BushSVG />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });
});
