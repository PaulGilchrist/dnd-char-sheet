import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BarrelSVG from './BarrelSVG';

describe('BarrelSVG', () => {
  it('renders a <g> element', () => {
    const { container } = render(<BarrelSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies the id attribute to the group', () => {
    const { container } = render(<BarrelSVG id="barrel-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'barrel-1');
  });

  it('applies the className to the group', () => {
    const { container } = render(<BarrelSVG className="custom-barrel" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-barrel');
  });

  it('forwards custom props as attributes', () => {
    const { container } = render(<BarrelSVG data-test="barrel-test" aria-label="Barrel" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'barrel-test');
    expect(g).toHaveAttribute('aria-label', 'Barrel');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<BarrelSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the barrel body path', () => {
    const { container } = render(<BarrelSVG />);
    const bodyPath = container.querySelector('path[d="M 10 4 Q 6 18 10 32 L 26 32 Q 30 18 26 4 Z"]');
    expect(bodyPath).toBeInTheDocument();
    expect(bodyPath).toHaveAttribute('fill', '#A0652D');
    expect(bodyPath).toHaveAttribute('stroke', '#6B3E1F');
    expect(bodyPath).toHaveAttribute('stroke-width', '0.8');
  });

  it('renders the left side shading path', () => {
    const { container } = render(<BarrelSVG />);
    const shadingPath = container.querySelector('path[d="M 10 4 Q 6 18 10 32 L 16 32 Q 12 18 16 4 Z"]');
    expect(shadingPath).toBeInTheDocument();
    expect(shadingPath).toHaveAttribute('fill', '#8B5524');
    expect(shadingPath).toHaveAttribute('opacity', '0.5');
  });

  it('renders the top rim ellipse', () => {
    const { container } = render(<BarrelSVG />);
    const topRim = container.querySelector('ellipse[cx="18"][cy="4"][rx="8"][ry="2.5"]');
    expect(topRim).toBeInTheDocument();
    expect(topRim).toHaveAttribute('fill', '#8B5524');
    expect(topRim).toHaveAttribute('stroke', '#6B3E1F');
    expect(topRim).toHaveAttribute('stroke-width', '0.6');
  });

  it('renders the bottom rim ellipse', () => {
    const { container } = render(<BarrelSVG />);
    const bottomRim = container.querySelector('ellipse[cx="18"][cy="32"][rx="8"][ry="2.5"]');
    expect(bottomRim).toBeInTheDocument();
    expect(bottomRim).toHaveAttribute('fill', '#8B5524');
    expect(bottomRim).toHaveAttribute('stroke', '#6B3E1F');
    expect(bottomRim).toHaveAttribute('stroke-width', '0.6');
  });

  it('renders the top opening ellipse', () => {
    const { container } = render(<BarrelSVG />);
    const opening = container.querySelector('ellipse[cx="18"][cy="4"][rx="6"][ry="1.8"]');
    expect(opening).toBeInTheDocument();
    expect(opening).toHaveAttribute('fill', '#5C3317');
    expect(opening).toHaveAttribute('stroke', '#4A2810');
    expect(opening).toHaveAttribute('stroke-width', '0.5');
  });

  it('renders metal band rects (top, middle, bottom)', () => {
    const { container } = render(<BarrelSVG />);
    const metalBands = container.querySelectorAll('rect[fill="#555"]');
    expect(metalBands.length).toBe(3);
    expect(metalBands[0]).toHaveAttribute('x', '9.5');
    expect(metalBands[0]).toHaveAttribute('y', '10');
    expect(metalBands[1]).toHaveAttribute('x', '9');
    expect(metalBands[1]).toHaveAttribute('y', '18');
    expect(metalBands[2]).toHaveAttribute('x', '9.5');
    expect(metalBands[2]).toHaveAttribute('y', '26');
  });

  it('renders metal band highlight rects', () => {
    const { container } = render(<BarrelSVG />);
    const highlights = container.querySelectorAll('rect[fill="#777"]');
    expect(highlights.length).toBe(3);
  });

  it('renders the right side highlight path', () => {
    const { container } = render(<BarrelSVG />);
    const highlightPath = container.querySelector('path[d="M 26 4 Q 30 18 26 32 L 22 32 Q 26 18 22 4 Z"]');
    expect(highlightPath).toBeInTheDocument();
    expect(highlightPath).toHaveAttribute('fill', '#B87A3A');
    expect(highlightPath).toHaveAttribute('opacity', '0.4');
  });

  it('renders wood grain lines (3 paths)', () => {
    const { container } = render(<BarrelSVG />);
    const grainPaths = container.querySelectorAll('path[stroke="#7A4E20"]');
    expect(grainPaths.length).toBe(3);
    grainPaths.forEach((path) => {
      expect(path).toHaveAttribute('stroke-width', '0.4');
      expect(path).toHaveAttribute('opacity', '0.6');
    });
  });

  it('renders displayName as BarrelSVG', () => {
    expect(BarrelSVG.displayName).toBe('BarrelSVG');
  });

  it('renders total element counts as expected', () => {
    const { container } = render(<BarrelSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 3 body/shading/highlight paths + 3 ellipses + 6 rects + 3 grain paths = 15 child elements
    expect(allElements.length).toBe(15);
  });
});
