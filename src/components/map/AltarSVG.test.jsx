import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AltarSVG from './AltarSVG';

describe('AltarSVG', () => {
  it('renders a root <g> element', () => {
    const { container } = render(<AltarSVG />);
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
  });

  it('applies id to the root <g>', () => {
    const { container } = render(<AltarSVG id="altar" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('id', 'altar');
  });

  it('applies className to the root <g>', () => {
    const { container } = render(<AltarSVG className="altar-svg" />);
    const g = container.querySelector('g');
    expect(g).toHaveClass('altar-svg');
  });

  it('spreads additional props to the root <g>', () => {
    const { container } = render(<AltarSVG data-test="altar" role="img" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('data-test', 'altar');
    expect(g).toHaveAttribute('role', 'img');
  });

  it('renders floor shadow rect', () => {
    const { container } = render(<AltarSVG />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders stone base rects', () => {
    const { container } = render(<AltarSVG />);
    const rects = container.querySelectorAll('rect');
    // stone base + top surface + decorative border + edge shadows + highlight = at least 5 rects
    expect(rects.length).toBeGreaterThanOrEqual(5);
  });

  it('renders red cloth runner rects', () => {
    const { container } = render(<AltarSVG />);
    const rects = container.querySelectorAll('rect');
    // cloth strip + 2 gold trims = at least 3 more rects
    expect(rects.length).toBeGreaterThanOrEqual(8);
  });

  it('renders offering depression', () => {
    const { container } = render(<AltarSVG />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(9);
  });

  it('renders blood stain path and spatter circles', () => {
    const { container } = render(<AltarSVG />);
    const paths = container.querySelectorAll('path');
    const circles = container.querySelectorAll('circle');
    expect(paths.length).toBeGreaterThan(0);
    expect(circles.length).toBeGreaterThan(0);
  });

  it('renders 4 candles (each with glow, body, flame outer, flame inner)', () => {
    const { container } = render(<AltarSVG />);
    // Each candle group has 1 rect (body) + 3 circles (glow + flame) = 4 elements per candle
    // 4 candles = 4 rects + 12 circles
    const candleRects = container.querySelectorAll('rect[fill="#F5F0E0"]');
    const candleFlames = container.querySelectorAll('circle[fill="#E87A20"]');
    expect(candleRects.length).toBe(4);
    expect(candleFlames.length).toBe(8); // glow (opacity 0.12) + flame (solid) = 2 per candle
  });

  it('renders central rune symbol with rings and star paths', () => {
    const { container } = render(<AltarSVG />);
    const runePaths = container.querySelectorAll('path[fill="#D4A017"]');
    const runeCircles = container.querySelectorAll('circle[stroke="#D4A017"]');
    expect(runePaths.length).toBeGreaterThanOrEqual(2);
    expect(runeCircles.length).toBeGreaterThanOrEqual(2);
  });

  it('renders offering goblet', () => {
    const { container } = render(<AltarSVG />);
    const gobletCircles = container.querySelectorAll('circle[fill="#D4A017"]');
    expect(gobletCircles.length).toBeGreaterThan(0);
  });

  it('renders displayName as AltarSVG', () => {
    expect(AltarSVG.displayName).toBe('AltarSVG');
  });
});
