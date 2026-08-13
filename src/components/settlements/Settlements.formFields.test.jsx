import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store captured by vi.mock closure.
const settlementMockStore = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
  saveItems: vi.fn(),
  deleteItem: vi.fn(),
};

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: vi.fn(() => settlementMockStore),
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

describe('Settlements - form field changes (behavioral)', () => {
  const campaignName = 'test-campaign';

  const descriptionsData = {
    village: {
      descriptions: ['A quiet village', 'A small farming village'],
      atmospheres: ['Peaceful', 'Rustic'],
      governments: ['Village council'],
      threats: ['Wild animals'],
      features: ['A small pond'],
    },
    town: {
      descriptions: ['A bustling town'],
      atmospheres: ['Lively'],
      governments: ['Mayor'],
      threats: ['Bandits'],
      features: ['A market square'],
    },
    city: {
      descriptions: ['A great city'],
      atmospheres: ['Cosmopolitan'],
      governments: ['City council'],
      threats: ['Crime'],
      features: ['A grand plaza'],
    },
    metropolis: {
      descriptions: ['A vast metropolis'],
      atmospheres: ['Diverse'],
      governments: ['Duke'],
      threats: ['Political intrigue'],
      features: ['A massive wall'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('settlement-descriptions.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(descriptionsData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Size field behavior', () => {
    it('auto-populates population, description, atmosphere, government, and threat when size changes', async () => {
      // Override Math.random to get deterministic picks (index 0.5 -> second item)
      const originalRandom = globalThis.Math.random;
      globalThis.Math.random = () => 0.5;

      // Pre-populate descDataRef by rendering and waiting for the fetch to complete
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);

      // Let the useEffect fetch complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const sizeSelect = screen.getByRole('combobox', { name: /size/i });
      fireEvent.change(sizeSelect, { target: { value: 'town' } });

      const popInput = screen.getByPlaceholderText(/souls/i);
      expect(popInput.value).toContain('souls');

      // descDataRef is populated asynchronously via fetch; wait for it
      await waitFor(() => {
        const descTextarea = screen.getByTestId('preview-toggle-settlement-description');
        expect(descTextarea.value).toBe('A bustling town');
      });

      await waitFor(() => {
        const atmTextarea = screen.getByTestId('preview-toggle-settlement-atmosphere');
        expect(atmTextarea.value).toBe('Lively');
      });

      await waitFor(() => {
        const govTextarea = screen.getByTestId('preview-toggle-settlement-government');
        expect(govTextarea.value).toBe('Mayor');
      });

      // Threat PreviewToggle should appear when threat is auto-populated
      await waitFor(() => {
        expect(screen.getByText(/threats/i)).toBeInTheDocument();
      });

      globalThis.Math.random = originalRandom;
    });

    it('auto-populates fields for each size option', () => {
      const originalRandom = globalThis.Math.random;
      globalThis.Math.random = () => 0;

      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const sizeSelect = screen.getByRole('combobox', { name: /size/i });

      // Test village
      fireEvent.change(sizeSelect, { target: { value: 'village' } });
      const popInput = screen.getByPlaceholderText(/souls/i);
      expect(popInput.value).toContain('souls');

      // Test metropolis
      fireEvent.change(sizeSelect, { target: { value: 'metropolis' } });
      expect(popInput.value).toContain('souls');

      globalThis.Math.random = originalRandom;
    });
  });

  describe('Name field validation', () => {
    it('disables save button when name is empty', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();
    });

    it('enables save button when name has content', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeEnabled();
    });

    it('prevents save when name is only whitespace', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: '   ' } });

      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();
    });
  });

  describe('Threat field visibility', () => {
    it('hides threat PreviewToggle when threat is empty (new settlement)', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      expect(screen.queryByText(/threats/i)).not.toBeInTheDocument();
    });

    it('shows threat PreviewToggle when editing a settlement with a threat', () => {
      settlementMockStore.items = [
        { name: 'Threat Town', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: 'Bandits' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);

      const settlementItem = screen.getByRole('button', { name: /edit settlement/i });
      fireEvent.click(settlementItem);

      expect(screen.getByText(/threats/i)).toBeInTheDocument();
    });

    it('hides threat PreviewToggle when editing a settlement without a threat', () => {
      settlementMockStore.items = [
        { name: 'Safe Town', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);

      const settlementItem = screen.getByRole('button', { name: /edit settlement/i });
      fireEvent.click(settlementItem);

      expect(screen.queryByText(/threats/i)).not.toBeInTheDocument();
    });

    it('updates threat value via PreviewToggle when present', () => {
      settlementMockStore.items = [
        { name: 'Threat Town', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: 'Bandits' },
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);

      const settlementItem = screen.getByRole('button', { name: /edit settlement/i });
      fireEvent.click(settlementItem);

      const threatTextarea = screen.getByTestId('preview-toggle-settlement-threat');
      fireEvent.change(threatTextarea, { target: { value: 'Dragon sightings' } });
      expect(threatTextarea.value).toBe('Dragon sightings');
    });
  });

  describe('PreviewToggle fields update', () => {
    it('updates government value via PreviewToggle', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const govTextarea = screen.getByTestId('preview-toggle-settlement-government');
      fireEvent.change(govTextarea, { target: { value: 'Monarchy ruled by Queen Elara' } });
      expect(govTextarea.value).toBe('Monarchy ruled by Queen Elara');
    });

    it('updates description value via PreviewToggle', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const descTextarea = screen.getByTestId('preview-toggle-settlement-description');
      fireEvent.change(descTextarea, { target: { value: 'A bustling port town' } });
      expect(descTextarea.value).toBe('A bustling port town');
    });

    it('updates atmosphere value via PreviewToggle', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const atmTextarea = screen.getByTestId('preview-toggle-settlement-atmosphere');
      fireEvent.change(atmTextarea, { target: { value: 'Vibrant and colorful' } });
      expect(atmTextarea.value).toBe('Vibrant and colorful');
    });

    it('updates notes value via PreviewToggle', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const notesTextarea = screen.getByTestId('preview-toggle-settlement-notes');
      fireEvent.change(notesTextarea, { target: { value: 'GM note: important quest location' } });
      expect(notesTextarea.value).toBe('GM note: important quest location');
    });
  });

  describe('Tags and population fields', () => {
    it('updates population value', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const popInput = screen.getByPlaceholderText(/souls/i);
      fireEvent.change(popInput, { target: { value: '5,000 souls' } });
      expect(popInput.value).toBe('5,000 souls');
    });

    it('updates tags value', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const tagsInput = screen.getByLabelText(/tags/i);
      fireEvent.change(tagsInput, { target: { value: 'coastal, trade, dwarven' } });
      expect(tagsInput.value).toBe('coastal, trade, dwarven');
    });
  });
});
