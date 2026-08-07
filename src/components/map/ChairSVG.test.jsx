import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ChairSVG from './ChairSVG.jsx';

describe('ChairSVG', () => {
  describe('rendering', () => {
    it('should render a <g> element', () => {
      const { container } = render(<ChairSVG />);
      const group = container.querySelector('g');
      expect(group).toBeInTheDocument();
    });

    it('should render all SVG child elements (rects and circles)', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      const circles = container.querySelectorAll('circle');
      // Total rects: 15 (floor shadow 1, backrest 3, seat 3, left armrest 2, right armrest 2, front frame 1, legs 4)
      // Total circles: 4 (2 decorative + 2 gold tips)
      expect(rects.length).toBe(15);
      expect(circles.length).toBe(4);
    });

    it('should render with no props', () => {
      const { container } = render(<ChairSVG />);
      const group = container.querySelector('g');
      expect(group).not.toHaveAttribute('id');
    });

    it('should pass through id prop', () => {
      render(<ChairSVG id="chair-1" />);
      const group = document.querySelector('g');
      expect(group).toHaveAttribute('id', 'chair-1');
    });

    it('should pass through className prop', () => {
      render(<ChairSVG className="chair-svg test-class" />);
      const group = document.querySelector('g');
      expect(group).toHaveAttribute('class', 'chair-svg test-class');
    });

    it('should pass through additional props via spread', () => {
      const mockFn = vi.fn();
      render(<ChairSVG onClick={mockFn} data-testid="my-chair" />);
      const group = document.querySelector('[data-testid="my-chair"]');
      expect(group).toHaveAttribute('data-testid', 'my-chair');
    });

    it('should forward ref to the <g> element', () => {
      const ref = { current: null };
      render(<ChairSVG ref={ref} />);
      expect(ref.current).toBeInstanceOf(Element);
      expect(ref.current.tagName).toBe('G');
    });

    it('should set displayName to "ChairSVG"', () => {
      expect(ChairSVG.displayName).toBe('ChairSVG');
    });
  });

  describe('SVG element attributes', () => {
    it('should render floor shadow rect with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      const shadow = rects[0];
      expect(shadow).toHaveAttribute('x', '3');
      expect(shadow).toHaveAttribute('y', '3');
      expect(shadow).toHaveAttribute('width', '30');
      expect(shadow).toHaveAttribute('height', '30');
      expect(shadow).toHaveAttribute('rx', '1');
      expect(shadow).toHaveAttribute('fill', '#4A2810');
      expect(shadow).toHaveAttribute('opacity', '0.15');
    });

    it('should render backrest with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      const backrest = rects[1];
      expect(backrest).toHaveAttribute('x', '7');
      expect(backrest).toHaveAttribute('y', '4');
      expect(backrest).toHaveAttribute('width', '22');
      expect(backrest).toHaveAttribute('height', '7');
      expect(backrest).toHaveAttribute('fill', '#5C3317');
      expect(backrest).toHaveAttribute('stroke', '#4A2810');
      expect(backrest).toHaveAttribute('stroke-width', '0.6');
    });

    it('should render gold trim on backrest', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      const trim = rects[2];
      expect(trim).toHaveAttribute('fill', '#D4AF37');
      expect(trim).toHaveAttribute('opacity', '0.8');
    });

    it('should render decorative circles in backrest', () => {
      const { container } = render(<ChairSVG />);
      const circles = container.querySelectorAll('circle');
      expect(circles[0]).toHaveAttribute('cx', '18');
      expect(circles[0]).toHaveAttribute('cy', '7.5');
      expect(circles[0]).toHaveAttribute('fill', 'none');
      expect(circles[0]).toHaveAttribute('stroke', '#D4AF37');
    });

    it('should render seat cushion with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      // Index 3 is the seat cushion main rect (after shadow, backrest main, backrest trim)
      const cushion = rects[3];
      expect(cushion).toHaveAttribute('x', '7');
      expect(cushion).toHaveAttribute('y', '11');
      expect(cushion).toHaveAttribute('width', '22');
      expect(cushion).toHaveAttribute('height', '14');
      expect(cushion).toHaveAttribute('fill', '#8B0000');
      expect(cushion).toHaveAttribute('stroke', '#6B0000');
    });

    it('should render left armrest with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      // Index 6 is the left armrest main rect (after shadow, backrest 3, seat 3)
      const leftArmrest = rects[6];
      expect(leftArmrest).toHaveAttribute('x', '4');
      expect(leftArmrest).toHaveAttribute('y', '11');
      expect(leftArmrest).toHaveAttribute('width', '3');
      expect(leftArmrest).toHaveAttribute('height', '14');
      expect(leftArmrest).toHaveAttribute('fill', '#5C3317');
    });

    it('should render right armrest with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      // Index 8 is the right armrest main rect (after shadow 1, backrest 3, seat 3, left armrest 2)
      const rightArmrest = rects[8];
      expect(rightArmrest).toHaveAttribute('x', '29');
      expect(rightArmrest).toHaveAttribute('y', '11');
      expect(rightArmrest).toHaveAttribute('width', '3');
      expect(rightArmrest).toHaveAttribute('height', '14');
      expect(rightArmrest).toHaveAttribute('fill', '#5C3317');
    });

    it('should render front frame with correct attributes', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      // Index 10 is the front frame rect (after shadow 1, backrest 3, seat 3, left armrest 2, right armrest 2)
      const frontFrame = rects[10];
      expect(frontFrame).toHaveAttribute('x', '7');
      expect(frontFrame).toHaveAttribute('y', '25');
      expect(frontFrame).toHaveAttribute('width', '22');
      expect(frontFrame).toHaveAttribute('height', '4');
      expect(frontFrame).toHaveAttribute('fill', '#5C3317');
    });

    it('should render all four legs', () => {
      const { container } = render(<ChairSVG />);
      const rects = container.querySelectorAll('rect');
      // Index 11-14 are the four legs (after front frame at index 10)
      const legs = Array.from(rects).slice(11, 15);
      expect(legs[0]).toHaveAttribute('x', '5');
      expect(legs[0]).toHaveAttribute('y', '5');
      expect(legs[1]).toHaveAttribute('x', '28');
      expect(legs[1]).toHaveAttribute('y', '5');
      expect(legs[2]).toHaveAttribute('x', '5');
      expect(legs[2]).toHaveAttribute('y', '27');
      expect(legs[3]).toHaveAttribute('x', '28');
      expect(legs[3]).toHaveAttribute('y', '27');
      legs.forEach((leg) => {
        expect(leg).toHaveAttribute('fill', '#4A2810');
      });
    });

    it('should render gold tips on armrests', () => {
      const { container } = render(<ChairSVG />);
      const circles = container.querySelectorAll('circle');
      // Index 2-3 are the gold tips (after 2 decorative circles)
      const tips = Array.from(circles).slice(2);
      expect(tips[0]).toHaveAttribute('cx', '5.5');
      expect(tips[0]).toHaveAttribute('cy', '24.5');
      expect(tips[0]).toHaveAttribute('fill', '#D4AF37');
      expect(tips[1]).toHaveAttribute('cx', '30.5');
      expect(tips[1]).toHaveAttribute('cy', '24.5');
      expect(tips[1]).toHaveAttribute('fill', '#D4AF37');
    });
  });
});
