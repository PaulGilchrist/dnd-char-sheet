// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardProgressBar from './WizardProgressBar.jsx';

describe('WizardProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderProgressBar(props = {}) {
    return render(<WizardProgressBar currentStep={1} totalSteps={5} {...props} />);
  }

  function getFillElement(container) {
    return container.querySelector('.progress-fill');
  }

  describe('structure', () => {
    it('renders a progress-bar container with a progress-fill child', () => {
      const { container } = renderProgressBar();
      expect(container.firstChild).toHaveClass('progress-bar');
      expect(getFillElement(container)).toHaveClass('progress-fill');
    });
  });

  describe('progress width calculation', () => {
    it('computes linear progress from 0% to 100% across steps', () => {
      // Step 1 of 5: (1-1)/(5-1) = 0%
      let { container } = renderProgressBar({ currentStep: 1, totalSteps: 5 });
      expect(getFillElement(container)).toHaveStyle('--progress-width: 0%');

      // Step 3 of 5: (3-1)/(5-1) = 50%
      ({ container } = renderProgressBar({ currentStep: 3, totalSteps: 5 }));
      expect(getFillElement(container)).toHaveStyle('--progress-width: 50%');

      // Step 5 of 5: (5-1)/(5-1) = 100%
      ({ container } = renderProgressBar({ currentStep: 5, totalSteps: 5 }));
      expect(getFillElement(container)).toHaveStyle('--progress-width: 100%');
    });

    it('computes correct progress for different step counts', () => {
      // Step 2 of 4: (2-1)/(4-1) = 33.333%
      const { container } = renderProgressBar({
        currentStep: 2,
        totalSteps: 4,
      });
      expect(getFillElement(container)).toHaveStyle(
        `--progress-width: 33.33333333333333%`
      );
    });

    it('renders 0% for the first step of a 12-step wizard', () => {
      const { container } = renderProgressBar({
        currentStep: 1,
        totalSteps: 12,
      });
      expect(getFillElement(container)).toHaveStyle('--progress-width: 0%');
    });

    it('renders 100% for the last step of a 12-step wizard', () => {
      const { container } = renderProgressBar({
        currentStep: 12,
        totalSteps: 12,
      });
      expect(getFillElement(container)).toHaveStyle('--progress-width: 100%');
    });
  });

  describe('isEditing mode', () => {
    it('shifts progress downward when isEditing is true', () => {
      // Without editing: step 2 of 4 = (2-1)/(4-1) = 33.33%
      let { container } = renderProgressBar({
        currentStep: 2,
        totalSteps: 4,
        isEditing: false,
      });
      expect(getFillElement(container)).toHaveStyle(
        `--progress-width: 33.33333333333333%`
      );

      // With editing: effectiveStep=1, effectiveTotal=3 → (1-1)/(3-1) = 0%
      ({ container } = renderProgressBar({
        currentStep: 2,
        totalSteps: 4,
        isEditing: true,
      }));
      expect(getFillElement(container)).toHaveStyle('--progress-width: 0%');
    });

    it('renders 0% when isEditing shifts to the first effective step', () => {
      // currentStep=2 → effectiveStep=1 (first step)
      const { container } = renderProgressBar({
        currentStep: 2,
        totalSteps: 5,
        isEditing: true,
      });
      expect(getFillElement(container)).toHaveStyle('--progress-width: 0%');
    });
  });

  describe('edge cases', () => {
    it('handles totalSteps of 1 without crashing (produces NaN)', () => {
      const { container } = renderProgressBar({
        currentStep: 1,
        totalSteps: 1,
      });
      expect(container.firstChild).toHaveClass('progress-bar');
      expect(getFillElement(container)).toHaveStyle('--progress-width: NaN%');
    });

    it('handles currentStep of 0 (produces negative progress)', () => {
      const { container } = renderProgressBar({
        currentStep: 0,
        totalSteps: 5,
      });
      // (0-1)/(5-1) = -25%
      expect(getFillElement(container)).toHaveStyle('--progress-width: -25%');
    });

    it('handles negative progress when isEditing shifts below first step', () => {
      // currentStep=1, isEditing=true → effectiveStep=0, effectiveTotal=4
      // (0-1)/(4-1) = -33.33%
      const { container } = renderProgressBar({
        currentStep: 1,
        totalSteps: 5,
        isEditing: true,
      });
      expect(getFillElement(container)).toHaveStyle(
        '--progress-width: -33.33333333333333%'
      );
    });
  });
});
