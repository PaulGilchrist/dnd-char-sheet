import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';

describe('EffectAdder - rendering', () => {
  let props;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      targetName: 'Goblin',
      initialTab: 'conditions',
      onCancel: vi.fn(),
      onApply: vi.fn(),
      creatures: [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Dragon' },
      ],
    };
  });

  describe('overlay and modal structure', () => {
    it('should render the overlay with a modal', () => {
      render(<EffectAdder {...props} />);
      expect(document.querySelector('.ea-overlay')).toBeInTheDocument();
      expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    });

    it('should render the target name as heading', () => {
      render(<EffectAdder {...props} />);
      expect(screen.getByRole('heading', { level: 3, name: 'Goblin' })).toBeInTheDocument();
    });

    it.each`
      targetName
      ${'Goblin'}
      ${'Alice the Wizard'}
      ${''}
    `('should render target name "$targetName" in heading', ({ targetName }) => {
      render(<EffectAdder {...props} targetName={targetName} />);
      expect(screen.getByRole('heading', { level: 3, name: targetName || '' })).toBeInTheDocument();
    });

    it('should render three tabs: Conditions, Effects, Concentration', () => {
      render(<EffectAdder {...props} />);
      expect(screen.getByRole('button', { name: 'Conditions' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Effects' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Concentration' })).toBeInTheDocument();
    });

    it('should highlight the initialTab as active', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      expect(document.querySelectorAll('.ea-tab--active')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Conditions' })).toHaveClass('ea-tab--active');

      // Switch to effects tab
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      expect(screen.getByRole('button', { name: 'Effects' })).toHaveClass('ea-tab--active');
      expect(screen.getByRole('button', { name: 'Conditions' })).not.toHaveClass('ea-tab--active');

      // Switch to concentration tab
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByRole('button', { name: 'Concentration' })).toHaveClass('ea-tab--active');
      expect(screen.getByRole('button', { name: 'Conditions' })).not.toHaveClass('ea-tab--active');
    });

    it('should default to "conditions" tab when initialTab is not provided', () => {
      render(<EffectAdder {...props} initialTab={undefined} />);
      expect(screen.getByRole('button', { name: 'Conditions' })).toHaveClass('ea-tab--active');
    });

    it('should call onCancel when the overlay background is clicked', () => {
      render(<EffectAdder {...props} />);
      const overlay = document.querySelector('.ea-overlay');
      fireEvent.click(overlay);
      expect(props.onCancel).toHaveBeenCalled();
    });

    it('should NOT call onCancel when the modal content is clicked', () => {
      render(<EffectAdder {...props} />);
      const modal = document.querySelector('.ea-modal');
      fireEvent.click(modal);
      expect(props.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('tab switching', () => {
    it('should switch to Effects tab when clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      expect(screen.getByRole('button', { name: 'Effects' })).toHaveClass('ea-tab--active');
      expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
    });

    it('should switch to Concentration tab when clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByRole('button', { name: 'Concentration' })).toHaveClass('ea-tab--active');
      expect(screen.getByPlaceholderText('e.g. Hold Person')).toBeInTheDocument();
    });
  });
});
