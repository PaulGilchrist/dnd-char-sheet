// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store for useEntityManagement — vi.mock captures this object
// by reference. Tests mutate its `items` field before rendering so the component
// reads fresh state.
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

const openNewSettlementModal = () => {
  fireEvent.click(screen.getByRole('button', { name: /new settlement/i }));
};

describe('Settlements - service, NPC, and rumor rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Add buttons', () => {
    it('renders add buttons for services, NPCs, and rumors in the new settlement modal', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add npc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add rumor/i })).toBeInTheDocument();
    });

    it('starts with no service, NPC, or rumor rows in the new settlement modal', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      expect(screen.queryByPlaceholderText('Business name')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('NPC name')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/)).toHaveLength(0);
      expect(screen.queryByTitle('Remove service')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Remove NPC')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Remove rumor')).not.toBeInTheDocument();
    });
  });

  describe('Service rows', () => {
    it('keeps each service row independent when edited, and preserves the others when the middle row is removed', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addServiceBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addServiceBtn);
      fireEvent.click(addServiceBtn);
      fireEvent.click(addServiceBtn);

      const nameInputs = screen.getAllByPlaceholderText('Business name');
      expect(nameInputs).toHaveLength(3);
      fireEvent.change(nameInputs[0], { target: { value: 'First Inn' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Second Smithy' } });
      fireEvent.change(nameInputs[2], { target: { value: 'Third Shop' } });

      expect(nameInputs[0].value).toBe('First Inn');
      expect(nameInputs[1].value).toBe('Second Smithy');
      expect(nameInputs[2].value).toBe('Third Shop');

      fireEvent.click(screen.getAllByTitle('Remove service')[1]);

      const remainingInputs = screen.getAllByPlaceholderText('Business name');
      expect(remainingInputs).toHaveLength(2);
      expect(remainingInputs[0].value).toBe('First Inn');
      expect(remainingInputs[1].value).toBe('Third Shop');
    });

    it('defaults each new service to a tavern and lets each type select change independently', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addServiceBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addServiceBtn);
      fireEvent.click(addServiceBtn);

      const serviceTypeSelects = screen.getAllByRole('combobox').slice(1);
      expect(serviceTypeSelects).toHaveLength(2);
      expect(serviceTypeSelects[0].value).toBe('tavern');
      expect(serviceTypeSelects[1].value).toBe('tavern');

      fireEvent.change(serviceTypeSelects[0], { target: { value: 'inn' } });
      fireEvent.change(serviceTypeSelects[1], { target: { value: 'bank' } });

      expect(serviceTypeSelects[0].value).toBe('inn');
      expect(serviceTypeSelects[1].value).toBe('bank');
    });

    it('keeps each service description editable independently of the service name', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addServiceBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addServiceBtn);
      fireEvent.click(addServiceBtn);

      const nameInputs = screen.getAllByPlaceholderText('Business name');
      const descTextareas = screen.getAllByPlaceholderText('Description…');
      expect(descTextareas).toHaveLength(2);

      fireEvent.change(nameInputs[0], { target: { value: 'The Broken Wheel' } });
      fireEvent.change(descTextareas[0], { target: { value: 'A creaky inn by the docks' } });
      fireEvent.change(descTextareas[1], { target: { value: 'A forge with a loud bellows' } });

      expect(nameInputs[0].value).toBe('The Broken Wheel');
      expect(descTextareas[0].value).toBe('A creaky inn by the docks');
      expect(descTextareas[1].value).toBe('A forge with a loud bellows');
    });
  });

  describe('NPC rows', () => {
    it('adds multiple independent NPC rows with different names and roles', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      const nameInputs = screen.getAllByPlaceholderText('NPC name');
      const roleInputs = screen.getAllByPlaceholderText(/role/i);
      expect(nameInputs).toHaveLength(3);
      expect(roleInputs).toHaveLength(3);

      fireEvent.change(nameInputs[0], { target: { value: 'Aldric' } });
      fireEvent.change(roleInputs[0], { target: { value: 'Mayor' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Brenna' } });
      fireEvent.change(roleInputs[1], { target: { value: 'Blacksmith' } });
      fireEvent.change(nameInputs[2], { target: { value: 'Cedric' } });
      fireEvent.change(roleInputs[2], { target: { value: 'Priest' } });

      expect(nameInputs[0].value).toBe('Aldric');
      expect(nameInputs[1].value).toBe('Brenna');
      expect(nameInputs[2].value).toBe('Cedric');
      expect(roleInputs[0].value).toBe('Mayor');
      expect(roleInputs[1].value).toBe('Blacksmith');
      expect(roleInputs[2].value).toBe('Priest');
    });

    it('removing a middle NPC shifts the remaining NPCs and preserves their values', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      const nameInputs = screen.getAllByPlaceholderText('NPC name');
      fireEvent.change(nameInputs[0], { target: { value: 'First' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Second' } });
      fireEvent.change(nameInputs[2], { target: { value: 'Third' } });

      fireEvent.click(screen.getAllByTitle('Remove NPC')[1]);

      const remainingInputs = screen.getAllByPlaceholderText('NPC name');
      expect(remainingInputs).toHaveLength(2);
      expect(remainingInputs[0].value).toBe('First');
      expect(remainingInputs[1].value).toBe('Third');
    });

    it('keeps each NPC description editable independently of name and role', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      const nameInputs = screen.getAllByPlaceholderText('NPC name');
      const roleInputs = screen.getAllByPlaceholderText(/role/i);
      const descTextareas = screen.getAllByPlaceholderText('Description…');
      expect(descTextareas).toHaveLength(2);

      fireEvent.change(nameInputs[0], { target: { value: 'Aldric' } });
      fireEvent.change(roleInputs[0], { target: { value: 'Mayor' } });
      fireEvent.change(descTextareas[0], { target: { value: 'Old and shrewd' } });
      fireEvent.change(descTextareas[1], { target: { value: 'Strong as an ox' } });

      expect(nameInputs[0].value).toBe('Aldric');
      expect(roleInputs[0].value).toBe('Mayor');
      expect(descTextareas[0].value).toBe('Old and shrewd');
      expect(descTextareas[1].value).toBe('Strong as an ox');
    });
  });

  describe('Rumor rows', () => {
    it('adds multiple independent rumor rows with different text', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);

      const rumorToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(rumorToggles).toHaveLength(3);

      fireEvent.change(rumorToggles[0], { target: { value: 'Rumor A' } });
      fireEvent.change(rumorToggles[1], { target: { value: 'Rumor B' } });
      fireEvent.change(rumorToggles[2], { target: { value: 'Rumor C' } });

      expect(rumorToggles[0].value).toBe('Rumor A');
      expect(rumorToggles[1].value).toBe('Rumor B');
      expect(rumorToggles[2].value).toBe('Rumor C');
    });

    it('removing a middle rumor shifts the remaining rumors and preserves their text', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);

      const rumorToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      fireEvent.change(rumorToggles[0], { target: { value: 'First Rumor' } });
      fireEvent.change(rumorToggles[1], { target: { value: 'Second Rumor' } });
      fireEvent.change(rumorToggles[2], { target: { value: 'Third Rumor' } });

      fireEvent.click(screen.getAllByTitle('Remove rumor')[1]);

      const remainingToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(remainingToggles).toHaveLength(2);
      expect(remainingToggles[0].value).toBe('First Rumor');
      expect(remainingToggles[1].value).toBe('Third Rumor');
    });
  });

  describe('Editing an existing settlement', () => {
    it('renders the existing services, NPCs, and rumors when a settlement is opened for editing', () => {
      settlementMockStore.items = [
        makeSettlement('Old Town', {
          services: [
            { type: 'inn', name: 'The Rusty Anchor', description: 'A fine inn' },
            { type: 'blacksmith', name: 'Ironworks', description: 'Quality steel' },
          ],
          notableNPCs: [
            { name: 'Mayor Aldric', role: 'Mayor', description: 'Old and shrewd' },
            { name: 'Brenna', role: 'Blacksmith', description: 'Strong arms' },
          ],
          rumors: ['The sewers are haunted', 'A dragon sleeps in the hills'],
        }),
      ];
      render(<Settlements campaignName="test" onBack={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /edit settlement/i }));

      expect(screen.getByDisplayValue('The Rusty Anchor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ironworks')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mayor Aldric')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Brenna')).toBeInTheDocument();
      expect(screen.getByDisplayValue('The sewers are haunted')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A dragon sleeps in the hills')).toBeInTheDocument();
      expect(screen.getAllByTitle('Remove service')).toHaveLength(2);
      expect(screen.getAllByTitle('Remove NPC')).toHaveLength(2);
      expect(screen.getAllByTitle('Remove rumor')).toHaveLength(2);
    });
  });

  describe('Add-remove-add cycle', () => {
    const rowTypes = [
      {
        label: 'service',
        addButtonName: /add service/i,
        removeTitle: 'Remove service',
        rowCount: () => screen.queryAllByPlaceholderText('Business name').length,
      },
      {
        label: 'NPC',
        addButtonName: /add npc/i,
        removeTitle: 'Remove NPC',
        rowCount: () => screen.queryAllByPlaceholderText('NPC name').length,
      },
      {
        label: 'rumor',
        addButtonName: /add rumor/i,
        removeTitle: 'Remove rumor',
        rowCount: () => screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length,
      },
    ];

    it.each(rowTypes)('can add, remove, and re-add a $label row', ({ addButtonName, removeTitle, rowCount }) => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      openNewSettlementModal();

      const addBtn = screen.getByRole('button', { name: addButtonName });
      fireEvent.click(addBtn);
      expect(rowCount()).toBe(1);

      fireEvent.click(screen.getByTitle(removeTitle));
      expect(rowCount()).toBe(0);

      fireEvent.click(addBtn);
      expect(rowCount()).toBe(1);
    });
  });
});
