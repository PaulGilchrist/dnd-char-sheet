// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepInventory from './WizardStepInventory.jsx';

vi.mock('../../hooks/ui/useEquipmentSearch.js', () => ({
  useEquipmentSearch: vi.fn(),
}));

vi.mock('./EquipmentSearchModal.jsx', () => ({
  default: function EquipmentSearchModal({
    showSearchModal,
    onClose,
    filteredEquipment,
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    showOnlySelected,
    onShowOnlySelectedChange,
    onEquipmentSelect,
    onAddCustomItem: _onAddCustomItem,
    currentItemCount = 0,
    uniqueCategories = ['All'],
  }) {
    if (!showSearchModal) return null;
    return (
      <div className="equipment-search-modal-overlay" data-testid="equipment-search-modal">
        <div className="equipment-search-modal">
          <div className="search-modal-header">
            <h3>Select Equipment</h3>
            <button className="close-modal-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="search-modal-body">
            <div className="category-filters">
              <select
                className="category-select"
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="filter-checkbox-group">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlySelected}
                  onChange={(e) => onShowOnlySelectedChange(e.target.checked)}
                />
                Show Only Selected&nbsp;(
              </label>
              <span className="filter-checkbox-count">
                {currentItemCount} selected)
              </span>
            </div>
            <div className="equipment-results">
              {filteredEquipment.length === 0 && searchQuery ? (
                <div className="no-results">
                  No matches found. Press Enter to add as custom item.
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="no-results">
                  Start typing to search equipment.
                </div>
              ) : (
                filteredEquipment.map((item) => (
                  <div
                    key={item.index}
                    className="equipment-item"
                    onClick={() => onEquipmentSelect(item)}
                  >
                    <div className="equipment-item-name">{item.name}</div>
                    <div className="equipment-item-details">
                      <span className="equipment-item-category">
                        {item.equipment_category}
                      </span>
                      <span className="equipment-item-cost">
                        {item.cost?.quantity} {item.cost?.unit}
                      </span>
                      {item.weight && (
                        <span className="equipment-item-weight">
                          {item.weight} lb
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="search-modal-footer">
            <button className="cancel-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  },
}));

import { useEquipmentSearch } from '../../hooks/ui/useEquipmentSearch.js';

const mockEquipment = [
  {
    index: 'club',
    name: 'Club',
    equipment_category: 'Weapons',
    cost: { quantity: 1, unit: 'cp' },
    weight: 2,
  },
  {
    index: 'dagger',
    name: 'Dagger',
    equipment_category: 'Weapons',
    cost: { quantity: 2, unit: 'gp' },
    weight: 1,
  },
];

const createMockHookReturn = (overrides = {}) => ({
  searchQuery: '',
  setSearchQuery: vi.fn(),
  filteredEquipment: [],
  selectedCategory: 'All',
  showOnlySelectedBackpack: false,
  setShowOnlySelectedBackpack: vi.fn(),
  showOnlySelectedEquipped: false,
  setShowOnlySelectedEquipped: vi.fn(),
  searchField: null,
  setSearchField: vi.fn(),
  handleEquipmentSelect: vi.fn(),
  handleAddCustomItem: vi.fn(),
  handleCategoryChange: vi.fn(),
  handleSearchFieldFocus: vi.fn(),
  uniqueCategories: ['All', 'Weapons', 'Armor'],
  ...overrides,
});

const createMockProps = (overrides = {}) => ({
  formData: { inventory: { gold: 15 } },
  tempInventory: {
    backpack: ['Rope', 'Torch'],
    equipped: ['Longsword', 'Chain mail'],
  },
  onInventoryChange: vi.fn(),
  onTempInventoryChange: vi.fn(),
  ...overrides,
});

describe('WizardStepInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEquipmentSearch.mockReturnValue(createMockHookReturn());
  });

  describe('rendering', () => {
    it('renders header, gold input, textareas, search buttons, and section labels', () => {
      render(<WizardStepInventory {...createMockProps()} />);
      expect(screen.getByText('Step 11: Inventory')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
      expect(
        screen.getAllByRole('button', { name: /Search Equipment/ })
      ).toHaveLength(2);
      expect(screen.getByText('Backpack Items')).toBeInTheDocument();
      expect(screen.getByText('Equipped Items')).toBeInTheDocument();
    });
  });

  describe('gold input', () => {
    it('displays the initial gold value from formData.inventory.gold', () => {
      const props = createMockProps({
        formData: { inventory: { gold: 50 } },
      });
      render(<WizardStepInventory {...props} />);
      expect(screen.getByRole('spinbutton')).toHaveValue(50);
    });

    it('calls onInventoryChange with parsed integer when gold changes', () => {
      const onInventoryChange = vi.fn();
      const props = createMockProps({ onInventoryChange });
      render(<WizardStepInventory {...props} />);
      const goldInput = screen.getByRole('spinbutton');
      fireEvent.change(goldInput, { target: { value: '100' } });
      expect(onInventoryChange).toHaveBeenCalledWith('gold', 100);
    });

    it('calls onInventoryChange with 0 when gold input is empty or non-numeric', () => {
      const onInventoryChange = vi.fn();
      const props = createMockProps({ onInventoryChange });
      render(<WizardStepInventory {...props} />);
      const goldInput = screen.getByRole('spinbutton');

      fireEvent.change(goldInput, { target: { value: '' } });
      expect(onInventoryChange).toHaveBeenCalledWith('gold', 0);

      vi.mocked(onInventoryChange).mockClear();
      fireEvent.change(goldInput, { target: { value: 'abc' } });
      expect(onInventoryChange).toHaveBeenCalledWith('gold', 0);
    });

    it('renders null for gold input when formData.inventory.gold is undefined', () => {
      const props = createMockProps({
        formData: { inventory: {} },
      });
      render(<WizardStepInventory {...props} />);
      expect(screen.getByRole('spinbutton')).toHaveValue(null);
    });

    it('calls onInventoryChange with NaN-derived 0 for decimal input', () => {
      const onInventoryChange = vi.fn();
      const props = createMockProps({ onInventoryChange });
      render(<WizardStepInventory {...props} />);
      const goldInput = screen.getByRole('spinbutton');
      fireEvent.change(goldInput, { target: { value: '10.5' } });
      // parseInt('10.5') returns 10, but parseInt('') returns 0, parseInt('abc') returns NaN which becomes 0 via || 0
      expect(onInventoryChange).toHaveBeenCalledWith('gold', 10);
    });
  });

  describe('textarea blur commits items', () => {
    it('splits comma-separated items and commits them on blur', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: [], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(backpackTextarea, { target: { value: 'Drums, Guitar' } });
      fireEvent.blur(backpackTextarea);

      expect(onTempInventoryChange).toHaveBeenCalledWith(
        'backpack',
        ['Drums', 'Guitar']
      );
      expect(onInventoryChange).toHaveBeenCalledWith('backpack', [
        'Drums',
        'Guitar',
      ]);
    });

    it('trims whitespace and filters empty items when splitting on commas', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: [], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(backpackTextarea, {
        target: { value: ', Rope, , Torch,' },
      });
      fireEvent.blur(backpackTextarea);

      expect(onTempInventoryChange).toHaveBeenCalledWith(
        'backpack',
        ['Rope', 'Torch']
      );
      expect(onInventoryChange).toHaveBeenCalledWith('backpack', [
        'Rope',
        'Torch',
      ]);
    });

    it('commits an empty array when blur results in empty or whitespace-only text', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: ['Rope'], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(backpackTextarea, { target: { value: '' } });
      fireEvent.blur(backpackTextarea);
      expect(onTempInventoryChange).toHaveBeenCalledWith('backpack', []);
      expect(onInventoryChange).toHaveBeenCalledWith('backpack', []);
    });

    it('commits items from the equipped textarea on blur', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: [], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const equippedTextarea = screen.getAllByRole('textbox')[1];
      fireEvent.change(equippedTextarea, {
        target: { value: 'Longsword, Shield' },
      });
      fireEvent.blur(equippedTextarea);

      expect(onTempInventoryChange).toHaveBeenCalledWith(
        'equipped',
        ['Longsword', 'Shield']
      );
      expect(onInventoryChange).toHaveBeenCalledWith('equipped', [
        'Longsword',
        'Shield',
      ]);
    });
  });

  describe('textarea Enter key commits items', () => {
    it('splits and commits comma-separated items when Enter is pressed', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: [], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(backpackTextarea, {
        target: { value: 'Dagger, Arrow' },
      });
      fireEvent.keyDown(backpackTextarea, { key: 'Enter' });

      expect(onTempInventoryChange).toHaveBeenCalledWith(
        'backpack',
        ['Dagger', 'Arrow']
      );
      expect(onInventoryChange).toHaveBeenCalledWith('backpack', [
        'Dagger',
        'Arrow',
      ]);
    });

    it('does not commit items when Shift+Enter is pressed', () => {
      const onInventoryChange = vi.fn();
      const onTempInventoryChange = vi.fn();
      const props = createMockProps({
        tempInventory: { backpack: [], equipped: [] },
        onInventoryChange,
        onTempInventoryChange,
      });
      render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(backpackTextarea, {
        target: { value: 'Dagger, Arrow' },
      });
      fireEvent.keyDown(backpackTextarea, { key: 'Enter', shiftKey: true });

      expect(onInventoryChange).not.toHaveBeenCalled();
      expect(onTempInventoryChange).not.toHaveBeenCalled();
    });
  });

  describe('item preview', () => {
    it('displays item tags, counts, and overflow indicator for 6+ items', () => {
      const props = createMockProps({
        tempInventory: {
          backpack: [
            'Rope',
            'Torch',
            'Rations',
            'Dagger',
            'Shield',
            'Potion',
            'Map',
          ],
          equipped: ['Longsword'],
        },
      });
      render(<WizardStepInventory {...props} />);

      expect(screen.getByText('Rope')).toBeInTheDocument();
      expect(screen.getByText('Torch')).toBeInTheDocument();
      expect(screen.getByText('7 items')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('displays singular item count for a single item', () => {
      const props = createMockProps({
        tempInventory: { backpack: ['Rope'], equipped: [] },
      });
      render(<WizardStepInventory {...props} />);
      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('does not render the preview container when there are no items', () => {
      const { container } = render(
        <WizardStepInventory
          {...createMockProps({
            tempInventory: { backpack: [], equipped: [] },
          })}
        />
      );
      expect(
        container.querySelector('.inventory-items-preview')
      ).not.toBeInTheDocument();
    });
  });

  describe('raw text sync and focusedField behavior', () => {
    it('syncs raw text from tempInventory when items change externally and no field is focused', () => {
      const props = createMockProps({
        tempInventory: { backpack: ['Rope'], equipped: [] },
      });
      const { rerender } = render(<WizardStepInventory {...props} />);

      // Initial raw text should be 'Rope'
      const backpackTextarea = screen.getAllByRole('textbox')[0];
      expect(backpackTextarea).toHaveValue('Rope');

      // Rerender with updated items (simulating external change via modal)
      rerender(
        <WizardStepInventory
          {...props}
          tempInventory={{ backpack: ['Rope', 'Torch'], equipped: [] }}
        />
      );

      // Raw text should sync to 'Rope, Torch'
      expect(backpackTextarea).toHaveValue('Rope, Torch');
    });

    it('does not sync raw text when the field currently has focus', () => {
      const props = createMockProps({
        tempInventory: { backpack: ['Rope'], equipped: [] },
      });
      const { rerender } = render(<WizardStepInventory {...props} />);

      const backpackTextarea = screen.getAllByRole('textbox')[0];
      fireEvent.focus(backpackTextarea);
      fireEvent.change(backpackTextarea, {
        target: { value: 'Custom Item' },
      });

      // Rerender with updated items while focused
      rerender(
        <WizardStepInventory
          {...props}
          tempInventory={{ backpack: ['Rope', 'Torch'], equipped: [] }}
        />
      );

      // Raw text should NOT sync because the field is focused
      expect(backpackTextarea).toHaveValue('Custom Item');
    });
  });

  describe('search button interaction', () => {
    it('calls handleSearchFieldFocus with the correct field when search button is clicked', () => {
      const handleSearchFieldFocus = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({ searchField: null, handleSearchFieldFocus })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      const buttons = screen.getAllByRole('button', {
        name: /Search Equipment/,
      });
      fireEvent.click(buttons[0]);
      expect(handleSearchFieldFocus).toHaveBeenCalledWith('backpack');

      fireEvent.click(buttons[1]);
      expect(handleSearchFieldFocus).toHaveBeenCalledWith('equipped');
    });
  });

  describe('EquipmentSearchModal', () => {
    it('renders the modal when searchField is set', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({ searchField: 'backpack' })
      );
      const props = createMockProps();
      render(<WizardStepInventory {...props} />);
      expect(screen.getByTestId('equipment-search-modal')).toBeInTheDocument();
    });

    it('does not render the modal when searchField is null', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({ searchField: null })
      );
      const props = createMockProps();
      render(<WizardStepInventory {...props} />);
      expect(
        screen.queryByTestId('equipment-search-modal')
      ).not.toBeInTheDocument();
    });

    it('calls setSearchField and setSearchQuery when close button is clicked', () => {
      const setSearchField = vi.fn();
      const setSearchQuery = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          setSearchField,
          setSearchQuery,
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      fireEvent.click(screen.getByText('✕'));
      expect(setSearchField).toHaveBeenCalledWith(null);
      expect(setSearchQuery).toHaveBeenCalledWith('');
    });

    it('calls setSearchField and setSearchQuery when the cancel button is clicked', () => {
      const setSearchField = vi.fn();
      const setSearchQuery = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          setSearchField,
          setSearchQuery,
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(setSearchField).toHaveBeenCalledWith(null);
      expect(setSearchQuery).toHaveBeenCalledWith('');
    });

    it('renders equipment items and calls onEquipmentSelect when clicked', () => {
      const handleEquipmentSelect = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          filteredEquipment: mockEquipment,
          handleEquipmentSelect,
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      expect(screen.getByText('Club')).toBeInTheDocument();
      expect(screen.getByText('Dagger')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Club'));
      expect(handleEquipmentSelect).toHaveBeenCalledWith(mockEquipment[0]);
    });

    it('passes the correct currentItemCount based on the active field', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({ searchField: 'backpack' })
      );

      const props = createMockProps({
        tempInventory: {
          backpack: ['Rope', 'Torch'],
          equipped: ['Sword'],
        },
      });
      render(<WizardStepInventory {...props} />);
      expect(screen.getByText('2 selected)')).toBeInTheDocument();
    });

    it('renders the category dropdown with unique categories', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          uniqueCategories: ['All', 'Weapons', 'Armor', 'Potions'],
        })
      );

      const onCategoryChange = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          uniqueCategories: ['All', 'Weapons', 'Armor', 'Potions'],
          onCategoryChange,
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('All');
      expect(screen.getByText('Weapons')).toBeInTheDocument();
      expect(screen.getByText('Armor')).toBeInTheDocument();
      expect(screen.getByText('Potions')).toBeInTheDocument();
    });

    it('renders the search input with the correct placeholder', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          searchQuery: '',
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders the "Show Only Selected" checkbox and calls setShowOnlySelectedBackpack when toggled', () => {
      const setShowOnlySelectedBackpack = vi.fn();
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          setShowOnlySelectedBackpack,
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      fireEvent.click(checkbox);
      expect(setShowOnlySelectedBackpack).toHaveBeenCalledWith(true);
    });

    it('displays "Start typing to search equipment." when filteredEquipment is empty and no searchQuery', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          filteredEquipment: [],
          searchQuery: '',
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      expect(
        screen.getByText('Start typing to search equipment.')
      ).toBeInTheDocument();
    });

    it('displays "No matches found. Press Enter to add as custom item." when filteredEquipment is empty and searchQuery exists', () => {
      useEquipmentSearch.mockReturnValue(
        createMockHookReturn({
          searchField: 'backpack',
          filteredEquipment: [],
          searchQuery: 'nonexistent',
        })
      );

      const props = createMockProps();
      render(<WizardStepInventory {...props} />);

      expect(
        screen.getByText('No matches found. Press Enter to add as custom item.')
      ).toBeInTheDocument();
    });
  });
});
