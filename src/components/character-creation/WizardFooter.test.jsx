import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardFooter from './WizardFooter.jsx';

describe('WizardFooter', () => {
  const baseProps = {
    onCancel: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('layout', () => {
    it('renders the wizard-footer container', () => {
      const { container } = render(<WizardFooter {...baseProps} />);
      expect(container.firstChild).toHaveClass('wizard-footer');
    });

    it('renders exactly two buttons', () => {
      const { container } = render(<WizardFooter {...baseProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('button visibility — first step', () => {
    it('renders Cancel (disabled) on the first step, no Previous', () => {
      render(<WizardFooter {...baseProps} isFirstStep />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('btn btn-secondary');
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    });

    it('renders Next on the first step when not last', () => {
      render(<WizardFooter {...baseProps} isFirstStep isLastStep={false} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveClass('btn btn-primary');
    });

    it('renders Cancel (disabled) + Create Character on the first+last step (single-step wizard)', () => {
      render(<WizardFooter {...baseProps} isFirstStep isLastStep />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Create Character' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Create Character' })).toHaveClass('btn btn-success');
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    });

    it('renders Cancel (disabled) + Save Changes on the first+last step when editing', () => {
      render(<WizardFooter {...baseProps} isFirstStep isLastStep isEditing />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveClass('btn btn-success');
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    });

    it('disables Next when isNextDisabled on the first step', () => {
      render(<WizardFooter {...baseProps} isFirstStep isNextDisabled />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });
  });

  describe('button visibility — non-first step', () => {
    it('renders Previous (enabled) on non-first steps, no Cancel', () => {
      render(<WizardFooter {...baseProps} isFirstStep={false} />);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Previous' })).toHaveClass('btn btn-secondary');
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('renders Next when not on the last step, no submit buttons', () => {
      render(<WizardFooter {...baseProps} isLastStep={false} />);
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Create Character' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    });

    it('renders Create Character on the last step when not editing', () => {
      render(<WizardFooter {...baseProps} isLastStep />);
      expect(screen.getByRole('button', { name: 'Create Character' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Create Character' })).toHaveClass('btn btn-success');
      expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    });

    it('renders Save Changes on the last step when editing', () => {
      render(<WizardFooter {...baseProps} isLastStep isEditing />);
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveClass('btn btn-success');
      expect(screen.queryByRole('button', { name: 'Create Character' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    });

    it('disables Next when isNextDisabled is true', () => {
      render(<WizardFooter {...baseProps} isLastStep={false} isNextDisabled />);
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('renders Previous + Create Character on non-first last step', () => {
      render(<WizardFooter {...baseProps} isFirstStep={false} isLastStep />);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Create Character' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('renders Previous + Save Changes on non-first last step when editing', () => {
      render(<WizardFooter {...baseProps} isFirstStep={false} isLastStep isEditing />);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('default props', () => {
    it('defaults isEditing to false (shows Create Character on last step)', () => {
      render(<WizardFooter {...baseProps} isLastStep />);
      expect(screen.getByRole('button', { name: 'Create Character' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    });

    it('defaults isNextDisabled to false (Next is enabled)', () => {
      render(<WizardFooter {...baseProps} isLastStep={false} />);
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    });
  });

  describe('callback invocation', () => {
    it('calls onPrevious when Previous is clicked', () => {
      render(<WizardFooter {...baseProps} isFirstStep={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(baseProps.onPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when Next is clicked', () => {
      render(<WizardFooter {...baseProps} isLastStep={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(baseProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmit when Create Character is clicked', () => {
      render(<WizardFooter {...baseProps} isLastStep />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Character' }));
      expect(baseProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmit when Save Changes is clicked', () => {
      render(<WizardFooter {...baseProps} isLastStep isEditing />);
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      expect(baseProps.onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
