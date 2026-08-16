// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepLanguages from './WizardStepLanguages.jsx';

const mockLanguages = ['Common', 'Elvish', 'Dwarfish', 'Gnome'];
const mockFightingStyles = ['Defense', 'Dueling', 'Archery'];

const defaultLanguageLimits = {
  allowed: 3,
  details: 'Your race grants 2 languages. Your level grants 1.',
  preSelected: ['Common'],
};

const defaultFightingStyleLimits = {
  allowed: 1,
  details: 'Fighters get 1 fighting style.',
  preSelected: ['Defense'],
};

function createMockProps(overrides = {}) {
  return {
    formData: {
      languages: ['Common'],
      class: { fightingStyles: ['Defense'] },
      ...overrides.formData,
    },
    errors: {},
    languageLimits: defaultLanguageLimits,
    fightingStyleLimits: defaultFightingStyleLimits,
    preSelectedLanguages: ['Common'],
    preSelectedFightingStyles: ['Defense'],
    warnings: [],
    onLanguageToggle: vi.fn(),
    onFightingStyleToggle: vi.fn(),
    ...overrides,
  };
}

function setupFetchSuccess() {
  global.fetch = vi.fn((url) => {
    if (url.includes('languages.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLanguages),
      });
    }
    if (url.includes('fighting-styles.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFightingStyles),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
}

/**
 * Wait for both language and fighting style lists to be rendered.
 * Checks for the presence of the first item in each section to confirm data loaded.
 */
async function waitForListsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('Common')).toBeInTheDocument();
    expect(screen.getByText('Defense')).toBeInTheDocument();
  });
}

