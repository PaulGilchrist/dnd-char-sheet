import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChestSVG from './ChestSVG';

describe('ChestSVG', () => {
  it('renders a <g> element', () => {
    const { container } = render(<ChestSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies the id attribute to the group', () => {
    const { container } = render(<ChestSVG id="chest-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'chest-1');
  });

  it('applies the className to the group', () => {
    const { container } = render(<ChestSVG className="custom-chest" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-chest');
  });

  it('forwards custom props as attributes', () => {
    const { container } = render(<ChestSVG data-test="chest-test" aria-label="Chest" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'chest-test');
    expect(g).toHaveAttribute('aria-label', 'Chest');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<ChestSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the floor shadow rect', () => {
    const { container } = render(<ChestSVG />);
    const shadow = container.querySelector('rect[x="7"][y="10"][width="24"][height="18"]');
    expect(shadow).toBeInTheDocument();
    expect(shadow).toHaveAttribute('rx', '1');
    expect(shadow).toHaveAttribute('fill', '#6B3E1F');
    expect(shadow).toHaveAttribute('opacity', '0.25');
  });

  it('renders the lid edge/lip rect', () => {
    const { container } = render(<ChestSVG />);
    const lidEdge = container.querySelector('rect[x="5"][y="8"][width="26"][height="20"]');
    expect(lidEdge).toBeInTheDocument();
    expect(lidEdge).toHaveAttribute('fill', '#6B3E1F');
  });

  it('renders the main chest body rect', () => {
    const { container } = render(<ChestSVG />);
    const body = container.querySelector('rect[x="6"][y="9"][width="24"][height="18"]');
    expect(body).toBeInTheDocument();
    expect(body).toHaveAttribute('fill', '#A0703C');
    expect(body).toHaveAttribute('stroke', '#8B5E3C');
    expect(body).toHaveAttribute('stroke-width', '0.6');
  });

  it('renders wood grain lines (4 lines)', () => {
    const { container } = render(<ChestSVG />);
    const grainLines = container.querySelectorAll('line[stroke="#7A4E20"]');
    expect(grainLines.length).toBe(4);
    grainLines.forEach((line) => {
      expect(line).toHaveAttribute('stroke-width', '0.3');
      expect(line).toHaveAttribute('opacity', '0.25');
    });
  });

  it('renders metal band top rects (dark and highlight)', () => {
    const { container } = render(<ChestSVG />);
    const darkBands = container.querySelectorAll('rect[fill="#555"]');
    expect(darkBands.length).toBe(2);
    expect(darkBands[0]).toHaveAttribute('y', '11');
    expect(darkBands[0]).toHaveAttribute('height', '1.5');
    expect(darkBands[1]).toHaveAttribute('y', '24');
    const highlights = container.querySelectorAll('rect[fill="#777"]');
    expect(highlights.length).toBe(2);
  });

  it('renders nail heads - top band (4 circles)', () => {
    const { container } = render(<ChestSVG />);
    const topNails = container.querySelectorAll('circle[cy="11.8"]');
    expect(topNails.length).toBe(4);
    topNails.forEach((nail) => {
      expect(nail).toHaveAttribute('fill', '#888');
      expect(nail).toHaveAttribute('r', '0.7');
    });
  });

  it('renders nail heads - bottom band (4 circles)', () => {
    const { container } = render(<ChestSVG />);
    const bottomNails = container.querySelectorAll('circle[cy="24.8"]');
    expect(bottomNails.length).toBe(4);
    bottomNails.forEach((nail) => {
      expect(nail).toHaveAttribute('fill', '#888');
      expect(nail).toHaveAttribute('r', '0.7');
    });
  });

  it('renders the lock/keyhole circle', () => {
    const { container } = render(<ChestSVG />);
    const lock = container.querySelector('circle[cx="18"][cy="21"][r="2.5"]');
    expect(lock).toBeInTheDocument();
    expect(lock).toHaveAttribute('fill', '#D4A017');
    expect(lock).toHaveAttribute('stroke', '#B8860B');
    expect(lock).toHaveAttribute('stroke-width', '0.4');
  });

  it('renders the keyhole rect inside lock', () => {
    const { container } = render(<ChestSVG />);
    const keyhole = container.querySelector('rect[x="17.5"][y="21.5"][width="1"][height="2.5"]');
    expect(keyhole).toBeInTheDocument();
    expect(keyhole).toHaveAttribute('fill', '#333');
  });

  it('renders hinges at back edge (2 rects)', () => {
    const { container } = render(<ChestSVG />);
    const hinges = container.querySelectorAll('rect[fill="#666"][stroke="#555"]');
    expect(hinges.length).toBe(2);
    hinges.forEach((hinge) => {
      expect(hinge).toHaveAttribute('height', '1.2');
      expect(hinge).toHaveAttribute('stroke-width', '0.3');
    });
  });

  it('renders bottom and right edge shadows', () => {
    const { container } = render(<ChestSVG />);
    const rightShadow = container.querySelector('rect[x="28"][y="9"][width="2"][height="18"]');
    expect(rightShadow).toBeInTheDocument();
    expect(rightShadow).toHaveAttribute('fill', '#6B3E1F');
    expect(rightShadow).toHaveAttribute('opacity', '0.15');

    const bottomShadow = container.querySelector('rect[x="6"][y="25"][width="24"][height="2"]');
    expect(bottomShadow).toBeInTheDocument();
    expect(bottomShadow).toHaveAttribute('opacity', '0.15');
  });

  it('renders displayName as ChestSVG', () => {
    expect(ChestSVG.displayName).toBe('ChestSVG');
  });

  it('renders total element counts as expected', () => {
    const { container } = render(<ChestSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 1 shadow rect + 1 lid edge rect + 1 body rect + 4 grain lines
    // + 4 metal band rects (2 dark + 2 highlight) + 8 nail head circles
    // + 1 lock circle + 1 keyhole rect + 2 hinge rects + 2 edge shadow rects
    // = 25 child elements
    expect(allElements.length).toBe(25);
  });
});
