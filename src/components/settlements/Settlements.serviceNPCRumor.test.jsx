import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settlements from './Settlements.jsx';

const settlementMockReturn = {
  items: [],
  loading: false,
  loadItems: () => {},
  saveItems: async () => {},
  deleteItem: async () => {},
};

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: () => ({ ...settlementMockReturn }),
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

describe('Settlements - service, NPC, rumor management', () => {
  const mockUseSettlements = {
    items: [],
    loading: false,
    saveItems: async () => {},
    deleteItem: async () => {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    Object.assign(settlementMockReturn, mockUseSettlements);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Add buttons', () => {
    it('renders add buttons for services, NPCs, and rumors in the new settlement modal', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add npc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add rumor/i })).toBeInTheDocument();
    });
  });

  describe('Multiple service rows', () => {
    it('adds multiple independent service rows and each can be edited separately', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addSvcBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addSvcBtn);
      fireEvent.click(addSvcBtn);
      fireEvent.click(addSvcBtn);

      const removeBtns = screen.getAllByTitle('Remove service');
      expect(removeBtns.length).toBe(3);

      // Each service has a name input; set different values to verify independence
      const nameInputs = screen.getAllByPlaceholderText('Business name');
      expect(nameInputs.length).toBe(3);
      fireEvent.change(nameInputs[0], { target: { value: 'First Inn' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Second Smithy' } });
      fireEvent.change(nameInputs[2], { target: { value: 'Third Shop' } });

      expect(nameInputs[0].value).toBe('First Inn');
      expect(nameInputs[1].value).toBe('Second Smithy');
      expect(nameInputs[2].value).toBe('Third Shop');

      // Remove the middle one
      fireEvent.click(removeBtns[1]);
      const remainingBtns = screen.getAllByTitle('Remove service');
      expect(remainingBtns.length).toBe(2);

      // Remaining name inputs should still hold their values
      const remainingInputs = screen.getAllByPlaceholderText('Business name');
      expect(remainingInputs.length).toBe(2);
      expect(remainingInputs[0].value).toBe('First Inn');
      expect(remainingInputs[1].value).toBe('Third Shop');
    });

    it('removing the last service removes it entirely', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addSvcBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addSvcBtn);

      expect(screen.queryByPlaceholderText('Business name')).toBeInTheDocument();
      const removeBtn = screen.getByTitle('Remove service');
      fireEvent.click(removeBtn);
      expect(screen.queryByPlaceholderText('Business name')).not.toBeInTheDocument();
    });

    it('each service type select operates independently', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addSvcBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addSvcBtn);
      fireEvent.click(addSvcBtn);

      const allSelects = document.querySelectorAll('select');
      const svcSelects = Array.from(allSelects).filter(s => s.value === 'tavern');

      expect(svcSelects.length).toBe(2);
      fireEvent.change(svcSelects[0], { target: { value: 'inn' } });
      fireEvent.change(svcSelects[1], { target: { value: 'bank' } });

      expect(svcSelects[0].value).toBe('inn');
      expect(svcSelects[1].value).toBe('bank');
    });
  });

  describe('Multiple NPC rows', () => {
    it('adds multiple independent NPC rows with different data', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      const nameInputs = screen.getAllByPlaceholderText('NPC name');
      expect(nameInputs.length).toBe(3);
      const roleInputs = screen.getAllByPlaceholderText(/role/i);
      expect(roleInputs.length).toBe(3);

      // Set independent data for each NPC
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

    it('removing an NPC shifts remaining NPCs correctly', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);
      fireEvent.click(addNpcBtn);

      const nameInputs = screen.getAllByPlaceholderText('NPC name');
      fireEvent.change(nameInputs[0], { target: { value: 'First' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Second' } });
      fireEvent.change(nameInputs[2], { target: { value: 'Third' } });

      const removeBtns = screen.getAllByTitle('Remove NPC');
      fireEvent.click(removeBtns[1]);

      const remainingInputs = screen.getAllByPlaceholderText('NPC name');
      expect(remainingInputs.length).toBe(2);
      expect(remainingInputs[0].value).toBe('First');
      expect(remainingInputs[1].value).toBe('Third');
    });

    it('removing the last NPC removes it entirely', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);

      expect(screen.queryByPlaceholderText('NPC name')).toBeInTheDocument();
      const removeBtn = screen.getAllByTitle('Remove NPC')[0];
      fireEvent.click(removeBtn);
      expect(screen.queryByPlaceholderText('NPC name')).not.toBeInTheDocument();
    });
  });

  describe('Multiple rumor rows', () => {
    it('adds multiple independent rumor rows with different text', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);

      const rumorTextareas = document.querySelectorAll('textarea');
      // 4 rumor textareas: 3 new rumors + 1 existing (government, description, atmosphere, rumors[0], rumors[1], rumors[2], notes)
      // The rumor textareas are the last 3 before the notes textarea
      expect(rumorTextareas.length).toBeGreaterThanOrEqual(3);

      // Use data-testid to target the rumor textareas specifically
      const rumorToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(rumorToggles.length).toBe(3);

      fireEvent.change(rumorToggles[0], { target: { value: 'Rumor A' } });
      fireEvent.change(rumorToggles[1], { target: { value: 'Rumor B' } });
      fireEvent.change(rumorToggles[2], { target: { value: 'Rumor C' } });

      expect(rumorToggles[0].value).toBe('Rumor A');
      expect(rumorToggles[1].value).toBe('Rumor B');
      expect(rumorToggles[2].value).toBe('Rumor C');
    });

    it('removing a rumor shifts remaining rumors correctly', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);
      fireEvent.click(addRumorBtn);

      const rumorToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      fireEvent.change(rumorToggles[0], { target: { value: 'First Rumor' } });
      fireEvent.change(rumorToggles[1], { target: { value: 'Second Rumor' } });
      fireEvent.change(rumorToggles[2], { target: { value: 'Third Rumor' } });

      const removeBtns = screen.getAllByTitle('Remove rumor');
      fireEvent.click(removeBtns[1]);

      const remainingToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(remainingToggles.length).toBe(2);
      expect(remainingToggles[0].value).toBe('First Rumor');
      expect(remainingToggles[1].value).toBe('Third Rumor');
    });

    it('removing the last rumor removes it entirely', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);

      const rumorToggles = screen.getAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(rumorToggles.length).toBe(1);

      const removeBtn = screen.getByTitle('Remove rumor');
      fireEvent.click(removeBtn);

      const remainingToggles = screen.queryAllByTestId(/preview-toggle-settlement-rumor-/);
      expect(remainingToggles.length).toBe(0);
    });
  });

  describe('Add-remove-add cycle', () => {
    it('can add, remove, and re-add a service without issues', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addSvcBtn = screen.getByRole('button', { name: /add service/i });
      fireEvent.click(addSvcBtn);
      expect(screen.queryByPlaceholderText('Business name')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Remove service'));
      expect(screen.queryByPlaceholderText('Business name')).not.toBeInTheDocument();

      fireEvent.click(addSvcBtn);
      expect(screen.queryByPlaceholderText('Business name')).toBeInTheDocument();
    });

    it('can add, remove, and re-add an NPC without issues', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addNpcBtn = screen.getByRole('button', { name: /add npc/i });
      fireEvent.click(addNpcBtn);
      expect(screen.queryByPlaceholderText('NPC name')).toBeInTheDocument();

      fireEvent.click(screen.getAllByTitle('Remove NPC')[0]);
      expect(screen.queryByPlaceholderText('NPC name')).not.toBeInTheDocument();

      fireEvent.click(addNpcBtn);
      expect(screen.queryByPlaceholderText('NPC name')).toBeInTheDocument();
    });

    it('can add, remove, and re-add a rumor without issues', () => {
      render(<Settlements campaignName="test" onBack={() => {}} />);
      const modalOpen = screen.getByRole('button', { name: /new settlement/i });
      fireEvent.click(modalOpen);

      const addRumorBtn = screen.getByRole('button', { name: /add rumor/i });
      fireEvent.click(addRumorBtn);
      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length).toBe(1);

      fireEvent.click(screen.getByTitle('Remove rumor'));
      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length).toBe(0);

      fireEvent.click(addRumorBtn);
      expect(screen.queryAllByTestId(/preview-toggle-settlement-rumor-/).length).toBe(1);
    });
  });
});
