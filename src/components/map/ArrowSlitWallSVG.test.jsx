// @improved-by-ai
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArrowSlitWallSVG from './ArrowSlitWallSVG';

describe('ArrowSlitWallSVG', () => {
  describe('props', () => {
    it('renders a <g> element', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const g = container.querySelector('g');
      expect(g).toBeInTheDocument();
    });

    it('applies the id prop to the group element', () => {
      const { container } = render(<ArrowSlitWallSVG id="my-slit" />);
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('id', 'my-slit');
    });

    it('applies the className prop to the group element', () => {
      const { container } = render(<ArrowSlitWallSVG className="custom-class" />);
      const g = container.querySelector('g');
      expect(g).toHaveClass('custom-class');
    });

    it('passes through rest props as attributes', () => {
      const { container } = render(<ArrowSlitWallSVG data-test="slit-test" aria-label="Arrow slit" />);
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('data-test', 'slit-test');
      expect(g).toHaveAttribute('aria-label', 'Arrow slit');
    });

    it('forwards ref to the group element', () => {
      const ref = React.createRef();
      render(<ArrowSlitWallSVG ref={ref} />);
      expect(ref.current).toBeTruthy();
      expect(ref.current.tagName.toLowerCase()).toBe('g');
    });

    it('combines id, className, rest props, and ref on the same element', () => {
      const ref = React.createRef();
      const { container } = render(
        <ArrowSlitWallSVG id="test-slit" className="test-class" data-custom="value" ref={ref} />
      );
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('id', 'test-slit');
      expect(g).toHaveClass('test-class');
      expect(g).toHaveAttribute('data-custom', 'value');
      expect(ref.current).toBe(g);
    });
  });

  describe('SVG structure', () => {
    it('renders a background rect with correct attributes', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const rect = container.querySelector('rect');
      expect(rect).toBeInTheDocument();
      expect(rect).toHaveAttribute('x', '0');
      expect(rect).toHaveAttribute('y', '0');
      expect(rect).toHaveAttribute('width', '36');
      expect(rect).toHaveAttribute('height', '36');
      expect(rect).toHaveAttribute('fill', '#696969');
      expect(rect).toHaveAttribute('opacity', '0.85');
    });

    it('renders the main arrow slit polygon', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const mainPolygon = container.querySelector('polygon[points="16,4 20,4 30,36 6,36"]');
      expect(mainPolygon).toBeInTheDocument();
      expect(mainPolygon).toHaveAttribute('fill', '#2a2a2a');
    });

    it('renders the left shading polygon', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const leftPolygon = container.querySelector('polygon[points="16,4 18,4 17,12 13,36 6,36"]');
      expect(leftPolygon).toBeInTheDocument();
      expect(leftPolygon).toHaveAttribute('fill', '#3a3a3a');
      expect(leftPolygon).toHaveAttribute('opacity', '0.4');
    });

    it('renders the right shading polygon', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const rightPolygon = container.querySelector('polygon[points="20,4 18,4 19,12 23,36 30,36"]');
      expect(rightPolygon).toBeInTheDocument();
      expect(rightPolygon).toHaveAttribute('fill', '#4a4a4a');
      expect(rightPolygon).toHaveAttribute('opacity', '0.3');
    });

    it('renders a center line divider', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const line = container.querySelector('line');
      expect(line).toBeInTheDocument();
      expect(line).toHaveAttribute('x1', '18');
      expect(line).toHaveAttribute('y1', '4');
      expect(line).toHaveAttribute('x2', '18');
      expect(line).toHaveAttribute('y2', '36');
      expect(line).toHaveAttribute('stroke', '#4a4a4a');
      expect(line).toHaveAttribute('stroke-width', '1');
    });

    it('renders exactly 5 child elements (1 rect + 3 polygons + 1 line)', () => {
      const { container } = render(<ArrowSlitWallSVG />);
      const g = container.querySelector('g');
      expect(g.children.length).toBe(5);
    });
  });

  describe('displayName', () => {
    it('has the correct displayName', () => {
      expect(ArrowSlitWallSVG.displayName).toBe('ArrowSlitWallSVG');
    });
  });
});
