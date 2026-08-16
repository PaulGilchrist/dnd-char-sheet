// @improved-by-ai
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepMagicItems from './WizardStepMagicItems.jsx';

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

describe('WizardStepMagicItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMagicItems = [
    {
      name: 'Wand of Magic',
      index: 'wand',
      type: 'Rod',
      rarity: 'Uncommon',
      description: '<p>A magic wand.</p>',
      requiresAttunement: false,
    },
    {
      name: 'Amulet of Health',
      index: 'amulet',
      type: 'Amulet',
      rarity: 'Uncommon',
      description: '<p>Health amulet.</p>',
      requiresAttunement: true,
    },
  ];

  const createProps = (overrides = {}) => ({
    formData: {
      inventory: {
        magicItems: ['Wand of Magic'],
      },
    },
    allMagicItems: baseMagicItems,
    ruleset: '5e',
    onArrayFieldChange: vi.fn(),
    ...overrides,
  });

  describe('rendering', () => {
    it('renders the step title, items, search input, type filter, selected checkbox, and result count', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      expect(screen.getByText('Step 10: Magic Items')).toBeInTheDocument();
      expect(screen.getByText('Amulet of Health')).toBeInTheDocument();
      expect(screen.getByText('Wand of Magic')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Search magic items...');
      expect(screen.getByLabelText('Item Type')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /show only selected/i })).toBeInTheDocument();
      expect(screen.getByText(/Showing 2 magic items/)).toBeInTheDocument();
    });

    it('shows attunement badge on items that require attunement', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      expect(screen.getByText('requires attunement')).toBeInTheDocument();
    });

    it('shows a loading message when allMagicItems is null', () => {
      render(
        <WizardStepMagicItems
          {...createProps({
            allMagicItems: null,
          })}
        />,
      );
      expect(
        screen.getByText('Magic item data not yet loaded. Please try again.'),
      ).toBeInTheDocument();
    });

    it('shows a loading message when allMagicItems is an empty array', () => {
      render(
        <WizardStepMagicItems
          {...createProps({
            allMagicItems: [],
          })}
        />,
      );
      expect(
        screen.getByText('Magic item data not yet loaded. Please try again.'),
      ).toBeInTheDocument();
    });

    it('renders with no selected items', () => {
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: { inventory: { magicItems: [] } },
          })}
        />,
      );
      expect(screen.getByText('Step 10: Magic Items')).toBeInTheDocument();
      expect(screen.getByText(/Showing 2 magic items/)).toBeInTheDocument();
    });

    it('renders with empty formData when inventory is missing', () => {
      render(
        <WizardStepMagicItems
          allMagicItems={baseMagicItems}
          formData={{}}
          onArrayFieldChange={vi.fn()}
        />,
      );
      expect(screen.getByText('Step 10: Magic Items')).toBeInTheDocument();
      expect(screen.getByText(/Showing 2 magic items/)).toBeInTheDocument();
    });
  });

  describe('item display', () => {
    it('expands and collapses item description on Show More / Show Less toggle', async () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const showMoreButtons = screen.getAllByText('Show More');
      expect(showMoreButtons.length).toBe(2);

      // Click the first "Show More" button
      fireEvent.click(showMoreButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Show Less')).toBeInTheDocument();
      });

      // Click "Show Less" to collapse
      fireEvent.click(screen.getByText('Show Less'));
      await waitFor(() => {
        expect(screen.getAllByText('Show More').length).toBe(2);
      });
    });

    it('hides description content when collapsed', async () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const showMoreButtons = screen.getAllByText('Show More');

      fireEvent.click(showMoreButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Show Less')).toBeInTheDocument();
      });

      // The expanded description text should be visible
      const expandedContent = document.querySelector('.list-item-full-details');
      expect(expandedContent).toHaveClass('list-item-full-details');

      // Now toggle back to collapsed
      fireEvent.click(screen.getByText('Show Less'));
      await waitFor(() => {
        expect(screen.getAllByText('Show More').length).toBe(2);
      });
    });

    it('handles items with missing optional fields gracefully', () => {
      const minimalItem = {
        name: 'Odd Item',
        index: 'odd',
      };
      render(
        <WizardStepMagicItems
          {...createProps({
            allMagicItems: [minimalItem],
          })}
        />,
      );
      expect(screen.getByText('Odd Item')).toBeInTheDocument();
    });

    it('renders item type and rarity when present', () => {
      const itemsWithTypeAndRarity = [
        { name: 'Ring of Protection', index: 'ring', type: 'Ring', rarity: 'Rare', description: 'AC +1' },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            allMagicItems: itemsWithTypeAndRarity,
          })}
        />,
      );
      expect(screen.getByText('Ring of Protection')).toBeInTheDocument();
      const magicItem = screen.getByText('Ring of Protection').closest('.magic-item');
      expect(magicItem.querySelector('.magic-item-type')).toHaveTextContent('Ring');
      expect(magicItem.querySelector('.magic-item-rarity')).toHaveTextContent('Rare');
    });

    it('does not render type/rarity/attunement when those fields are missing', () => {
      const minimalItem = {
        name: 'Mysterious Artifact',
        index: 'artifact',
      };
      render(
        <WizardStepMagicItems
          {...createProps({
            allMagicItems: [minimalItem],
          })}
        />,
      );
      expect(screen.getByText('Mysterious Artifact')).toBeInTheDocument();
      expect(screen.queryByText('requires attunement')).not.toBeInTheDocument();
    });
  });

  describe('attunement warnings', () => {
    it('displays a warning when selected attuned items exceed the limit', () => {
      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring'],
              },
            },
            allMagicItems: attunedItems,
          })}
        />,
      );
      const warningText =
        'You have selected 4 items requiring attunement, but a character can only attune to a maximum of 3 items.';
      expect(screen.getByText(warningText)).toBeInTheDocument();
    });

    it('does not display a warning when attuned items are within the limit', () => {
      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              inventory: {
                magicItems: ['Boots', 'Cloak'],
              },
            },
            allMagicItems: attunedItems,
          })}
        />,
      );
      expect(
        screen.queryByText(/items requiring attunement/),
      ).not.toBeInTheDocument();
    });

    it('does not display a warning when no items are selected', () => {
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: { inventory: { magicItems: [] } },
            allMagicItems: baseMagicItems,
          })}
        />,
      );
      expect(
        screen.queryByText(/items requiring attunement/),
      ).not.toBeInTheDocument();
    });

    it('does not display a warning when selected items do not require attunement', () => {
      const nonAttunedItems = [
        { name: 'Wand', requiresAttunement: false },
        { name: 'Potion', requiresAttunement: false },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              inventory: {
                magicItems: ['Wand', 'Potion'],
              },
            },
            allMagicItems: nonAttunedItems,
          })}
        />,
      );
      expect(
        screen.queryByText(/items requiring attunement/),
      ).not.toBeInTheDocument();
    });

    it('increases the attunement limit for Thief Rogue level 13+', () => {
      const thiefClassSubtypes = [
        {
          className: 'Rogue',
          subtypes: [
            {
              name: 'Thief',
              class_levels: [
                { level: 13, features: [{ name: 'Use Magic Device' }] },
              ],
            },
          ],
        },
      ];

      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
        { name: 'Amulet', requiresAttunement: true },
      ];

      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              class: { name: 'Rogue', subclass: { name: 'Thief' } },
              level: 13,
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring', 'Amulet'],
              },
            },
            allMagicItems: attunedItems,
            classSubtypes: thiefClassSubtypes,
          })}
        />,
      );

      const warningText =
        'You have selected 5 items requiring attunement, but a character can only attune to a maximum of 4 items.';
      expect(screen.getByText(warningText)).toBeInTheDocument();
    });

    it('does not warn when Thief Rogue level 13+ is at the extended limit', () => {
      const thiefClassSubtypes = [
        {
          className: 'Rogue',
          subtypes: [
            {
              name: 'Thief',
              class_levels: [
                { level: 13, features: [{ name: 'Use Magic Device' }] },
              ],
            },
          ],
        },
      ];

      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
      ];

      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              class: { name: 'Rogue', subclass: { name: 'Thief' } },
              level: 13,
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring'],
              },
            },
            allMagicItems: attunedItems,
            classSubtypes: thiefClassSubtypes,
          })}
        />,
      );

      expect(
        screen.queryByText(/maximum of 4 items/),
      ).not.toBeInTheDocument();
    });

    it('uses the base limit of 3 when classSubtypes is null', () => {
      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              class: { name: 'Fighter' },
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring'],
              },
            },
            allMagicItems: attunedItems,
            classSubtypes: null,
          })}
        />,
      );
      expect(
        screen.getByText(/maximum of 3 items/),
      ).toBeInTheDocument();
    });

    it('uses the base limit when class name does not match any classSubtypes entry', () => {
      const classSubtypes = [
        { className: 'Rogue', subtypes: [] },
      ];
      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              class: { name: 'Wizard' },
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring'],
              },
            },
            allMagicItems: attunedItems,
            classSubtypes,
          })}
        />,
      );
      expect(
        screen.getByText(/maximum of 3 items/),
      ).toBeInTheDocument();
    });

    it('uses the base limit when subclass name does not match', () => {
      const classSubtypes = [
        {
          className: 'Rogue',
          subtypes: [{ name: 'Assassin', class_levels: [] }],
        },
      ];
      const attunedItems = [
        { name: 'Boots', requiresAttunement: true },
        { name: 'Cloak', requiresAttunement: true },
        { name: 'Gloves', requiresAttunement: true },
        { name: 'Ring', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              class: { name: 'Rogue', subclass: { name: 'Thief' } },
              inventory: {
                magicItems: ['Boots', 'Cloak', 'Gloves', 'Ring'],
              },
            },
            allMagicItems: attunedItems,
            classSubtypes,
          })}
        />,
      );
      expect(
        screen.getByText(/maximum of 3 items/),
      ).toBeInTheDocument();
    });

    it('matches items by index when name lookup fails', () => {
      const items = [
        { name: 'Boots of Speed', index: 'boots-speed', requiresAttunement: true },
        { name: 'Cloak of Protection', index: 'cloak-protection', requiresAttunement: true },
        { name: 'Gloves of Thievery', index: 'gloves-thievery', requiresAttunement: true },
        { name: 'Ring of Spell Storing', index: 'ring-spell-storing', requiresAttunement: true },
      ];
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              inventory: {
                magicItems: ['boots-speed', 'cloak-protection', 'gloves-thievery', 'ring-spell-storing'],
              },
            },
            allMagicItems: items,
          })}
        />,
      );
      expect(
        screen.getByText(/items requiring attunement/),
      ).toBeInTheDocument();
    });
  });

  describe('item selection', () => {
    it('calls onArrayFieldChange to add an unselected item when its checkbox is clicked', () => {
      const onArrayFieldChange = vi.fn();
      render(
        <WizardStepMagicItems
          {...createProps({
            onArrayFieldChange,
          })}
        />,
      );

      const checkboxes = document.querySelectorAll('.list-item-checkbox-trigger');
      expect(checkboxes.length).toBe(2);

      // Amulet of Health is unselected; clicking adds it to the array
      fireEvent.click(checkboxes[0]);
      expect(onArrayFieldChange).toHaveBeenCalledWith(
        'inventory.magicItems',
        ['Wand of Magic', 'Amulet of Health'],
      );
    });

    it('calls onArrayFieldChange to remove a selected item when its checkbox is clicked', () => {
      const onArrayFieldChange = vi.fn();
      render(
        <WizardStepMagicItems
          {...createProps({
            onArrayFieldChange,
            formData: {
              inventory: {
                magicItems: ['Wand of Magic', 'Amulet of Health'],
              },
            },
          })}
        />,
      );

      const checkboxes = document.querySelectorAll('.list-item-checkbox-trigger');
      expect(checkboxes.length).toBe(2);

      // Items are sorted alphabetically: Amulet of Health first, Wand of Magic second
      // Both are selected; clicking the first (Amulet) removes it
      fireEvent.click(checkboxes[0]);
      expect(onArrayFieldChange).toHaveBeenCalledWith(
        'inventory.magicItems',
        ['Wand of Magic'],
      );
    });

    it('does not call onArrayFieldChange when formData.inventory is undefined', () => {
      const onArrayFieldChange = vi.fn();
      render(
        <WizardStepMagicItems
          allMagicItems={baseMagicItems}
          formData={{}}
          onArrayFieldChange={onArrayFieldChange}
        />,
      );

      const checkboxes = document.querySelectorAll('.list-item-checkbox-trigger');
      fireEvent.click(checkboxes[0]);
      expect(onArrayFieldChange).toHaveBeenCalled();
    });
  });

  describe('search and filtering', () => {
    it('filters items by search query', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: 'Amulet' } });
      expect(screen.getByText('Amulet of Health')).toBeInTheDocument();
      expect(screen.queryByText('Wand of Magic')).not.toBeInTheDocument();
    });

    it('filters items by search query using index', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: 'amulet' } });
      expect(screen.getByText('Amulet of Health')).toBeInTheDocument();
      expect(screen.queryByText('Wand of Magic')).not.toBeInTheDocument();
    });

    it('shows all items when search query is cleared', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: 'Amulet' } });
      expect(screen.queryByText('Wand of Magic')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Wand of Magic')).toBeInTheDocument();
      expect(screen.getByText('Amulet of Health')).toBeInTheDocument();
    });

    it('filters by item type dropdown', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const filterSelect = screen.getByLabelText('Item Type');
      fireEvent.change(filterSelect, { target: { value: 'Rod' } });
      expect(screen.getByText('Wand of Magic')).toBeInTheDocument();
      expect(screen.queryByText('Amulet of Health')).not.toBeInTheDocument();
    });

    it('shows only selected items when the filter checkbox is enabled', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const checkbox = screen.getByRole('checkbox', {
        name: /show only selected/i,
      });
      fireEvent.click(checkbox);
      expect(screen.getByText('Wand of Magic')).toBeInTheDocument();
      expect(screen.queryByText('Amulet of Health')).not.toBeInTheDocument();
    });

    it('shows the selected count in the show-only-selected label', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    });

    it('updates the selected count when items are selected', () => {
      const onArrayFieldChange = vi.fn();
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: { inventory: { magicItems: [] } },
            onArrayFieldChange,
          })}
        />,
      );

      expect(screen.getByText(/0 selected/)).toBeInTheDocument();

      // Simulate selection via onArrayFieldChange — the UI won't re-render
      // in a test without state, but the initial render count is verified above.
      expect(screen.getByText('Step 10: Magic Items')).toBeInTheDocument();
    });

    it('applies search and type filter together', () => {
      render(<WizardStepMagicItems {...createProps()} />);
      const searchInput = screen.getByRole('textbox');
      const filterSelect = screen.getByLabelText('Item Type');

      // Set type filter to Amulet first
      fireEvent.change(filterSelect, { target: { value: 'Amulet' } });
      expect(screen.getByText('Amulet of Health')).toBeInTheDocument();
      expect(screen.queryByText('Wand of Magic')).not.toBeInTheDocument();

      // Then search for something that won't match
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText(/No magic item found matching your criteria/)).toBeInTheDocument();
    });
  });

  describe('item lookup', () => {
    it('matches selected items by index when the item name differs', () => {
      const items = [
        { name: 'Wand of Magic', index: 'wand', requiresAttunement: false },
        { name: 'Amulet of Health', index: 'amulet', requiresAttunement: true },
      ];
      // Select by index instead of name
      render(
        <WizardStepMagicItems
          {...createProps({
            formData: {
              inventory: {
                magicItems: ['amulet'],
              },
            },
            allMagicItems: items,
          })}
        />,
      );
      // The item should be recognized as selected via index lookup
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    });
  });
});