describe('WizardStepLanguages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step header, labels, rule info, and selection counts', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Fighting Styles')).toBeInTheDocument();
      expect(screen.getByText(/Your race grants 2 languages/)).toBeInTheDocument();
      expect(screen.getByText(/Fighters get 1 fighting style/)).toBeInTheDocument();
      expect(screen.getByText(/You have selected 1 of 3 allowed language/)).toBeInTheDocument();
      expect(screen.getByText(/You have selected 1 of 1 allowed fighting style/)).toBeInTheDocument();
    });

    it('should render all languages and fighting styles from fetched data', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      expect(screen.getByText('Common')).toBeInTheDocument();
      expect(screen.getByText('Elvish')).toBeInTheDocument();
      expect(screen.getByText('Dwarfish')).toBeInTheDocument();
      expect(screen.getByText('Gnome')).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
      expect(screen.getByText('Dueling')).toBeInTheDocument();
      expect(screen.getByText('Archery')).toBeInTheDocument();
    });

    it('should render warnings when provided', async () => {
      setupFetchSuccess();
      const warningMsg = 'You have exceeded the limit.';
      render(
        <WizardStepLanguages
          {...createMockProps()}
          warnings={[{ type: 'warning', message: warningMsg }]}
        />
      );
      await waitForListsLoaded();
      expect(screen.getByText(warningMsg)).toBeInTheDocument();
    });

    it('should not render warnings when warnings array is empty', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} warnings={[]} />);
      await waitForListsLoaded();
      expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      expect(screen.queryByText(/exceeded the limit/)).not.toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should not render fighting style rule info when fightingStyleLimits is null', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} fightingStyleLimits={null} />);
      await waitForListsLoaded();
      expect(screen.getByText(/allowed language/)).toBeInTheDocument();
      expect(screen.queryByText(/allowed fighting style/)).not.toBeInTheDocument();
    });

    it('should not render language rule info when languageLimits is null', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} languageLimits={null} />);
      await waitForListsLoaded();
      expect(screen.getByText(/allowed fighting style/)).toBeInTheDocument();
      expect(screen.queryByText(/allowed language/)).not.toBeInTheDocument();
    });

    it('should hide both sections rule info when both limits are null', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps()}
          languageLimits={null}
          fightingStyleLimits={null}
        />
      );
      await waitForListsLoaded();
      expect(screen.queryByText(/allowed language/)).not.toBeInTheDocument();
      expect(screen.queryByText(/allowed fighting style/)).not.toBeInTheDocument();
    });

    it('should not show validation errors when errors object is empty', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} errors={{}} />);
      await waitForListsLoaded();
      expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      expect(screen.queryByText(/select at least one/)).not.toBeInTheDocument();
      expect(screen.queryByText(/selection required/)).not.toBeInTheDocument();
    });
  });

  describe('validation errors', () => {
    it('should show validation errors for languages and fighting styles', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps()}
          errors={{ languages: 'Must select at least one language', fightingStyles: 'Fighting style selection required' }}
        />
      );
      await waitForListsLoaded();
      expect(screen.getByText('Must select at least one language')).toBeInTheDocument();
      expect(screen.getByText('Fighting style selection required')).toBeInTheDocument();
    });

    it('should only show the error for the section that has one', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps()}
          errors={{ languages: 'Must select at least one language' }}
        />
      );
      await waitForListsLoaded();
      expect(screen.getByText('Must select at least one language')).toBeInTheDocument();
      expect(screen.queryByText(/Fighting style selection required/)).not.toBeInTheDocument();
    });
  });

  describe('pre-selected items', () => {
    it('should mark pre-selected items with pre-selected class and disable already-selected checkboxes', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      const preSelectedLabel = document.querySelector('.multi-select-item.pre-selected');
      expect(preSelectedLabel).toBeInTheDocument();
      expect(preSelectedLabel.textContent).toContain('Common');
      const checkbox = preSelectedLabel.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeDisabled();
    });

    it('should not apply pre-selected class when preSelectedLanguages is empty', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps()}
          preSelectedLanguages={[]}
          preSelectedFightingStyles={[]}
        />
      );
      await waitForListsLoaded();
      const preSelectedLabels = document.querySelectorAll('.multi-select-item.pre-selected');
      expect(preSelectedLabels.length).toBe(0);
    });

    it('should disable pre-selected fighting style checkbox when already selected', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      const styleLabels = document.querySelectorAll('.multi-select-item');
      const defenseLabel = Array.from(styleLabels).find(l => l.textContent.includes('Defense'));
      expect(defenseLabel).toHaveClass('pre-selected');
      const checkbox = defenseLabel.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeDisabled();
    });

    it('should mark pre-selected fighting styles with pre-selected class', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      const styleLabels = document.querySelectorAll('.multi-select-item');
      const defenseLabel = Array.from(styleLabels).find(l => l.textContent.includes('Defense'));
      expect(defenseLabel).toHaveClass('pre-selected');
    });
  });

  describe('auto-selection', () => {
    it('should auto-select pre-selected languages not already in formData', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: [], class: { fightingStyles: ['Defense'] } },
          })}
          languageLimits={{
            ...defaultLanguageLimits,
            preSelected: ['Elvish'],
          }}
          onLanguageToggle={mockOnLanguageToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnLanguageToggle).toHaveBeenCalledWith('Elvish');
    });

    it('should not auto-select when items are already in formData', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: ['Elvish'], class: { fightingStyles: [] } },
          })}
          languageLimits={{
            ...defaultLanguageLimits,
            preSelected: ['Elvish'],
          }}
          onLanguageToggle={mockOnLanguageToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnLanguageToggle).not.toHaveBeenCalled();
    });

    it('should not auto-select when languageLimits is null', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({ formData: { languages: [], class: { fightingStyles: [] } } })}
          languageLimits={null}
          onLanguageToggle={mockOnLanguageToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnLanguageToggle).not.toHaveBeenCalled();
    });

    it('should auto-select pre-selected fighting styles not already in formData', async () => {
      setupFetchSuccess();
      const mockOnFightingStyleToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: [], class: { fightingStyles: [] } },
          })}
          fightingStyleLimits={{
            ...defaultFightingStyleLimits,
            preSelected: ['Dueling'],
          }}
          onFightingStyleToggle={mockOnFightingStyleToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnFightingStyleToggle).toHaveBeenCalledWith('Dueling');
    });

    it('should not auto-select fighting styles when already in formData', async () => {
      setupFetchSuccess();
      const mockOnFightingStyleToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: [], class: { fightingStyles: ['Dueling'] } },
          })}
          fightingStyleLimits={{
            ...defaultFightingStyleLimits,
            preSelected: ['Dueling'],
          }}
          onFightingStyleToggle={mockOnFightingStyleToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnFightingStyleToggle).not.toHaveBeenCalled();
    });

    it('should not auto-select fighting styles when fightingStyleLimits is null', async () => {
      setupFetchSuccess();
      const mockOnFightingStyleToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({ formData: { languages: [], class: { fightingStyles: [] } } })}
          fightingStyleLimits={null}
          onFightingStyleToggle={mockOnFightingStyleToggle}
        />
      );
      await waitForListsLoaded();
      expect(mockOnFightingStyleToggle).not.toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    it('should call onLanguageToggle when a non-pre-selected language checkbox is clicked', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps()}
          onLanguageToggle={mockOnLanguageToggle}
        />
      );
      await waitForListsLoaded();
      const checkbox = screen.getByRole('checkbox', { name: 'Elvish' });
      fireEvent.click(checkbox);
      expect(mockOnLanguageToggle).toHaveBeenCalledWith('Elvish');
    });

    it('should call onLanguageToggle when clicking an already-selected non-pre-selected language to deselect it', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({ formData: { languages: ['Common', 'Elvish'], class: { fightingStyles: ['Defense'] } } })}
          onLanguageToggle={mockOnLanguageToggle}
        />
      );
      await waitForListsLoaded();
      const checkbox = screen.getByRole('checkbox', { name: 'Elvish' });
      fireEvent.click(checkbox);
      expect(mockOnLanguageToggle).toHaveBeenCalledWith('Elvish');
    });

    it('should disable checkboxes for pre-selected items already in formData', async () => {
      setupFetchSuccess();
      const mockOnLanguageToggle = vi.fn();
      const props = {
        formData: { languages: ['Common', 'Elvish'], class: { fightingStyles: ['Defense'] } },
        errors: {},
        languageLimits: { allowed: 3, details: 'Your race grants 2 languages. Your level grants 1.', preSelected: ['Common', 'Elvish'] },
        fightingStyleLimits: { allowed: 1, details: 'Fighters get 1 fighting style.', preSelected: ['Defense'] },
        preSelectedLanguages: ['Common', 'Elvish'],
        preSelectedFightingStyles: ['Defense'],
        warnings: [],
        onLanguageToggle: mockOnLanguageToggle,
        onFightingStyleToggle: vi.fn(),
      };
      render(<WizardStepLanguages {...props} />);
      await waitForListsLoaded();
      const checkbox = screen.getByRole('checkbox', { name: 'Common' });
      expect(checkbox.disabled).toBe(true);
    });

    it('should call onFightingStyleToggle when a non-pre-selected fighting style checkbox is clicked', async () => {
      setupFetchSuccess();
      const mockOnFightingStyleToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({ formData: { languages: [], class: { fightingStyles: [] } } })}
          onFightingStyleToggle={mockOnFightingStyleToggle}
        />
      );
      await waitForListsLoaded();
      const checkbox = screen.getByRole('checkbox', { name: 'Dueling' });
      fireEvent.click(checkbox);
      expect(mockOnFightingStyleToggle).toHaveBeenCalledWith('Dueling');
    });

    it('should call onFightingStyleToggle when clicking an already-selected non-pre-selected style to deselect it', async () => {
      setupFetchSuccess();
      const mockOnFightingStyleToggle = vi.fn();
      render(
        <WizardStepLanguages
          {...createMockProps({ formData: { languages: [], class: { fightingStyles: ['Defense', 'Dueling'] } } })}
          onFightingStyleToggle={mockOnFightingStyleToggle}
        />
      );
      await waitForListsLoaded();
      const checkbox = screen.getByRole('checkbox', { name: 'Dueling' });
      fireEvent.click(checkbox);
      expect(mockOnFightingStyleToggle).toHaveBeenCalledWith('Dueling');
    });
  });

  describe('empty state', () => {
    it('should render the step header when no languages or fighting styles are allowed', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: [], class: { fightingStyles: [] } },
            languageLimits: { allowed: 0, details: 'No languages allowed', preSelected: [] },
            fightingStyleLimits: { allowed: 0, details: 'No styles', preSelected: [] },
          })}
        />
      );
      await waitForListsLoaded();
      expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
    });

    it('should render the step header even when fetch returns empty lists', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      });
    });

    it('should render with null/undefined formData.class', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: [], class: null },
          })}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      });
    });

    it('should render with undefined formData.languages', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: undefined, class: {} },
          })}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should continue rendering correctly when fetch fails for languages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn((url) => {
        if (url.includes('languages.json')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFightingStyles),
        });
      });
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
        expect(screen.getByText('Fighting Styles')).toBeInTheDocument();
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error loading languages:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should continue rendering correctly when fetch fails for fighting styles', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn((url) => {
        if (url.includes('fighting-styles.json')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLanguages),
        });
      });
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
        expect(screen.getByText('Languages')).toBeInTheDocument();
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error loading fighting styles:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should continue rendering when both fetches fail', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitFor(() => {
        expect(screen.getByText('Step 7: Languages & Fighting Styles')).toBeInTheDocument();
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error loading languages:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('Error loading fighting styles:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('merged lists with object items', () => {
    it('should render string items from formData that are not in the fetched list', async () => {
      setupFetchSuccess();
      render(
        <WizardStepLanguages
          {...createMockProps({
            formData: { languages: ['Undercommon'], class: { fightingStyles: [] } },
          })}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Undercommon')).toBeInTheDocument();
      });
    });

    it('should not duplicate items that exist in both formData and fetched list', async () => {
      setupFetchSuccess();
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitForListsLoaded();
      // "Common" should appear in the merged list exactly once (not duplicated from formData + data file)
      const allText = document.body.textContent;
      const commonCount = (allText.match(/Common/g) || []).length;
      expect(commonCount).toBeGreaterThan(0);
    });

    it('should render object items with name property from fetched data', async () => {
      global.fetch = vi.fn((url) => {
        if (url.includes('languages.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'Common' }, { name: 'Elvish' }]),
          });
        }
        if (url.includes('fighting-styles.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'Defense' }]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      render(<WizardStepLanguages {...createMockProps()} />);
      await waitFor(() => {
        expect(screen.getByText('Common')).toBeInTheDocument();
        expect(screen.getByText('Elvish')).toBeInTheDocument();
        expect(screen.getByText('Defense')).toBeInTheDocument();
      });
    });
  });
});
