// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settlements from './Settlements.jsx';
import { generateSettlement } from '../../services/campaign/settlementGenerator.js';

// Module-level mock store captured by the vi.mock factory. Tests mutate its
// `items`/`loading` fields before rendering so the component reads fresh state.
const settlementMockStore = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
  deleteItem: vi.fn(),
};

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: () => settlementMockStore,
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
  generateSettlement: vi.fn(),
}));

const makeSettlement = (name, overrides = {}) => ({
  name,
  size: 'village',
  population: '',
  tags: '',
  services: [],
  description: '',
  atmosphere: '',
  government: '',
  notableNPCs: [],
  rumors: [],
  notes: '',
  threat: '',
  ...overrides,
});

describe('Settlements - modal actions', () => {
  const campaignName = 'test-campaign';

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    settlementMockStore.deleteItem.mockResolvedValue(undefined);
    vi.mocked(generateSettlement).mockResolvedValue(makeSettlement('Generated Town', {
      size: 'town',
      description: 'A bustling town',
      atmosphere: 'Lively',
      government: 'Council',
      population: '1,500 souls',
      tags: 'generated',
      threat: 'Bandits',
    }));
    // Mock the descriptions data fetch; everything else stays inert.
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('settlement-descriptions.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            village: { descriptions: ['A quiet village.'], atmospheres: ['Peaceful'], governments: ['Elder Council'], threats: ['Wild animals'], features: [] },
            town: { descriptions: ['A busy town.'], atmospheres: ['Bustling'], governments: ['Mayor'], threats: ['Bandits'], features: [] },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('List view', () => {
    it('shows a loading state while settlements are being fetched', () => {
      settlementMockStore.loading = true;
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText(/loading settlements/i)).toBeInTheDocument();
      expect(screen.queryByText(/no settlements yet/i)).not.toBeInTheDocument();
    });

    it('shows the empty state when there are no settlements', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByText(/no settlements yet/i)).toBeInTheDocument();
    });

    it('shows the filters message instead of the empty state when a search matches nothing', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.change(screen.getByLabelText('Search settlements'), { target: { value: 'nonexistent' } });
      expect(screen.getByText(/no settlements found matching your filters/i)).toBeInTheDocument();
      expect(screen.queryByText(/no settlements yet/i)).not.toBeInTheDocument();
    });

    it('clears the search query when the clear button is clicked', () => {
      settlementMockStore.items = [makeSettlement('Fireport'), makeSettlement('Hollow Oak')];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.change(screen.getByLabelText('Search settlements'), { target: { value: 'fire' } });
      expect(screen.queryByText('Hollow Oak')).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(screen.getByText('Hollow Oak')).toBeInTheDocument();
    });
  });

  describe('New settlement modal', () => {
    it('opens the new settlement modal when "New Settlement" is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
    });

    it('closes the new settlement modal when cancel is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
    });

    it('closes the new settlement modal when the close button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
    });
  });

  describe('Edit settlement modal', () => {
    it('opens the edit modal with the settlement data prefilled when a list item is clicked', () => {
      settlementMockStore.items = [makeSettlement('Old Town', { size: 'town', population: '2,500 souls' })];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /edit settlement: old town/i }));
      expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /name\s?\*/i })).toHaveValue('Old Town');
      expect(screen.getByRole('combobox', { name: /size/i })).toHaveValue('town');
    });

    it('shows the delete button only when editing an existing settlement', () => {
      settlementMockStore.items = [makeSettlement('Old Town')];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit settlement: old town/i }));
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('Generate settlement', () => {
    it('disables the generate button while generating and re-enables it when done', async () => {
      let resolveGenerate;
      vi.mocked(generateSettlement).mockImplementationOnce(() => new Promise((resolve) => {
        resolveGenerate = resolve;
      }));

      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const generateBtn = screen.getByRole('button', { name: /generate settlement/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(generateBtn).toBeDisabled();
      });
      expect(generateBtn).toHaveTextContent('Generating…');

      resolveGenerate(makeSettlement('Generated Town'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
      });
      expect(generateBtn).toBeEnabled();
      expect(generateBtn).toHaveTextContent('Generate Settlement');
    });
  });
});
