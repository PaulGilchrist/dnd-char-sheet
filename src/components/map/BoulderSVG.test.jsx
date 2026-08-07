import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BoulderSVG from './BoulderSVG';

describe('BoulderSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<BoulderSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<BoulderSVG id="boulder-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'boulder-1');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<BoulderSVG className="custom-boulder" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-boulder');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<BoulderSVG data-test="boulder" role="img" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'boulder');
    expect(g).toHaveAttribute('role', 'img');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<BoulderSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the shadow ellipse', () => {
    const { container } = render(<BoulderSVG />);
    const shadow = container.querySelector('ellipse[cx="18"][cy="34"][rx="14"][ry="3"]');
    expect(shadow).toBeInTheDocument();
    expect(shadow).toHaveAttribute('fill', '#000');
    expect(shadow).toHaveAttribute('opacity', '0.12');
  });

  it('renders the main body path', () => {
    const { container } = render(<BoulderSVG />);
    const bodyPath = container.querySelector('path[d="M 8 32 Q 4 20 10 10 Q 12 4 18 6 Q 24 4 26 10 Q 32 20 28 32 Z"]');
    expect(bodyPath).toBeInTheDocument();
    expect(bodyPath).toHaveAttribute('fill', '#7A7A6A');
    expect(bodyPath).toHaveAttribute('stroke', '#5A5A4E');
    expect(bodyPath).toHaveAttribute('stroke-width', '0.8');
  });

  it('renders the highlight face path', () => {
    const { container } = render(<BoulderSVG />);
    const highlightPath = container.querySelector('path[d="M 10 28 Q 8 20 12 14 Q 14 8 18 8 Q 20 8 22 10 Q 18 14 16 18 Q 14 24 12 28 Z"]');
    expect(highlightPath).toBeInTheDocument();
    expect(highlightPath).toHaveAttribute('fill', '#8B8B7A');
    expect(highlightPath).toHaveAttribute('opacity', '0.6');
  });

  it('renders the shadow face path', () => {
    const { container } = render(<BoulderSVG />);
    const shadowPath = container.querySelector('path[d="M 26 28 Q 28 20 24 14 Q 22 10 20 10 Q 22 14 22 18 Q 22 24 24 28 Z"]');
    expect(shadowPath).toBeInTheDocument();
    expect(shadowPath).toHaveAttribute('fill', '#5A5A4E');
    expect(shadowPath).toHaveAttribute('opacity', '0.4');
  });

  it('renders the primary crack line path', () => {
    const { container } = render(<BoulderSVG />);
    const crackPath = container.querySelector('path[d="M 16 12 Q 14 16 16 20 Q 17 22 16 26"]');
    expect(crackPath).toBeInTheDocument();
    expect(crackPath).toHaveAttribute('fill', 'none');
    expect(crackPath).toHaveAttribute('stroke', '#5A5A4E');
    expect(crackPath).toHaveAttribute('stroke-width', '0.5');
    expect(crackPath).toHaveAttribute('opacity', '0.6');
  });

  it('renders the secondary crack line path', () => {
    const { container } = render(<BoulderSVG />);
    const crackPath = container.querySelector('path[d="M 20 14 Q 22 18 20 22"]');
    expect(crackPath).toBeInTheDocument();
    expect(crackPath).toHaveAttribute('fill', 'none');
    expect(crackPath).toHaveAttribute('stroke', '#5A5A4E');
    expect(crackPath).toHaveAttribute('stroke-width', '0.4');
    expect(crackPath).toHaveAttribute('opacity', '0.5');
  });

  it('renders the top highlight ellipse', () => {
    const { container } = render(<BoulderSVG />);
    const topHighlight = container.querySelector('ellipse[cx="16"][cy="12"][rx="4"][ry="2"]');
    expect(topHighlight).toBeInTheDocument();
    expect(topHighlight).toHaveAttribute('fill', '#9A9A8A');
    expect(topHighlight).toHaveAttribute('opacity', '0.3');
  });

  it('renders displayName as BoulderSVG', () => {
    expect(BoulderSVG.displayName).toBe('BoulderSVG');
  });

  it('renders total element counts as expected', () => {
    const { container } = render(<BoulderSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 1 shadow ellipse + 1 main body path + 1 highlight face path + 1 shadow face path
    // + 2 crack paths + 1 top highlight ellipse = 7 child elements
    expect(allElements.length).toBe(7);
  });

  it('renders 2 ellipses (shadow + top highlight)', () => {
    const { container } = render(<BoulderSVG />);
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(2);
  });

  it('renders 5 paths (body + highlight face + shadow face + 2 cracks)', () => {
    const { container } = render(<BoulderSVG />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(5);
  });
});
