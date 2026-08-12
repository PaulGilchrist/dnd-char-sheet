import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';
import { CONDITIONS } from '../../services/combat/conditions/conditionUtils.js';

describe('EffectAdder - conditions tab', () => {
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

  it('should render all conditions as clickable badges', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    CONDITIONS.forEach(({ key: _key, label }) => {
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

  it('should disable Apply button when no condition is selected', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
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

  it('should allow changing the DC input', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: '15' } });
    expect(dcInput).toHaveValue(15);
  });

  it('should handle invalid DC input by defaulting to 10', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const dcInput = screen.getByLabelText('DC');
    fireEvent.change(dcInput, { target: { value: 'abc' } });
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

  it('should not call onApply when Apply is clicked without a selection', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('should have all six ability options in the Save dropdown', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    const select = screen.getByLabelText('Save');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveValue('str');
    expect(options[1]).toHaveValue('dex');
    expect(options[2]).toHaveValue('con');
    expect(options[3]).toHaveValue('int');
    expect(options[4]).toHaveValue('wis');
    expect(options[5]).toHaveValue('cha');
  });
});
