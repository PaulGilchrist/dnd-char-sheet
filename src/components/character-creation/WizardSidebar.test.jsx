// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardSidebar from './WizardSidebar.jsx';

const createProps = (overrides = {}) => ({
  currentStep: 2,
  isEditing: false,
  getStepEnabled: overrides.getStepEnabled ?? (() => true),
  goToStep: vi.fn(),
  isSaveEnabled: true,
  onSave: vi.fn(),
  ...overrides,
});

const renderSidebar = (props = {}) => render(<WizardSidebar {...createProps(props)} />);

const findByTabTitle = (title) => screen.getByText(title).closest('.sidebar-tab');
const findSaveButton = () => screen.getByText('Save').closest('.sidebar-save');

describe('WizardSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all visible step tabs with correct titles for 5e when not editing', () => {
      renderSidebar();
      const visibleStepTitles = [
        'Ruleset',
        'Basic Information',
        'Race',
        'Subrace',
        'Class',
        'Subclass / Major',
        'Feats',
        'Ability Scores',
        'Skill Proficiencies',
        'Tool Proficiencies',
        'Languages & Fighting Styles',
        'Resistances & Immunities',
        'Spells',
        'Magic Items',
        'Inventory',
        'Special Actions',
      ];
      for (const title of visibleStepTitles) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
      expect(screen.queryByText('Background')).not.toBeInTheDocument();
    });

    it('hides step 1 (Ruleset) when editing', () => {
      renderSidebar({ isEditing: true });
      expect(screen.queryByText('Ruleset')).not.toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('hides step 5 (Background) when ruleset is 5e', () => {
      renderSidebar({ ruleset: '5e' });
      expect(screen.queryByText('Background')).not.toBeInTheDocument();
    });

    it('hides step 5 (Background) when ruleset is undefined', () => {
      renderSidebar({ ruleset: undefined });
      expect(screen.queryByText('Background')).not.toBeInTheDocument();
    });

    it('shows step 5 (Background) when ruleset is 2024', () => {
      renderSidebar({ ruleset: '2024' });
      expect(screen.getByText('Background')).toBeInTheDocument();
    });

    it('hides step 1 when editing even with 2024 ruleset', () => {
      renderSidebar({ isEditing: true, ruleset: '2024' });
      expect(screen.queryByText('Ruleset')).not.toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
    });

    it('renders step numbers for each tab', () => {
      renderSidebar();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('17')).toBeInTheDocument();
    });

    it('renders the save button with checkmark', () => {
      renderSidebar();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('marks the current step tab as active', () => {
      renderSidebar({ currentStep: 3 });
      const activeTab = findByTabTitle('Race');
      expect(activeTab).toHaveClass('active');
    });

    it('marks non-current tabs as not active', () => {
      renderSidebar({ currentStep: 3 });
      const inactiveTab = findByTabTitle('Basic Information');
      expect(inactiveTab).not.toHaveClass('active');
    });

    it('handles currentStep outside valid range without crashing', () => {
      renderSidebar({ currentStep: 99 });
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('applies disabled class and disabled property to tabs where getStepEnabled returns false', () => {
      renderSidebar({ getStepEnabled: (step) => step !== 3 });
      const disabledTab = findByTabTitle('Race');
      expect(disabledTab).toHaveClass('disabled');
      expect(disabledTab).toBeDisabled();
      const enabledTab = findByTabTitle('Basic Information');
      expect(enabledTab).not.toHaveClass('disabled');
      expect(enabledTab).not.toBeDisabled();
    });

    it('applies disabled class and disabled property to save button when isSaveEnabled is false', () => {
      renderSidebar({ isSaveEnabled: false });
      const saveButton = findSaveButton();
      expect(saveButton).toHaveClass('disabled');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('navigation interaction', () => {
    it('calls goToStep with the correct step number when an enabled tab is clicked', () => {
      const props = createProps();
      render(<WizardSidebar {...props} />);
      fireEvent.click(findByTabTitle('Race'));
      expect(props.goToStep).toHaveBeenCalledWith(3);
    });

    it('does not call goToStep when a disabled tab is clicked', () => {
      const props = createProps({ getStepEnabled: (step) => step !== 3 });
      render(<WizardSidebar {...props} />);
      fireEvent.click(findByTabTitle('Race'));
      expect(props.goToStep).not.toHaveBeenCalled();
    });
  });

  describe('save button interaction', () => {
    it('calls onSave when the save button is clicked', () => {
      const props = createProps();
      render(<WizardSidebar {...props} />);
      fireEvent.click(findSaveButton());
      expect(props.onSave).toHaveBeenCalled();
    });

    it('does not call onSave when the save button is disabled', () => {
      const props = createProps({ isSaveEnabled: false });
      render(<WizardSidebar {...props} />);
      fireEvent.click(findSaveButton());
      expect(props.onSave).not.toHaveBeenCalled();
    });
  });
});
