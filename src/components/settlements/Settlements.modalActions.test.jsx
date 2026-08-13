import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store that vi.mock captures at import time.
// We replace the entire module mock in each test via vi.doMock + dynamic import,
// but since this file uses static imports, we rely on vi.clearAllMocks + resetting
// the mock implementation in beforeEach.
const settlementMockReturn = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
  saveItems: vi.fn(),
  deleteItem: vi.fn(),
};

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: vi.fn(() => settlementMockReturn),
}));

vi.mock('../common/PreviewToggle.jsx', () => ({
  default: function PreviewToggle({ value, onChange, placeholder, label, id }) {
    return (
      <div className="preview-toggle-wrapper">
        {label && <label htmlFor={id}>{label}</label>}
        <textarea
          data-testid={`preview-toggle-${id}`}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  },
}));

vi.mock('../../services/campaign/settlementGenerator.js', () => ({
  generateSettlement: vi.fn().mockResolvedValue({
    name: 'Generated Town',
    size: 'town',
    description: 'A bustling town',
    atmosphere: 'Lively',
    government: 'Council',
    population: '1,500 souls',
    services: [],
    notableNPCs: [],
    rumors: [],
    tags: 'generated',
    notes: '',
    threat: 'Bandits',
  }),
}));

describe('Settlements - modal actions and behavior', () => {
  const campaignName = 'test-campaign';

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockReturn.items = [];
    settlementMockReturn.loading = false;
    settlementMockReturn.loadItems.mockResolvedValue(undefined);
    settlementMockReturn.deleteItem.mockResolvedValue(undefined);
    // Mock fetch for settlement-descriptions.json and API calls
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('settlement-descriptions.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            village: {
              descriptions: ['A quiet village.', 'Small farming community.'],
              atmospheres: ['Peaceful', 'Rustic'],
              governments: ['Elder Council'],
              threats: ['Wild animals'],
              features: [],
            },
            town: {
              descriptions: ['A busy town.'],
              atmospheres: ['Bustling'],
              governments: ['Mayor'],
              threats: ['Bandits'],
              features: [],
            },
          }),
        });
      }
      // Default: handle API calls (save, delete, load)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('List view', () => {
    it('shows loading spinner when loading settlements', () => {
      settlementMockReturn.loading = true;
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText(/loading settlements/i)).toBeInTheDocument();
      expect(screen.queryByText(/no settlements yet/i)).not.toBeInTheDocument();
    });

    it('shows empty state when no settlements exist', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText(/no settlements yet/i)).toBeInTheDocument();
    });

    it('renders settlement list items when settlements exist', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
        { name: 'Hollow Oak', size: 'village', population: '100 souls', tags: '', services: [], description: 'A quiet village.' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText('Fireport')).toBeInTheDocument();
      expect(screen.getByText('Hollow Oak')).toBeInTheDocument();
    });

    it('filters settlements by search query', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
        { name: 'Hollow Oak', size: 'village', population: '100 souls', tags: '', services: [], description: 'A quiet village.' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const searchInput = screen.getByLabelText('Search settlements');
      fireEvent.change(searchInput, { target: { value: 'fire' } });
      expect(screen.getByText('Fireport')).toBeInTheDocument();
      expect(screen.queryByText('Hollow Oak')).not.toBeInTheDocument();
    });

    it('shows no results message when search yields no matches', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const searchInput = screen.getByLabelText('Search settlements');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText(/no settlements found matching your filters/i)).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
        { name: 'Hollow Oak', size: 'village', population: '100 souls', tags: '', services: [], description: 'A quiet village.' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const searchInput = screen.getByLabelText('Search settlements');
      fireEvent.change(searchInput, { target: { value: 'fire' } });
      expect(screen.queryByText('Hollow Oak')).not.toBeInTheDocument();
      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn);
      expect(screen.getByText('Hollow Oak')).toBeInTheDocument();
    });

    it('filters settlements by size button', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
        { name: 'Hollow Oak', size: 'village', population: '100 souls', tags: '', services: [], description: 'A quiet village.' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const townBtn = screen.getByTitle('Filter: Town');
      fireEvent.click(townBtn);
      expect(screen.getByText('Fireport')).toBeInTheDocument();
      expect(screen.queryByText('Hollow Oak')).not.toBeInTheDocument();
    });

    it('removes size filter when the same size button is clicked again', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
        { name: 'Hollow Oak', size: 'village', population: '100 souls', tags: '', services: [], description: 'A quiet village.' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const townBtn = screen.getByTitle('Filter: Town');
      fireEvent.click(townBtn);
      expect(screen.getByText('Fireport')).toBeInTheDocument();
      fireEvent.click(townBtn);
      expect(screen.getByText('Hollow Oak')).toBeInTheDocument();
    });

    it('shows combined search and size filter no results', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const townBtn = screen.getByTitle('Filter: Town');
      fireEvent.click(townBtn);
      const searchInput = screen.getByLabelText('Search settlements');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText(/no settlements found matching your filters/i)).toBeInTheDocument();
    });
  });

  describe('New settlement modal', () => {
    it('opens new settlement modal when new settlement button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
    });

    it('shows delete button only when editing an existing settlement', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('shows cancel button in modal footer', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('closes modal when cancel button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
    });

    it('shows close button (X) in modal header', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('closes modal when close button (X) is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
    });

    it('disables save button when name is empty', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();
    });

    it('enables save button when name is entered', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'New Town' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeEnabled();
    });

    it('saves a new settlement when save is clicked with a name', async () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'New Town' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      // Verify save button shows loading state
      await waitFor(() => {
        expect(saveBtn).toHaveTextContent('Saving');
      });
      // Verify modal closes after save completes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit settlement modal', () => {
    it('opens edit modal when a settlement list item is clicked', () => {
      settlementMockReturn.items = [
        { name: 'Old Town', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: old town/i });
      fireEvent.click(settlementItem);
      expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
    });

    it('shows delete button when editing an existing settlement', () => {
      settlementMockReturn.items = [
        { name: 'Old Town', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: old town/i });
      fireEvent.click(settlementItem);
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not delete when user cancels confirmation dialog', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      settlementMockReturn.items = [
        { name: 'Keep Me', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: keep me/i });
      fireEvent.click(settlementItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtn);
      expect(confirmSpy).toHaveBeenCalledWith('Delete this settlement?');
      expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
    });

    it('deletes when user confirms confirmation dialog', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      settlementMockReturn.items = [
        { name: 'Delete Me', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: delete me/i });
      fireEvent.click(settlementItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('Delete this settlement?');
      });
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Settlement' })).not.toBeInTheDocument();
      });
    });

    it('shows deleting state text during delete', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      settlementMockReturn.items = [
        { name: 'Deleting...', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      settlementMockReturn.deleteItem.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: deleting/i });
      fireEvent.click(settlementItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtn);
      expect(screen.getByText('Deleting…')).toBeInTheDocument();
    });
  });

  describe('Generate settlement', () => {
    it('shows generate button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByRole('button', { name: /generate settlement/i })).toBeInTheDocument();
    });

    it('opens new modal with generated data when generate is clicked', async () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const generateBtn = screen.getByRole('button', { name: /generate settlement/i });
      fireEvent.click(generateBtn);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
      });
    });

    it('disables generate button while generating', async () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const generateBtn = screen.getByRole('button', { name: /generate settlement/i });
      fireEvent.click(generateBtn);
      await waitFor(() => {
        expect(generateBtn).toBeDisabled();
      });
    });
  });

  describe('Settlement list item rendering', () => {
    it('renders size badge with icon for each settlement', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText('town')).toBeInTheDocument();
    });

    it('renders service count when settlement has services', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [{ type: 'inn', name: 'The Inn', description: '' }], description: 'A town of fire' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText('1 service')).toBeInTheDocument();
    });

    it('renders tags when present', () => {
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal, trade-hub', services: [], description: 'A town of fire' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText('coastal, trade-hub')).toBeInTheDocument();
    });

    it('truncates long descriptions with ellipsis', () => {
      const longDesc = 'A very long description that exceeds one hundred and twenty characters in total length so that we can test the truncation behavior.';
      settlementMockReturn.items = [
        { name: 'Fireport', size: 'town', population: '1,500 souls', tags: '', services: [], description: longDesc },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const preview = screen.getByText(/A very long description/);
      expect(preview.textContent).toContain('…');
      expect(preview.textContent).not.toContain(longDesc);
    });
  });
});
