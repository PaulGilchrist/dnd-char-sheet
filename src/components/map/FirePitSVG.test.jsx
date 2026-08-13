import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FirePitSVG from './FirePitSVG';

describe('FirePitSVG', () => {
  describe('rendering', () => {
    it('should render an SVG group element', () => {
      const { container } = render(<FirePitSVG />);
      const g = container.querySelector('g');
      expect(g).toBeInTheDocument();
    });

    it('should render SVG elements for glow, stone ring, flames, and sparks', () => {
      const { container } = render(<FirePitSVG />);
      const circles = container.querySelectorAll('circle');
      const ellipses = container.querySelectorAll('ellipse');
      const paths = container.querySelectorAll('path');

      expect(circles.length).toBeGreaterThan(0);
      expect(ellipses.length).toBeGreaterThan(0);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render ambient glow circles with correct positions and radii', () => {
      const { container } = render(<FirePitSVG />);
      const circles = container.querySelectorAll('circle');

      // Find glow circles by their characteristic positions (cy=10 and cy=18) with large radii
      const glowCircles = Array.from(circles).filter(
        (c) => {
          const cy = c.getAttribute('cy');
          const r = parseFloat(c.getAttribute('r'));
          return (cy === '10' || cy === '18') && r >= 14;
        }
      );

      expect(glowCircles.length).toBe(3);
      expect(glowCircles[0]).toHaveAttribute('cx', '18');
      expect(glowCircles[0]).toHaveAttribute('r', '17');
      expect(glowCircles[0]).toHaveAttribute('opacity', '0.1');
      expect(glowCircles[1]).toHaveAttribute('r', '14');
      expect(glowCircles[1]).toHaveAttribute('opacity', '0.08');
      expect(glowCircles[2]).toHaveAttribute('cy', '18');
      expect(glowCircles[2]).toHaveAttribute('r', '18');
      expect(glowCircles[2]).toHaveAttribute('opacity', '0.03');
    });

    it('should render the stone ring circle with correct styling', () => {
      const { container } = render(<FirePitSVG />);
      const circles = container.querySelectorAll('circle');
      const stoneRing = Array.from(circles).find(
        (c) => c.getAttribute('cx') === '18' && c.getAttribute('cy') === '20' && c.getAttribute('r') === '9'
      );
      expect(stoneRing).toBeInTheDocument();
      expect(stoneRing).toHaveAttribute('fill', '#555');
      expect(stoneRing).toHaveAttribute('stroke', '#333');
      expect(stoneRing).toHaveAttribute('stroke-width', '1.5');
    });

    it('should render ember ellipses and circles at the base', () => {
      const { container } = render(<FirePitSVG />);
      const ellipses = container.querySelectorAll('ellipse');
      expect(ellipses.length).toBe(2);
      const emberEllipse = Array.from(ellipses).find(
        (e) => e.getAttribute('cx') === '18' && e.getAttribute('cy') === '20'
      );
      expect(emberEllipse).toBeInTheDocument();
      expect(emberEllipse).toHaveAttribute('rx', '6');
      expect(emberEllipse).toHaveAttribute('ry', '2');
    });

    it('should render flame paths with all expected color layers', () => {
      const { container } = render(<FirePitSVG />);
      const paths = container.querySelectorAll('path');
      const fillColors = new Set(Array.from(paths).map((p) => p.getAttribute('fill')));

      // Should have outer flames (#D35400), mid flames (#E87A20), inner flames (#F5D060), core (#FFF8E0)
      expect(fillColors).toContain('#D35400');
      expect(fillColors).toContain('#E87A20');
      expect(fillColors).toContain('#F5D060');
      expect(fillColors).toContain('#FFF8E0');
    });

    it('should render the white-hot core ellipse', () => {
      const { container } = render(<FirePitSVG />);
      const ellipses = container.querySelectorAll('ellipse');
      const core = Array.from(ellipses).find(
        (e) => e.getAttribute('cx') === '18' && e.getAttribute('cy') === '9'
      );
      expect(core).toBeInTheDocument();
      expect(core).toHaveAttribute('fill', '#FFFFFF');
      expect(core).toHaveAttribute('opacity', '0.6');
    });

    it('should render floating spark circles with opacity values', () => {
      const { container } = render(<FirePitSVG />);
      const circles = container.querySelectorAll('circle');
      const sparkCircles = Array.from(circles).filter(
        (c) => {
          const cy = parseFloat(c.getAttribute('cy'));
          const r = parseFloat(c.getAttribute('r'));
          return cy < 10 && r < 2;
        }
      );
      expect(sparkCircles.length).toBeGreaterThan(0);
      sparkCircles.forEach((spark) => {
        expect(spark).toHaveAttribute('opacity');
      });
    });
  });

  describe('props', () => {
    it('should apply the id prop to the group element', () => {
      const { container } = render(<FirePitSVG id="custom-firepit" />);
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('id', 'custom-firepit');
    });

    it('should apply the className prop to the group element', () => {
      const { container } = render(<FirePitSVG className="my-firepit-class" />);
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('class', 'my-firepit-class');
    });

    it('should pass through rest props as attributes', () => {
      const { container } = render(<FirePitSVG data-test="firepit-test" aria-label="Fire Pit" />);
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('data-test', 'firepit-test');
      expect(g).toHaveAttribute('aria-label', 'Fire Pit');
    });

    it('should forward ref to the group element', () => {
      const ref = { current: null };
      render(<FirePitSVG ref={ref} />);
      expect(ref.current).toBeTruthy();
      expect(ref.current.tagName.toLowerCase()).toBe('g');
    });

    it('should combine id, className, and rest props', () => {
      const ref = { current: null };
      const { container } = render(
        <FirePitSVG id="test-id" className="test-class" data-custom="value" ref={ref} />
      );
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('id', 'test-id');
      expect(g).toHaveAttribute('class', 'test-class');
      expect(g).toHaveAttribute('data-custom', 'value');
      expect(ref.current).toBe(g);
    });

    it('should handle null id and undefined className gracefully', () => {
      const { container } = render(<FirePitSVG id={null} className={undefined} />);
      const g = container.querySelector('g');
      expect(g).not.toHaveAttribute('id');
      expect(g).not.toHaveAttribute('class');
    });
  });
});
