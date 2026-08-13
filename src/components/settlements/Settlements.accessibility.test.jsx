import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settlements from './Settlements.jsx';

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

describe('Settlements - accessibility and keyboard', () => {
  const campaignName = 'test-campaign';

  const settlementsWithItems = [
    { name: 'Fireport', size: 'town', population: '1,500 souls', tags: 'coastal', services: [], description: 'A town of fire' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ARIA labels on interactive elements', () => {
    it('provides aria-label on the back button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const backBtn = screen.getByRole('button', { name: /back/i });
      expect(backBtn).toHaveTextContent('Back');
    });

    it('provides aria-label on the search input', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const searchInput = screen.getByLabelText('Search settlements');
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('provides aria-label on the search clear button when search is active', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const searchInput = screen.getByLabelText('Search settlements');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toHaveAttribute('aria-label');
    });

    it('provides visible text on the new settlement button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      expect(newBtn).toHaveTextContent('New Settlement');
    });

    it('provides visible text on the generate settlement button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const genBtn = screen.getByRole('button', { name: /generate settlement/i });
      expect(genBtn).toHaveTextContent('Generate Settlement');
    });

    it('provides aria-label on the modal close button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      const closeBtn = screen.getByLabelText('Close');
      expect(closeBtn).toHaveAttribute('aria-label');
    });
  });

  describe('Keyboard activation of settlement list items', () => {
    beforeEach(() => {
      settlementMockStore.items = settlementsWithItems;
    });

    it('opens edit modal when a settlement list item is activated with Enter', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      fireEvent.keyDown(settlementItem, { key: 'Enter' });
      expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
    });

    it('opens edit modal when a settlement list item is activated with Space', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      fireEvent.keyDown(settlementItem, { key: ' ' });
      expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
    });

    it('does not open modal when pressing other keys on a settlement list item', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      fireEvent.keyDown(settlementItem, { key: 'Delete' });
      expect(screen.queryByRole('heading', { name: 'Edit Settlement' })).not.toBeInTheDocument();
    });
  });

  describe('Settlement list item keyboard attributes', () => {
    beforeEach(() => {
      settlementMockStore.items = settlementsWithItems;
    });

    it('gives settlement list items a tabindex of 0', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      expect(settlementItem).toHaveAttribute('tabindex', '0');
    });

    it('gives settlement list items a role of button', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      expect(settlementItem).toHaveAttribute('role', 'button');
    });

    it('gives settlement list items an aria-label describing the action', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const settlementItem = screen.getByRole('button', { name: /edit settlement: fireport/i });
      expect(settlementItem).toHaveAttribute('aria-label', 'Edit settlement: Fireport');
    });
  });

  describe('Modal autofocus', () => {
    it('auto-focuses the name input when the new settlement modal opens', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      const newBtn = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(newBtn);
      const nameInput = screen.getByLabelText(/name/i);
      expect(document.activeElement).toBe(nameInput);
    });
  });

  describe('Size filter button accessibility', () => {
    it('provides aria labels via title on size filter buttons', () => {
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      expect(screen.getByTitle('Filter: Village')).toBeInTheDocument();
      expect(screen.getByTitle('Filter: Town')).toBeInTheDocument();
      expect(screen.getByTitle('Filter: City')).toBeInTheDocument();
      expect(screen.getByTitle('Filter: Metropolis')).toBeInTheDocument();
    });
  });

  describe('Back button functionality', () => {
    it('calls onBack when the back button is clicked', () => {
      const onBack = vi.fn();
      render(<Settlements campaignName={campaignName} onBack={onBack} />);
      const backBtn = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    });
  });
});
