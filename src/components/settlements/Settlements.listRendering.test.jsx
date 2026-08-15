// @improved-by-ai
// List rendering details only: size badges, population, service counts, tags,
// and description previews. Intentionally NOT duplicated here (covered in
// sibling files):
//   - size-only filtering (a filter excludes non-matching settlements)
//       -> Settlements.filtering.test.jsx
//   - loading / empty / no-results states, modal open/close, generate flow
//       -> Settlements.modalActions.test.jsx
//   - list item keyboard handling and accessible names
//       -> Settlements.accessibility.test.jsx
//   - row-level form CRUD and save/delete flows
//       -> Settlements.crudOperations / serviceNPCRumor / saveDelete.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store captured by the vi.mock factory. Tests mutate its
// `items` field before rendering so the component reads fresh state.
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

const renderSettlements = () =>
  render(<Settlements campaignName="test" onBack={() => {}} />);

const getSettlementItem = (name) =>
  screen.getByRole('button', { name: new RegExp(`edit settlement: ${name}`, 'i') });

const withinListItem = (name) => within(getSettlementItem(name));

// The description preview is a plain <p> with no accessible role, so it is
// located by its class within the settlement list item.
const getSettlementPreview = (name) =>
  getSettlementItem(name).querySelector('.settlements-list-preview');

// Size filter buttons are the only elements carrying a `Filter:` tooltip; the
// size badges in the list use a bare lowercase size title. This query is exact
// and unambiguous, unlike matching button names, which collide with the
// aria-label of settlement list items (e.g. "Edit settlement: Fire Village").
const getSizeFilterButton = (sizeLabel) => screen.getByTitle(`Filter: ${sizeLabel}`);

