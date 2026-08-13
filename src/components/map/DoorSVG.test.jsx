// @improved-by-ai
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DoorSVG from './DoorSVG.jsx';

describe('DoorSVG', () => {
  describe('root element', () => {
    it('renders a <g> element', () => {
      const { container } = render(<DoorSVG />);
      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('applies id to the root <g>', () => {
      const { container } = render(<DoorSVG id="door-1" />);
      expect(container.querySelector('g')).toHaveAttribute('id', 'door-1');
    });

    it('does not render id attribute when id is undefined', () => {
      const { container } = render(<DoorSVG />);
      expect(container.querySelector('g')).not.toHaveAttribute('id');
    });

    it('applies className to the root <g>', () => {
      const { container } = render(<DoorSVG className="custom-door" />);
      expect(container.querySelector('g')).toHaveClass('custom-door');
    });

    it('does not render class attribute when className is undefined', () => {
      const { container } = render(<DoorSVG />);
      expect(container.querySelector('g')).not.toHaveAttribute('class');
    });

    it('spreads additional props as attributes on the group', () => {
      const { container } = render(
        <DoorSVG data-test="door-test" aria-label="Door" role="img" />,
      );
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('data-test', 'door-test');
      expect(g).toHaveAttribute('aria-label', 'Door');
      expect(g).toHaveAttribute('role', 'img');
    });

    it('accepts a ref via forwardRef', () => {
      const ref = React.createRef();
      render(<DoorSVG ref={ref} />);
      expect(ref.current).toBeTruthy();
      expect(ref.current.tagName).toBe('G');
    });

    it('sets displayName to "DoorSVG"', () => {
      expect(DoorSVG.displayName).toBe('DoorSVG');
    });
  });

  describe('door body', () => {
    it('renders the main board rect with correct shape and color', () => {
      const { container } = render(<DoorSVG />);
      const body = container.querySelector(
        'rect[x="15"][y="0"][width="6"][height="36"]',
      );
      expect(body).toBeInTheDocument();
      expect(body).toHaveAttribute('fill', '#8B5A2B');
    });
  });

  describe('wood grain lines', () => {
    it('renders 2 grain lines with correct positions and styling', () => {
      const { container } = render(<DoorSVG />);
      const lines = Array.from(container.querySelectorAll('line[stroke="#6B3E1F"]'));
      expect(lines.length).toBe(2);

      expect(lines[0]).toHaveAttribute('x1', '16.5');
      expect(lines[0]).toHaveAttribute('y1', '0');
      expect(lines[0]).toHaveAttribute('x2', '16.5');
      expect(lines[0]).toHaveAttribute('y2', '36');
      expect(lines[0]).toHaveAttribute('stroke-width', '0.3');
      expect(lines[0]).toHaveAttribute('opacity', '0.5');

      expect(lines[1]).toHaveAttribute('x1', '19.5');
      expect(lines[1]).toHaveAttribute('y1', '0');
      expect(lines[1]).toHaveAttribute('x2', '19.5');
      expect(lines[1]).toHaveAttribute('y2', '36');
    });
  });

  describe('highlight edge', () => {
    it('renders the highlight rect with correct attributes', () => {
      const { container } = render(<DoorSVG />);
      const highlight = container.querySelector(
        'rect[x="15"][y="0"][width="0.5"][height="36"]',
      );
      expect(highlight).toBeInTheDocument();
      expect(highlight).toHaveAttribute('fill', '#A0652D');
      expect(highlight).toHaveAttribute('opacity', '0.6');
    });
  });

  describe('element structure', () => {
    it('renders 4 child elements inside the group', () => {
      const { container } = render(<DoorSVG />);
      const g = container.querySelector('g');
      expect(g.children.length).toBe(4);
    });

    it('renders the expected SVG element types', () => {
      const { container } = render(<DoorSVG />);
      const g = container.querySelector('g');
      const rects = g.querySelectorAll('rect');
      const lines = g.querySelectorAll('line');
      expect(rects.length).toBe(2);
      expect(lines.length).toBe(2);
    });
  });
});
