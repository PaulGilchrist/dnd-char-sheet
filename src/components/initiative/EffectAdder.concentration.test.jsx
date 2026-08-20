// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';

describe('EffectAdder - concentration tab', () => {
  let props;

  beforeEach(() => {
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

  it('should render spell name input and DC field with correct labels and placeholder', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    expect(screen.getByText('Spell Name')).toBeInTheDocument();
    expect(screen.getByText('DC')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Hold Person')).toBeInTheDocument();
  });

  it('should auto-focus the spell name input', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
    expect(spellInput).toHaveFocus();
  });

  it('should have DC input defaulting to 10', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const dcInput = screen.getByLabelText('DC');
    expect(dcInput).toHaveValue(10);
  });

  it('should disable Apply when spell name is empty', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('should enable Apply when spell name is entered', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
    fireEvent.change(spellInput, { target: { value: 'Fireball' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('should remain disabled when spell name is only whitespace', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
    fireEvent.change(spellInput, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('should allow changing DC to a valid value', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '18' } });
    expect(dcInput).toHaveValue(18);
  });

  it('should default DC to 10 when entering invalid text', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: 'xyz' } });
    expect(dcInput).toHaveValue(10);
  });

  it('should default DC to 10 when entering 0', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '0' } });
    expect(dcInput).toHaveValue(10);
  });

  it('should call onApply with trimmed spell name and correct DC', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
    fireEvent.change(spellInput, { target: { value: '  Shield  ' } });
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).toHaveBeenCalledWith('concentration', {
      spellName: 'Shield',
      dc: 15,
    });
  });

  it('should not call onApply when Apply is clicked with whitespace-only spell name', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
    fireEvent.change(spellInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('should call onCancel when Cancel is clicked', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('should not call onApply when Apply is clicked without spell name', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).not.toHaveBeenCalled();
  });
});
