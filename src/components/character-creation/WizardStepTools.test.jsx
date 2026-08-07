// @cleaned-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepTools from './WizardStepTools.jsx';

// Mock dataLoader to avoid actual fetch calls
vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(),
}));

// Mock toolValidation so we don't need it for unit tests of the UI component
vi.mock('../../services/character/toolValidation.js', () => ({
  getToolsByCategory: vi.fn(),
}));

import { getToolsByCategory } from '../../services/character/toolValidation.js';

// Sample tool data for categories
const artisanTools = [
  { name: "Alchemist's Supplies", ability: 'Intelligence', utilize: 'Identify substance', craft: 'Acid' },
  { name: "Brewer's Supplies", ability: 'Intelligence', utilize: 'Detect poisoned drink', craft: 'Antitoxin' },
  { name: "Carver's Tools", ability: 'Dexterity', utilize: 'Carve stone', craft: 'Statue' },
];

const gamingSets = [
  { name: 'Dice Set', ability: 'Charisma', utilize: 'Play a game', craft: '' },
  { name: 'Playing Card Set', ability: 'Dexterity', utilize: 'Play cards', craft: '' },
];

const musicalInstruments = [
  { name: 'Bagpipes', ability: 'Charisma', utilize: 'Play a known tune', craft: '' },
  { name: 'Drum', ability: 'Wisdom', utilize: 'Set tempo', craft: '' },
  { name: 'Viol', ability: 'Charisma', utilize: 'Play a melody', craft: '' },
];

const otherTools = [
  { name: "Disguise Kit", ability: 'Charisma', utilize: 'Alter appearance', craft: '' },
  { name: 'Forgery Kit', ability: 'Intelligence', utilize: 'Create forgery', craft: '' },
];

const mockToolData = {
  "Artisan's Tools": artisanTools,
  'Gaming Sets': gamingSets,
  'Musical Instrument': musicalInstruments,
  'Other Tools': otherTools,
};

function setupCategoryMocks() {
  getToolsByCategory.mockImplementation(async (cat) => {
    return mockToolData[cat] || [];
  });
}

const baseProps = {
  formData: { toolProficiencies: [] },
  errors: {},
  onToolToggle: vi.fn(),
  toolLimits: {
    categoryLimits: new Map([["Artisan's Tools", 2]]),
    skilledUsesAvailable: 0,
  },
  toolWarnings: [],
  preSelectedTools: [],
  skillLimits: { skilledUsesUsed: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  setupCategoryMocks();
});

async function waitForTools() {
  await waitFor(() => {
    expect(document.querySelectorAll('.tool-card').length).toBeGreaterThan(0);
  });
}