describe('Settlements - list rendering details', () => {
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

  describe('Size badges', () => {
    it('renders a badge showing each settlement size with its size-specific icon', () => {
      settlementMockStore.items = [
        makeSettlement('Fireport', { size: 'town' }),
        makeSettlement('Iceholm', { size: 'village' }),
        makeSettlement('Goldhaven', { size: 'city' }),
      ];
      renderSettlements();

      const townBadge = withinListItem('Fireport').getByTitle('town');
      expect(townBadge).toHaveTextContent('town');
      expect(townBadge.querySelector('i')).toHaveClass('fa-solid', 'fa-hotel');

      const villageBadge = withinListItem('Iceholm').getByTitle('village');
      expect(villageBadge).toHaveTextContent('village');
      expect(villageBadge.querySelector('i')).toHaveClass('fa-solid', 'fa-house-chimney');

      const cityBadge = withinListItem('Goldhaven').getByTitle('city');
      expect(cityBadge).toHaveTextContent('city');
      expect(cityBadge.querySelector('i')).toHaveClass('fa-solid', 'fa-city');
    });

    it('does not render a size badge for a settlement without a size', () => {
      settlementMockStore.items = [makeSettlement('Mysterious Hollow', { size: '' })];
      renderSettlements();

      expect(getSettlementItem('Mysterious Hollow').querySelector('.settlements-size-badge')).toBeNull();
    });
  });

  describe('List metadata', () => {
    it('shows the population inside each settlement list item', () => {
      settlementMockStore.items = [
        makeSettlement('Fireport', { population: '1,500 souls' }),
        makeSettlement('Goldhaven', { population: '25,000 souls' }),
      ];
      renderSettlements();

      expect(withinListItem('Fireport').getByText('1,500 souls')).toBeInTheDocument();
      expect(withinListItem('Goldhaven').getByText('25,000 souls')).toBeInTheDocument();
    });

    it('shows the service count with correct pluralization', () => {
      const inn = { type: 'inn', name: 'The Rusty Anchor', description: 'A fine inn' };
      const smithy = { type: 'blacksmith', name: 'Ironworks', description: 'Quality steel' };
      settlementMockStore.items = [
        makeSettlement('Fireport', { services: [inn, smithy] }),
        makeSettlement('Goldhaven', { services: [inn] }),
      ];
      renderSettlements();

      expect(withinListItem('Fireport').getByText('2 services')).toBeInTheDocument();
      expect(withinListItem('Goldhaven').getByText('1 service')).toBeInTheDocument();
    });

    it('shows the tags for settlements that have them', () => {
      settlementMockStore.items = [
        makeSettlement('Fireport', { tags: 'coastal, trade' }),
        makeSettlement('Goldhaven', { tags: 'trade hub' }),
      ];
      renderSettlements();

      expect(withinListItem('Fireport').getByText('coastal, trade')).toBeInTheDocument();
      expect(withinListItem('Goldhaven').getByText('trade hub')).toBeInTheDocument();
    });

    it('does not render a service count when a settlement has no services', () => {
      settlementMockStore.items = [makeSettlement('Quiet Hollow', { services: [] })];
      renderSettlements();

      expect(getSettlementItem('Quiet Hollow').querySelector('.settlements-list-services')).toBeNull();
    });

    it('does not render a tags row when a settlement has no tags', () => {
      settlementMockStore.items = [makeSettlement('Quiet Hollow', { tags: '' })];
      renderSettlements();

      expect(getSettlementItem('Quiet Hollow').querySelector('.settlements-list-tags')).toBeNull();
    });
  });

  describe('Description previews', () => {
    it('truncates a description longer than 120 characters to 120 characters plus an ellipsis', () => {
      const longDescription = 'The town of Fireport sits at the mouth of a volcanic gorge, its streets paved with ash and cinder. Blacksmiths hammer through the night while ships unload raw ore beneath plumes of smoke.';
      settlementMockStore.items = [makeSettlement('Fireport', { description: longDescription })];
      renderSettlements();

      const preview = getSettlementPreview('Fireport');
      expect(preview.textContent).toBe(`${longDescription.slice(0, 120)}…`);
      expect(preview.textContent).not.toContain(longDescription.slice(120));
    });

    it('shows a description of 120 characters or fewer in full', () => {
      const shortDescription = 'A short description under 120 chars';
      settlementMockStore.items = [makeSettlement('ShortDesc', { description: shortDescription })];
      renderSettlements();

      expect(withinListItem('ShortDesc').getByText(shortDescription)).toBeInTheDocument();
    });

    it('treats a 120-character description as short but truncates a 121-character one', () => {
      const exactly120 = 'a'.repeat(120);
      const over120 = 'b'.repeat(121);
      settlementMockStore.items = [
        makeSettlement('Exact Town', { description: exactly120 }),
        makeSettlement('Over Town', { description: over120 }),
      ];
      renderSettlements();

      expect(withinListItem('Exact Town').getByText(exactly120)).toBeInTheDocument();
      expect(getSettlementPreview('Over Town').textContent).toBe(`${'b'.repeat(120)}…`);
    });

    it('does not render a description preview when the description is empty', () => {
      settlementMockStore.items = [makeSettlement('Quiet Hollow', { description: '' })];
      renderSettlements();

      expect(getSettlementPreview('Quiet Hollow')).toBeNull();
    });
  });

  describe('Size filter buttons', () => {
    it('renders all four size filter buttons', () => {
      renderSettlements();

      ['Village', 'Town', 'City', 'Metropolis'].forEach((label) => {
        expect(getSizeFilterButton(label)).toBeInTheDocument();
      });
    });

    it('toggles the active state of a size filter button', () => {
      renderSettlements();

      const villageFilter = getSizeFilterButton('Village');
      expect(villageFilter).not.toHaveClass('settlements-size-btn-active');

      fireEvent.click(villageFilter);
      expect(villageFilter).toHaveClass('settlements-size-btn-active');

      fireEvent.click(villageFilter);
      expect(villageFilter).not.toHaveClass('settlements-size-btn-active');
    });
  });
});
