import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BedSVG from './BedSVG';

describe('BedSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<BedSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<BedSVG id="bed-1" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'bed-1');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<BedSVG className="custom-bed" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('custom-bed');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<BedSVG data-test="bed" role="img" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'bed');
    expect(g).toHaveAttribute('role', 'img');
  });

  it('accepts a ref via forwardRef', () => {
    const ref = React.createRef();
    render(<BedSVG ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current.tagName.toLowerCase()).toBe('g');
  });

  it('renders the wooden frame outer border rect', () => {
    const { container } = render(<BedSVG />);
    const frame = container.querySelector('rect[x="2"][y="4"][width="68"][height="28"]');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('fill', '#A0652D');
    expect(frame).toHaveAttribute('stroke', '#6B3E1F');
    expect(frame).toHaveAttribute('stroke-width', '0.8');
  });

  it('renders the mattress inner rect', () => {
    const { container } = render(<BedSVG />);
    const mattress = container.querySelector('rect[x="6"][y="8"][width="60"][height="20"]');
    expect(mattress).toBeInTheDocument();
    expect(mattress).toHaveAttribute('fill', '#D4A574');
    expect(mattress).toHaveAttribute('stroke', '#B87A3A');
  });

  it('renders the pillow on the left end', () => {
    const { container } = render(<BedSVG />);
    const pillow = container.querySelector('rect[x="4"][y="10"][width="14"][height="16"]');
    expect(pillow).toBeInTheDocument();
    expect(pillow).toHaveAttribute('fill', '#F5F0E8');
  });

  it('renders pillow shading and highlight rects', () => {
    const { container } = render(<BedSVG />);
    const shading = container.querySelector('rect[x="4"][y="10"][width="5"][fill="#E0DBD0"]');
    expect(shading).toBeInTheDocument();
    expect(shading).toHaveAttribute('opacity', '0.5');
    const highlight = container.querySelector('rect[x="13"][y="10"][width="5"][fill="#FAF7F2"]');
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveAttribute('opacity', '0.4');
  });

  it('renders the blanket on the right side', () => {
    const { container } = render(<BedSVG />);
    const blanket = container.querySelector('rect[x="20"][y="6"][width="46"][height="24"]');
    expect(blanket).toBeInTheDocument();
    expect(blanket).toHaveAttribute('fill', '#3B5998');
    expect(blanket).toHaveAttribute('stroke', '#2A4070');
  });

  it('renders blanket fold/edge detail', () => {
    const { container } = render(<BedSVG />);
    const fold = container.querySelector('rect[x="20"][y="28"][width="46"][height="3"][fill="#2A4070"]');
    expect(fold).toBeInTheDocument();
    expect(fold).toHaveAttribute('opacity', '0.6');
  });

  it('renders blanket shading and highlight', () => {
    const { container } = render(<BedSVG />);
    const shading = container.querySelector('rect[x="20"][y="6"][width="12"][fill="#2A4070"]');
    expect(shading).toBeInTheDocument();
    expect(shading).toHaveAttribute('opacity', '0.3');
    const highlight = container.querySelector('rect[x="50"][y="6"][width="16"][fill="#4A6FB5"]');
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveAttribute('opacity', '0.3');
  });

  it('renders the blanket fold line path', () => {
    const { container } = render(<BedSVG />);
    const foldLine = container.querySelector('path[d="M 20 18 Q 24 17 28 18"]');
    expect(foldLine).toBeInTheDocument();
    expect(foldLine).toHaveAttribute('fill', 'none');
    expect(foldLine).toHaveAttribute('stroke', '#2A4070');
  });

  it('renders wood grain lines on frame edges (4 paths)', () => {
    const { container } = render(<BedSVG />);
    const grainPaths = container.querySelectorAll('path[stroke="#7A4E20"]');
    expect(grainPaths.length).toBe(4);
    grainPaths.forEach((path) => {
      expect(path).toHaveAttribute('stroke-width', '0.3');
      expect(path).toHaveAttribute('opacity', '0.4');
    });
  });

  it('renders left side shading rect', () => {
    const { container } = render(<BedSVG />);
    const leftShading = container.querySelector('rect[x="2"][y="4"][width="10"][fill="#8B5524"]');
    expect(leftShading).toBeInTheDocument();
    expect(leftShading).toHaveAttribute('opacity', '0.35');
  });

  it('renders right side highlight rect', () => {
    const { container } = render(<BedSVG />);
    const rightHighlight = container.querySelector('rect[x="58"][y="4"][width="12"][fill="#B87A3A"]');
    expect(rightHighlight).toBeInTheDocument();
    expect(rightHighlight).toHaveAttribute('opacity', '0.3');
  });

  it('renders top edge bevel highlight', () => {
    const { container } = render(<BedSVG />);
    const bevel = container.querySelector('rect[x="4"][y="5"][width="64"][height="1.5"][fill="#C4944A"]');
    expect(bevel).toBeInTheDocument();
    expect(bevel).toHaveAttribute('opacity', '0.4');
  });

  it('renders front edge subtle shadow', () => {
    const { container } = render(<BedSVG />);
    const shadow = container.querySelector('rect[x="4"][y="30"][width="64"][height="1.5"][fill="#6B3E1F"]');
    expect(shadow).toBeInTheDocument();
    expect(shadow).toHaveAttribute('opacity', '0.3');
  });

  it('renders displayName as BedSVG', () => {
    expect(BedSVG.displayName).toBe('BedSVG');
  });

  it('renders correct total element count', () => {
    const { container } = render(<BedSVG />);
    const g = container.querySelector('g');
    const allElements = Array.from(g.children);
    // 13 rects + 5 paths = 18 child elements
    expect(allElements.length).toBe(18);
  });

  it('renders 13 rect elements', () => {
    const { container } = render(<BedSVG />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(13);
  });

  it('renders 5 path elements', () => {
    const { container } = render(<BedSVG />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(5);
  });
});