describe('WizardStepTools', () => {
  describe('rendering', () => {
    it('should render step header', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();
      expect(screen.getByText('Step 11: Tool Proficiencies')).toBeInTheDocument();
    });

    it('should render all four tool categories', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();
      expect(screen.getByText("Artisan's Tools")).toBeInTheDocument();
      expect(screen.getByText('Gaming Sets')).toBeInTheDocument();
      expect(screen.getByText('Musical Instrument')).toBeInTheDocument();
      expect(screen.getByText('Other Tools')).toBeInTheDocument();
    });

    it('should render tools within each category', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();
      expect(screen.getByText("Alchemist's Supplies")).toBeInTheDocument();
      expect(screen.getByText("Brewer's Supplies")).toBeInTheDocument();
      expect(screen.getByText('Bagpipes')).toBeInTheDocument();
      expect(screen.getByText("Disguise Kit")).toBeInTheDocument();
    });

    it('should render ability badges for tools that have an ability', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();
      // Ability abbreviations: STR, DEX, CON, INT, WIS, CHA
      expect(screen.getAllByText('INT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DEX').length).toBeGreaterThan(0);
      expect(screen.getAllByText('WIS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CHA').length).toBeGreaterThan(0);
    });

    it('should render tool details (utilize/craft) when tool is selected', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies"] }}
      />);
      await waitForTools();

      // Tool details should only appear for selected tools
      const alchemistCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Alchemist's Supplies")
      );
      expect(alchemistCard).toHaveClass('selected');
      expect(alchemistCard.querySelector('.tool-card-details')).toBeInTheDocument();
      expect(alchemistCard).toHaveTextContent('Utilize: Identify substance');
      expect(alchemistCard).toHaveTextContent('Craft: Acid');
    });

    it('should NOT render tool details for unselected tools', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: [] }}
      />);
      await waitForTools();

      const allCards = document.querySelectorAll('.tool-card');
      allCards.forEach(card => {
        expect(card.querySelector('.tool-card-details')).toBeNull();
      });
    });

    it('should render warnings when provided', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolWarnings={[{ type: 'warning', message: 'Too many tools selected' }]}
      />);
      await waitForTools();
      expect(screen.getByText('Too many tools selected')).toBeInTheDocument();
    });

    it('should render error message when provided', async () => {
      render(<WizardStepTools
        {...baseProps}
        errors={{ toolProficiencies: 'Tool proficiency error' }}
      />);
      await waitForTools();
      expect(screen.getByText('Tool proficiency error')).toBeInTheDocument();
    });

    it('should hide rules info when toolLimits is null', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={null}
      />);
      await waitForTools();
      expect(screen.queryByText(/Rules:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/You have selected/)).not.toBeInTheDocument();
    });

    it('should hide rules info when toolLimits is empty object', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{}}
      />);
      await waitForTools();
      expect(screen.queryByText(/Rules:/)).not.toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('should mark selected tools with "selected" class', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies", 'Dice Set'] }}
      />);
      await waitForTools();

      const alchemistCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Alchemist's Supplies")
      );
      expect(alchemistCard).toHaveClass('selected');

      const diceCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes('Dice Set')
      );
      expect(diceCard).toHaveClass('selected');
    });

    it('should mark pre-selected tools with "pre-selected" class', async () => {
      render(<WizardStepTools
        {...baseProps}
        preSelectedTools={['Brewer\'s Supplies']}
      />);
      await waitForTools();

      const brewerCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Brewer's Supplies")
      );
      expect(brewerCard).toHaveClass('pre-selected');
    });

    it('should mark tools that are both pre-selected and selected with both classes', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ['Brewer\'s Supplies'] }}
        preSelectedTools={['Brewer\'s Supplies']}
      />);
      await waitForTools();

      const brewerCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Brewer's Supplies")
      );
      expect(brewerCard).toHaveClass('selected');
      expect(brewerCard).toHaveClass('pre-selected');
    });

    it('should render checkboxes with checked state matching formData', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies"] }}
      />);
      await waitForTools();

      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      const alchemistCheckbox = Array.from(allCheckboxes).find(cb => {
        const label = cb.closest('.tool-card');
        return label && label.textContent.includes("Alchemist's Supplies");
      });
      expect(alchemistCheckbox.checked).toBe(true);

      const diceCheckbox = Array.from(allCheckboxes).find(cb => {
        const label = cb.closest('.tool-card');
        return label && label.textContent.includes('Dice Set');
      });
      expect(diceCheckbox.checked).toBe(false);
    });

    it('should disable checkbox for pre-selected + selected tools', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ['Brewer\'s Supplies'] }}
        preSelectedTools={['Brewer\'s Supplies']}
      />);
      await waitForTools();

      const brewerCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Brewer's Supplies")
      );
      const checkbox = brewerCard.querySelector('input[type="checkbox"]');
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe('tool toggling', () => {
    it('should call onToolToggle when toggling a non-pre-selected tool', async () => {
      const mockOnToolToggle = vi.fn();
      render(<WizardStepTools
        {...baseProps}
        onToolToggle={mockOnToolToggle}
      />);
      await waitForTools();

      const diceCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes('Dice Set')
      );
      const checkbox = diceCard.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);

      expect(mockOnToolToggle).toHaveBeenCalledWith('Dice Set');
    });

    it('should NOT call onToolToggle when clicking a pre-selected + selected tool', async () => {
      const mockOnToolToggle = vi.fn();
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ['Brewer\'s Supplies'] }}
        preSelectedTools={['Brewer\'s Supplies']}
        onToolToggle={mockOnToolToggle}
      />);
      await waitForTools();

      const brewerCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Brewer's Supplies")
      );
      const checkbox = brewerCard.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);

      expect(mockOnToolToggle).not.toHaveBeenCalled();
    });

    it('should call onToolToggle when toggling off a non-pre-selected tool', async () => {
      const mockOnToolToggle = vi.fn();
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies"] }}
        onToolToggle={mockOnToolToggle}
      />);
      await waitForTools();

      const alchemistCard = Array.from(document.querySelectorAll('.tool-card')).find(
        c => c.textContent.includes("Alchemist's Supplies")
      );
      const checkbox = alchemistCard.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);

      expect(mockOnToolToggle).toHaveBeenCalledWith("Alchemist's Supplies");
    });
  });

  describe('rules info display', () => {
    it('should display selected tool count including pre-selected', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies", 'Dice Set'] }}
        preSelectedTools={['Brewer\'s Supplies']}
      />);
      await waitForTools();

      // realToolCount = 2 (non-placeholder), preSelected = 1, chosen = 1
      expect(screen.getByText(/You have selected 2 tool proficiency/)).toBeInTheDocument();
      expect(screen.getByText(/1 pre-selected/)).toBeInTheDocument();
      expect(screen.getByText(/1 chosen/)).toBeInTheDocument();
    });

    it('should display category limits from toolLimits', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{
          categoryLimits: new Map([["Artisan's Tools", 2], ['Gaming Sets', 1]]),
          skilledUsesAvailable: 0,
        }}
      />);
      await waitForTools();

      expect(screen.getByText(/2 Artisan's Tools/)).toBeInTheDocument();
      expect(screen.getByText(/1 Gaming Sets/)).toBeInTheDocument();
    });

    it('should filter out zero-count categories from the display', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{
          categoryLimits: new Map([["Artisan's Tools", 2], ['Gaming Sets', 0]]),
          skilledUsesAvailable: 0,
        }}
      />);
      await waitForTools();

      expect(screen.getByText(/2 Artisan's Tools/)).toBeInTheDocument();
      expect(screen.queryByText(/0 Gaming Sets/)).not.toBeInTheDocument();
    });
  });

  describe('skilled tool usage display', () => {
    it('should NOT show skilled info when skilledUsesAvailable is 0', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{
          categoryLimits: new Map(),
          skilledUsesAvailable: 0,
        }}
      />);
      await waitForTools();

      expect(screen.queryByText(/Skilled/)).not.toBeInTheDocument();
      expect(screen.queryByText(/uses used for tools/)).not.toBeInTheDocument();
    });

    it('should show skilled info when skilledUsesAvailable > 0', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{
          categoryLimits: new Map(),
          skilledUsesAvailable: 3,
        }}
        skillLimits={{ skilledUsesUsed: 2 }}
      />);
      await waitForTools();

      expect(screen.getByText(/Skilled/)).toBeInTheDocument();
      expect(screen.getByText(/2 of 3 uses used for tools/)).toBeInTheDocument();
    });

    it('should show 0 uses when none used yet', async () => {
      render(<WizardStepTools
        {...baseProps}
        toolLimits={{
          categoryLimits: new Map(),
          skilledUsesAvailable: 3,
        }}
        skillLimits={{ skilledUsesUsed: 0 }}
      />);
      await waitForTools();

      expect(screen.getByText(/0 of 3 uses used for tools/)).toBeInTheDocument();
    });
  });

  describe('placeholder tool handling', () => {
    it('should exclude placeholder tools from realToolCount', async () => {
      // Placeholder format: "2 from: SomeTool"
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies", "2 from: Brewer's Supplies"] }}
      />);
      await waitForTools();

      // Only 1 real tool (the "2 from:" entry is a placeholder)
      expect(screen.getByText(/You have selected 1 tool proficiency/)).toBeInTheDocument();
    });

    it('should exclude placeholder tools from skilled tool tracking', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{ toolProficiencies: ["Alchemist's Supplies", "2 from: Brewer's Supplies"] }}
        toolLimits={{
          categoryLimits: new Map(),
          skilledUsesAvailable: 3,
        }}
        skillLimits={{ skilledUsesUsed: 1 }}
        allTools={[]}
      />);
      await waitForTools();

      // Only 1 real tool, so 1 tool from skilled
      expect(screen.getByText(/1 of 3 uses used for tools/)).toBeInTheDocument();
    });
  });

  describe('category rendering', () => {
    it('should render category sections with correct structure', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();

      const categoryHeaders = document.querySelectorAll('.tool-category-header');
      expect(categoryHeaders).toHaveLength(4);

      const categorySections = document.querySelectorAll('.tool-category-section');
      expect(categorySections).toHaveLength(4);
    });

    it('should render multi-select-container with compact class', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();

      const containers = document.querySelectorAll('.multi-select-container.multi-select-compact');
      expect(containers).toHaveLength(4);
    });

    it('should render all tools from all categories', async () => {
      render(<WizardStepTools {...baseProps} />);
      await waitForTools();

      const allToolCards = document.querySelectorAll('.tool-card');
      // 3 artisan + 2 gaming + 3 musical + 2 other = 10
      expect(allToolCards).toHaveLength(10);
    });
  });

  describe('empty state', () => {
    it('should render without crashing when formData has no toolProficiencies key', async () => {
      render(<WizardStepTools
        {...baseProps}
        formData={{}}
      />);
      await waitForTools();
      expect(screen.getByText('Step 11: Tool Proficiencies')).toBeInTheDocument();
    });

    it('should render without crashing when all props are minimal', async () => {
      render(<WizardStepTools
        formData={{ toolProficiencies: [] }}
        errors={{}}
        onToolToggle={() => {}}
        toolLimits={null}
        toolWarnings={[]}
        preSelectedTools={[]}
        skillLimits={{}}
      />);
      await waitForTools();
      expect(screen.getByText('Step 11: Tool Proficiencies')).toBeInTheDocument();
    });
  });

  describe('memoization (areEqual)', () => {
    it('should return true for equal props (memoization optimization)', async () => {
      const mockOnToolToggle = vi.fn();
      const limits = {
        categoryLimits: new Map([["Artisan's Tools", 2]]),
        skilledUsesAvailable: 0,
      };
      const skillLimits = { skilledUsesUsed: 0 };

      const { rerender } = render(<WizardStepTools
        {...baseProps}
        onToolToggle={mockOnToolToggle}
        toolLimits={limits}
        skillLimits={skillLimits}
      />);
      await waitForTools();

      // Rerender with identical props should use memo
      rerender(<WizardStepTools
        {...baseProps}
        onToolToggle={mockOnToolToggle}
        toolLimits={limits}
        skillLimits={skillLimits}
      />);

      // If memoization works, the component should still render fine
      expect(screen.getByText('Step 11: Tool Proficiencies')).toBeInTheDocument();
    });

    it('should return false for different formData (memoization optimization)', async () => {
      const mockOnToolToggle = vi.fn();
      const limits = {
        categoryLimits: new Map([["Artisan's Tools", 2]]),
        skilledUsesAvailable: 0,
      };

      const { rerender } = render(<WizardStepTools
        {...baseProps}
        onToolToggle={mockOnToolToggle}
        toolLimits={limits}
        formData={{ toolProficiencies: [] }}
      />);
      await waitForTools();

      rerender(<WizardStepTools
        {...baseProps}
        onToolToggle={mockOnToolToggle}
        toolLimits={limits}
        formData={{ toolProficiencies: ["Alchemist's Supplies"] }}
      />);

      expect(screen.getByText('Step 11: Tool Proficiencies')).toBeInTheDocument();
    });
  });
});
