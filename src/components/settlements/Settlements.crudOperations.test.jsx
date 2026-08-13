import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store — vi.mock captures this object by reference.
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

describe('Settlements - CRUD operations (behavioral)', () => {
  const campaignName = 'test-campaign';

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    settlementMockStore.saveItems.mockResolvedValue(undefined);
    settlementMockStore.deleteItem.mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('settlement-descriptions.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
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

  describe('Service CRUD', () => {
    it('adds a service row and shows the remove button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      expect(screen.getByTitle('Remove service')).toBeInTheDocument();
    });

    it('removes a service row when its remove button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      const addSvcBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addSvcBtn);
      fireEvent.click(addSvcBtn);

      expect(screen.getAllByTitle('Remove service').length).toBe(2);
      fireEvent.click(screen.getAllByTitle('Remove service')[0]);
      expect(screen.queryAllByTitle('Remove service').length).toBe(1);
    });

    it('removing the last service hides all service fields', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add service/i }));

      expect(screen.queryByPlaceholderText('Business name')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Remove service'));
      expect(screen.queryByPlaceholderText('Business name')).not.toBeInTheDocument();
    });
  });

  describe('NPC CRUD', () => {
    it('adds an NPC row and shows the remove button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add npc/i }));
      expect(screen.getByTitle('Remove NPC')).toBeInTheDocument();
    });

    it('removes an NPC row when its remove button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      expect(screen.getAllByTitle('Remove NPC').length).toBe(2);
      fireEvent.click(screen.getAllByTitle('Remove NPC')[0]);
      expect(screen.queryAllByTitle('Remove NPC').length).toBe(1);
    });

    it('removing the last NPC hides all NPC fields', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add npc/i }));

      expect(screen.queryByPlaceholderText('NPC name')).toBeInTheDocument();
      fireEvent.click(screen.getAllByTitle('Remove NPC')[0]);
      expect(screen.queryByPlaceholderText('NPC name')).not.toBeInTheDocument();
    });
  });

  describe('Rumor CRUD', () => {
    it('adds a rumor row and shows the remove button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add rumor/i }));
      expect(screen.getByTitle('Remove rumor')).toBeInTheDocument();
    });

    it('removes a rumor row when its remove button is clicked', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);

      expect(screen.getAllByTitle('Remove rumor').length).toBe(2);
      fireEvent.click(screen.getAllByTitle('Remove rumor')[0]);
      expect(screen.queryAllByTitle('Remove rumor').length).toBe(1);
    });

    it('removing the last rumor hides all rumor fields', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
      fireEvent.click(screen.getByRole('button', { name: /add rumor/i }));

      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length).toBe(1);
      fireEvent.click(screen.getByTitle('Remove rumor'));
      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length).toBe(0);
    });
  });
});
