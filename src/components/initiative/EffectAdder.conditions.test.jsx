// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';
import { CONDITIONS } from '../../services/combat/conditions/conditionUtils.js';

describe('EffectAdder - conditions tab', () => {
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

  it('should render all conditions as clickable badges', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    CONDITIONS.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('should render DC and Save (ability) fields', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    expect(dcInput).toBeInTheDocument();
    expect(dcInput).toHaveValue(10);

    const select = screen.getByLabelText('Save');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('con');
  });

  it('should select a condition and show it as selected', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const blindedBtn = screen.getByText('Blinded');
    fireEvent.click(blindedBtn);
    expect(blindedBtn).toHaveClass('ea-badge--selected');
  });

  it('should enable Apply button when a condition is selected', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByText('Blinded'));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('should set the save ability to the condition\'s default ability when selected', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    // grappled defaults to 'str'
    fireEvent.click(screen.getByText('Grappled'));
    const select = screen.getByLabelText('Save');
    expect(select.value).toBe('str');
  });

  it('should keep current ability when selecting a condition with no default ability', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    // blinded has no default ability
    fireEvent.click(screen.getByText('Blinded'));
    const select = screen.getByLabelText('Save');
    expect(select.value).toBe('con');
  });

  it('should update ability when re-selecting a condition with a different default', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    // blinded has no default, stays at 'con'
    fireEvent.click(screen.getByText('Blinded'));
    const select = screen.getByLabelText('Save');
    expect(select.value).toBe('con');
    // grappled defaults to 'str'
    fireEvent.click(screen.getByText('Grappled'));
    expect(select.value).toBe('str');
  });

  it('should allow changing the DC input', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '15' } });
    expect(dcInput).toHaveValue(15);
  });

  it('should default DC to 10 when entering invalid text', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: 'abc' } });
    expect(dcInput).toHaveValue(10);
  });

  it('should default DC to 10 when entering 0', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '0' } });
    expect(dcInput).toHaveValue(10);
  });

  it('should allow changing the save ability', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const select = screen.getByLabelText('Save');
    fireEvent.change(select, { target: { value: 'dex' } });
    expect(select.value).toBe('dex');
  });

  it('should call onApply with correct data when Apply is clicked', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByText('Blinded'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).toHaveBeenCalledWith('conditions', {
      conditionKey: 'blinded',
      dc: 10,
      ability: 'con',
    });
  });

  it('should call onApply with custom DC and ability', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByText('Grappled'));
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '20' } });
    const select = screen.getByLabelText('Save');
    fireEvent.change(select, { target: { value: 'dex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).toHaveBeenCalledWith('conditions', {
      conditionKey: 'grappled',
      dc: 20,
      ability: 'dex',
    });
  });

  it('should call onCancel when Cancel is clicked', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('should call onCancel when clicking outside the modal', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const overlay = document.querySelector('.ea-overlay');
    fireEvent.click(overlay);
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('should not call onApply when Apply is clicked without a selection', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('should have all six ability options in the Save dropdown', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const select = screen.getByLabelText('Save');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toContain('str');
    expect(options).toContain('dex');
    expect(options).toContain('con');
    expect(options).toContain('int');
    expect(options).toContain('wis');
    expect(options).toContain('cha');
  });
});
