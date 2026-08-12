import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EffectAdder from './EffectAdder.jsx';

describe('EffectAdder - edge cases', () => {
  it('should render without crashing when all props are minimal', () => {
    render(<EffectAdder targetName='Test' onCancel={vi.fn()} onApply={vi.fn()} creatures={[]} />);
    expect(document.querySelector('.ea-modal')).toBeInTheDocument();
  });

  it('should render without crashing when onApply/onCancel are undefined', () => {
    expect(() => {
      render(<EffectAdder targetName='Test' />);
    }).not.toThrow();
  });
});
