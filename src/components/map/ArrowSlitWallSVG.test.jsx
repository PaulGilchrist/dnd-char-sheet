import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArrowSlitWallSVG from './ArrowSlitWallSVG';

describe('ArrowSlitWallSVG', () => {
    it('renders a <g> element', () => {
        const { container } = render(<ArrowSlitWallSVG />);
        const g = container.querySelector('g');
        expect(g).toBeInTheDocument();
    });

    it('applies the id attribute to the group', () => {
        const { container } = render(<ArrowSlitWallSVG id="my-slit" />);
        const g = container.querySelector('g');
        expect(g).toHaveAttribute('id', 'my-slit');
    });

    it('applies the className to the group', () => {
        const { container } = render(<ArrowSlitWallSVG className="custom-class" />);
        const g = container.querySelector('g');
        expect(g).toHaveClass('custom-class');
    });

    it('forwards custom props as attributes', () => {
        const { container } = render(<ArrowSlitWallSVG data-test="slit-test" aria-label="Arrow slit" />);
        const g = container.querySelector('g');
        expect(g).toHaveAttribute('data-test', 'slit-test');
        expect(g).toHaveAttribute('aria-label', 'Arrow slit');
    });

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
        const polygons = container.querySelectorAll('polygon');
        expect(polygons.length).toBe(3);
        const mainPolygon = polygons[0];
        expect(mainPolygon).toHaveAttribute('fill', '#2a2a2a');
        expect(mainPolygon).toHaveAttribute('points', '16,4 20,4 30,36 6,36');
    });

    it('renders the left shading polygon', () => {
        const { container } = render(<ArrowSlitWallSVG />);
        const polygons = container.querySelectorAll('polygon');
        const leftPolygon = polygons[1];
        expect(leftPolygon).toHaveAttribute('fill', '#3a3a3a');
        expect(leftPolygon).toHaveAttribute('opacity', '0.4');
    });

    it('renders the right shading polygon', () => {
        const { container } = render(<ArrowSlitWallSVG />);
        const polygons = container.querySelectorAll('polygon');
        const rightPolygon = polygons[2];
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

    it('accepts a ref via forwardRef', () => {
        const ref = React.createRef();
        render(<ArrowSlitWallSVG ref={ref} />);
        expect(ref.current).toBeTruthy();
        expect(ref.current.tagName.toLowerCase()).toBe('g');
    });

    it('sets the correct displayName', () => {
        expect(ArrowSlitWallSVG.displayName).toBe('ArrowSlitWallSVG');
    });

    it('renders all SVG elements in the correct order', () => {
        const { container } = render(<ArrowSlitWallSVG />);
        const g = container.querySelector('g');
        const elements = Array.from(g.querySelectorAll('rect, polygon'));
        expect(elements.length).toBe(4);
        expect(elements[0].tagName.toLowerCase()).toBe('rect');
        expect(elements[1].tagName.toLowerCase()).toBe('polygon');
        expect(elements[2].tagName.toLowerCase()).toBe('polygon');
        expect(elements[3].tagName.toLowerCase()).toBe('polygon');
    });
});
