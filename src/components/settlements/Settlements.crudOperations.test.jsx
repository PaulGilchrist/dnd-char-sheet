// @improved-by-ai
// Basic row-level CRUD for the NEW settlement modal (adding a service/NPC/rumor
// row, removing it, and the last-row-hides-the-section behavior) is fully
// covered in Settlements.serviceNPCRumor.test.jsx. This file intentionally
// avoids duplicating those cases and instead covers the CRUD gaps left open
// there: row manipulation while editing an existing settlement, removal that
// targets the correct row when multiple rows of mixed types exist, removal
// when rows contain identical content, and draft-discard semantics.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store for useEntityManagement — vi.mock captures this
// object by reference. Tests mutate its `items` field before rendering so the
// component reads fresh state.
const settlementMockStore = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
  saveItems: vi.fn(),
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

const openEditSettlement = () => {
  fireEvent.click(screen.getByRole('button', { name: /edit settlement/i }));
};

describe('Settlements - CRUD operations (behavioral)', () => {
  const campaignName = 'test-campaign';

  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    // The component fetches settlement-descriptions.json on mount; no test here
    // changes the size select, so the response body is irrelevant.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Row CRUD while editing an existing settlement', () => {
    it('adds new rows of every type without disturbing the pre-existing rows', () => {
      settlementMockStore.items = [
        makeSettlement('Old Town', {
          services: [{ type: 'inn', name: 'The Rusty Anchor', description: '' }],
          notableNPCs: [{ name: 'Mayor Aldric', role: 'Mayor', description: '' }],
          rumors: ['The sewers are haunted'],
        }),
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      openEditSettlement();

      fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      fireEvent.click(screen.getByRole('button', { name: /add npc/i }));
      fireEvent.click(screen.getByRole('button', { name: /add rumor/i }));

      const serviceNames = screen.getAllByPlaceholderText('Business name');
      expect(serviceNames).toHaveLength(2);
      expect(serviceNames[0]).toHaveValue('The Rusty Anchor');

      // Comboboxes: size + one service type per service row. The appended row
      // must default to tavern, as it does in the new-settlement modal.
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes).toHaveLength(3);
      expect(comboboxes[2]).toHaveValue('tavern');

      const npcNames = screen.getAllByPlaceholderText('NPC name');
      expect(npcNames).toHaveLength(2);
      expect(npcNames[0]).toHaveValue('Mayor Aldric');

      const rumors = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(rumors).toHaveLength(2);
      expect(rumors[0]).toHaveValue('The sewers are haunted');
    });

    it('removes only the targeted pre-existing row, leaving siblings and other row types intact', () => {
      settlementMockStore.items = [
        makeSettlement('Old Town', {
          services: [
            { type: 'inn', name: 'The Rusty Anchor', description: '' },
            { type: 'blacksmith', name: 'Ironworks', description: '' },
          ],
          notableNPCs: [{ name: 'Mayor Aldric', role: 'Mayor', description: '' }],
        }),
      ];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      openEditSettlement();

      fireEvent.click(screen.getAllByTitle('Remove service')[1]);

      const remainingServices = screen.getAllByPlaceholderText('Business name');
      expect(remainingServices).toHaveLength(1);
      expect(remainingServices[0]).toHaveValue('The Rusty Anchor');

      expect(screen.getAllByPlaceholderText('NPC name')).toHaveLength(1);
      expect(screen.getByDisplayValue('Mayor Aldric')).toBeInTheDocument();
    });
  });

  describe('Row removal edge cases', () => {
    it('removes exactly one row when two rows contain identical content', () => {
      settlementMockStore.items = [makeSettlement('Old Town')];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      openEditSettlement();

      const addServiceBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addServiceBtn);
      fireEvent.click(addServiceBtn);

      const nameInputs = screen.getAllByPlaceholderText('Business name');
      fireEvent.change(nameInputs[0], { target: { value: 'The Twin Tavern' } });
      fireEvent.change(nameInputs[1], { target: { value: 'The Twin Tavern' } });

      fireEvent.click(screen.getAllByTitle('Remove service')[1]);

      const remaining = screen.getAllByPlaceholderText('Business name');
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toHaveValue('The Twin Tavern');
    });
  });

  describe('Draft lifecycle', () => {
    it('discards unsaved row edits when the modal is closed and reopened', () => {
      settlementMockStore.items = [makeSettlement('Old Town')];
      render(<Settlements campaignName={campaignName} onBack={() => {}} />);
      openEditSettlement();

      fireEvent.click(screen.getByRole('button', { name: /add service/i }));
      expect(screen.queryByPlaceholderText('Business name')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      openEditSettlement();

      expect(screen.queryByPlaceholderText('Business name')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Old Town')).toBeInTheDocument();
    });
  });
});
