// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepRules from './WizardStepRules.jsx';

function createMockProps(overrides = {}) {
  return {
    ruleset: '5e',
    errors: {},
    onRulesetChange: overrides.onRulesetChange || vi.fn(),
    ...overrides,
  };
}

describe('WizardStepRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header and description', () => {
    it('should render the step heading', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByRole('heading', { name: 'Select Rules System' })).toBeInTheDocument();
    });

    it('should render the step description', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByText(/Choose which D&D ruleset your character will follow:/)).toBeInTheDocument();
    });
  });

  describe('ruleset options', () => {
    it('should render both 5e and 2024 options with headings', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByRole('heading', { name: '5th Edition (5e)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '2024 Rules (Essentials)' })).toBeInTheDocument();
    });

    it('should render all 5e option content', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByText(/The classic D&D ruleset from 2014/)).toBeInTheDocument();
      expect(screen.getByText('Traditional spell slots')).toBeInTheDocument();
      expect(screen.getByText('Classic class features')).toBeInTheDocument();
      expect(screen.getByText('Standard ability improvements')).toBeInTheDocument();
      expect(screen.getByText('Original subclass system')).toBeInTheDocument();
    });

    it('should render all 2024 option content', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByText(/The updated D&D ruleset/)).toBeInTheDocument();
      expect(screen.getByText('Revised spell mechanics')).toBeInTheDocument();
      expect(screen.getByText('Updated class features')).toBeInTheDocument();
      expect(screen.getByText('Improved ability improvements')).toBeInTheDocument();
      expect(screen.getByText('Modern subclass system')).toBeInTheDocument();
    });

    it('should mark the matching ruleset option as selected', () => {
      render(<WizardStepRules {...createMockProps()} />);
      expect(screen.getByTestId('rules-option-5e')).toHaveClass('selected');
      expect(screen.getByTestId('rules-option-2024')).not.toHaveClass('selected');
    });

    it('should mark the 2024 option as selected when ruleset is 2024', () => {
      render(<WizardStepRules {...createMockProps({ ruleset: '2024' })} />);
      expect(screen.getByTestId('rules-option-5e')).not.toHaveClass('selected');
      expect(screen.getByTestId('rules-option-2024')).toHaveClass('selected');
    });
  });

  describe('selection switching', () => {
    it('should call onRulesetChange with 5e when the 5e option is clicked', () => {
      const onRulesetChange = vi.fn();
      render(<WizardStepRules {...createMockProps({ onRulesetChange })} />);
      fireEvent.click(screen.getByTestId('rules-option-5e'));
      expect(onRulesetChange).toHaveBeenCalledWith('5e');
    });

    it('should call onRulesetChange with 2024 when the 2024 option is clicked', () => {
      const onRulesetChange = vi.fn();
      render(<WizardStepRules {...createMockProps({ onRulesetChange })} />);
      fireEvent.click(screen.getByTestId('rules-option-2024'));
      expect(onRulesetChange).toHaveBeenCalledWith('2024');
    });

    it('should call onRulesetChange independently for each click', () => {
      const onRulesetChange = vi.fn();
      render(<WizardStepRules {...createMockProps({ onRulesetChange })} />);
      fireEvent.click(screen.getByTestId('rules-option-5e'));
      fireEvent.click(screen.getByTestId('rules-option-2024'));
      fireEvent.click(screen.getByTestId('rules-option-5e'));
      expect(onRulesetChange).toHaveBeenCalledWith('5e');
      expect(onRulesetChange).toHaveBeenCalledWith('2024');
      expect(onRulesetChange).toHaveBeenCalledWith('5e');
      expect(onRulesetChange).toHaveBeenCalledTimes(3);
    });

    it('should reflect selected state from props when ruleset is passed as 2024 and user clicks 5e', () => {
      const onRulesetChange = vi.fn();
      render(<WizardStepRules {...createMockProps({ ruleset: '2024', onRulesetChange })} />);
      expect(screen.getByTestId('rules-option-2024')).toHaveClass('selected');
      fireEvent.click(screen.getByTestId('rules-option-5e'));
      expect(onRulesetChange).toHaveBeenCalledWith('5e');
    });
  });

  describe('error display', () => {
    it('should render the error message when a ruleset error exists', () => {
      const errorMessage = 'Please select a ruleset';
      render(<WizardStepRules {...createMockProps({ errors: { ruleset: errorMessage } })} />);
      const errorEl = screen.getByText(errorMessage);
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveClass('error-message');
    });

    it('should not render an error message when errors object is empty', () => {
      render(<WizardStepRules {...createMockProps({ errors: {} })} />);
      expect(screen.queryByText('Please select a ruleset')).not.toBeInTheDocument();
    });

    it('should not render an error message when errors is undefined', () => {
      // eslint-disable-next-line no-unused-vars
      const { errors, ...props } = createMockProps();
      render(<WizardStepRules {...props} />);
      expect(screen.queryByText('Please select a ruleset')).not.toBeInTheDocument();
    });
  });
});
