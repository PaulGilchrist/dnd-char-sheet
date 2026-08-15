// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

const campaignName = 'test-campaign';

// Served by the mocked fetch. Every test pins Math.random to 0, so `pick`
// always selects index 0, making the expected values below exact and deterministic.
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

// Expected auto-populated values per size when Math.random returns 0.
const SIZE_CASES = [
  { size: 'village', population: '50-100 souls', description: 'A quiet village', atmosphere: 'Peaceful', government: 'Village council', threat: 'Wild animals' },
  { size: 'town', population: '800-1,500 souls', description: 'A bustling town', atmosphere: 'Lively', government: 'Mayor', threat: 'Bandits' },
  { size: 'city', population: '5,000-12,000 souls', description: 'A great city', atmosphere: 'Cosmopolitan', government: 'City council', threat: 'Crime' },
  { size: 'metropolis', population: '50,000-100,000 souls', description: 'A vast metropolis', atmosphere: 'Diverse', government: 'Duke', threat: 'Political intrigue' },
];

const makeSettlement = (overrides = {}) => ({
  name: 'Safe Town',
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

let fetchMock;

const renderSettlements = () => render(<Settlements campaignName={campaignName} onBack={() => {}} />);
const openNewSettlementModal = () => {
  fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
};
const openEditSettlement = (name) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`edit settlement: ${name}`, 'i') }));
};

// The component fetches settlement-descriptions.json in a mount effect and stores
// it in a ref. The ref is only read when the size select changes, so flushing
// pending microtasks guarantees the mocked fetch has resolved first.
const flushDescriptionsFetch = () => act(async () => {});

describe('Settlements - form fields (behavioral)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('settlement-descriptions.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(descriptionsData) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Size auto-population', () => {
    it.each(SIZE_CASES)(
      'auto-populates population, description, atmosphere, government, and threat for $size',
      async ({ size, population, description, atmosphere, government, threat }) => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        renderSettlements();
        await flushDescriptionsFetch();
        openNewSettlementModal();

        fireEvent.change(screen.getByRole('combobox', { name: /size/i }), { target: { value: size } });

        expect(screen.getByLabelText('Population')).toHaveValue(population);
        expect(screen.getByPlaceholderText(/describe what the settlement looks/i)).toHaveValue(description);
        expect(screen.getByPlaceholderText(/mood and ambiance/i)).toHaveValue(atmosphere);
        expect(screen.getByPlaceholderText(/how is this settlement governed/i)).toHaveValue(government);
        expect(screen.getByPlaceholderText(/current dangers or tensions/i)).toHaveValue(threat);
      },
    );

    it('preserves a user-typed name when the size is changed', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      renderSettlements();
      await flushDescriptionsFetch();
      openNewSettlementModal();

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My Village' } });
      fireEvent.change(screen.getByRole('combobox', { name: /size/i }), { target: { value: 'city' } });

      expect(screen.getByLabelText(/name/i)).toHaveValue('My Village');
      expect(screen.getByLabelText('Population')).toHaveValue('5,000-12,000 souls');
    });

    it('replaces previously auto-populated values when the size is changed again', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      renderSettlements();
      await flushDescriptionsFetch();
      openNewSettlementModal();

      const sizeSelect = screen.getByRole('combobox', { name: /size/i });
      fireEvent.change(sizeSelect, { target: { value: 'village' } });
      expect(screen.getByPlaceholderText(/describe what the settlement looks/i)).toHaveValue('A quiet village');

      fireEvent.change(sizeSelect, { target: { value: 'metropolis' } });
      expect(screen.getByPlaceholderText(/describe what the settlement looks/i)).toHaveValue('A vast metropolis');
      expect(screen.getByLabelText('Population')).toHaveValue('50,000-100,000 souls');
    });

    it('reveals the threat field once a size change auto-populates a threat', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      renderSettlements();
      await flushDescriptionsFetch();
      openNewSettlementModal();

      expect(screen.queryByPlaceholderText(/current dangers or tensions/i)).not.toBeInTheDocument();

      fireEvent.change(screen.getByRole('combobox', { name: /size/i }), { target: { value: 'city' } });

      expect(screen.getByPlaceholderText(/current dangers or tensions/i)).toHaveValue('Crime');
    });

    it('still fills population from built-in ranges when description data is not available', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      vi.spyOn(Math, 'random').mockReturnValue(0);
      renderSettlements();
      await flushDescriptionsFetch();
      openNewSettlementModal();

      fireEvent.change(screen.getByRole('combobox', { name: /size/i }), { target: { value: 'town' } });

      expect(screen.getByLabelText('Population')).toHaveValue('800-1,500 souls');
      expect(screen.getByPlaceholderText(/describe what the settlement looks/i)).toHaveValue('');
      expect(screen.queryByPlaceholderText(/current dangers or tensions/i)).not.toBeInTheDocument();
    });
  });

  describe('Name field validation', () => {
    it('disables save when the name is empty', () => {
      renderSettlements();
      openNewSettlementModal();

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('enables save when the name has content', () => {
      renderSettlements();
      openNewSettlementModal();

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My Settlement' } });

      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('treats a name with surrounding whitespace as valid (trimmed)', () => {
      renderSettlements();
      openNewSettlementModal();

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '  My Settlement  ' } });

      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });
  });

  describe('Threat field while editing', () => {
    it('keeps the threat field hidden when editing a settlement that has no threat', () => {
      settlementMockStore.items = [makeSettlement()];
      renderSettlements();
      openEditSettlement('Safe Town');

      expect(screen.queryByPlaceholderText(/current dangers or tensions/i)).not.toBeInTheDocument();
    });
  });

  describe('PreviewToggle fields', () => {
    it.each([
      { field: 'government', placeholder: /how is this settlement governed/i, value: 'Monarchy ruled by Queen Elara' },
      { field: 'description', placeholder: /describe what the settlement looks/i, value: 'A bustling port town' },
      { field: 'atmosphere', placeholder: /mood and ambiance/i, value: 'Vibrant and colorful' },
      { field: 'notes', placeholder: /additional gm notes/i, value: 'GM note: important quest location' },
    ])('updates the $field field through its PreviewToggle', ({ placeholder, value }) => {
      renderSettlements();
      openNewSettlementModal();

      const textarea = screen.getByPlaceholderText(placeholder);
      fireEvent.change(textarea, { target: { value } });

      expect(textarea).toHaveValue(value);
    });
  });

  describe('Plain input fields', () => {
    it('updates the population input', () => {
      renderSettlements();
      openNewSettlementModal();

      const populationInput = screen.getByLabelText('Population');
      fireEvent.change(populationInput, { target: { value: '5,000 souls' } });

      expect(populationInput).toHaveValue('5,000 souls');
    });

    it('updates the tags input', () => {
      renderSettlements();
      openNewSettlementModal();

      const tagsInput = screen.getByLabelText(/tags/i);
      fireEvent.change(tagsInput, { target: { value: 'coastal, trade, dwarven' } });

      expect(tagsInput).toHaveValue('coastal, trade, dwarven');
    });
  });
});
