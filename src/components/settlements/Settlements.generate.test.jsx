// @improved-by-ai
// Generate-settlement behavior only. Intentionally NOT duplicated here
// (covered in sibling files):
//   - generate button disabled / "Generating…" label / re-enabled on success
//       -> Settlements.modalActions.test.jsx
//   - modal open/close mechanics for new and edit settlements
//       -> Settlements.modalActions.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settlements from './Settlements.jsx';
import { generateSettlement } from '../../services/campaign/settlementGenerator.js';

// Module-level mock store captured by the vi.mock factory. Tests mutate its
// `items` field before rendering so the component reads fresh state.
const settlementMockStore = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
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

const generatedSettlement = {
  name: 'Generated Town',
  size: 'town',
  description: 'A bustling town of brick and smoke.',
  atmosphere: 'Lively',
  government: 'Council of Elders',
  population: '1,500 souls',
  services: [{ type: 'inn', name: 'The Rusty Anchor', description: 'A fine inn' }],
  notableNPCs: [{ name: 'Mayor Aldric', role: 'Mayor', description: 'Old and shrewd' }],
  rumors: ['A dragon sleeps in the hills'],
  tags: 'generated',
  notes: '',
  threat: 'Bandits',
};

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

let consoleErrorSpy;

const renderSettlements = () => render(<Settlements campaignName="test" onBack={() => {}} />);

const clickGenerate = () => {
  fireEvent.click(screen.getByRole('button', { name: /generate settlement/i }));
};

describe('Settlements - generate settlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settlementMockStore.items = [];
    settlementMockStore.loading = false;
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    vi.mocked(generateSettlement).mockResolvedValue(generatedSettlement);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

  it('passes the current settlement list to the generator so it can avoid name collisions', async () => {
    settlementMockStore.items = [makeSettlement('Existing Town')];
    renderSettlements();
    clickGenerate();

    await waitFor(() => {
      expect(generateSettlement).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Existing Town' })]),
      );
    });
  });

  it('opens the new settlement modal prefilled with every generated field', async () => {
    renderSettlements();
    clickGenerate();

    expect(await screen.findByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: /name\s?\*/i })).toHaveValue('Generated Town');
    expect(screen.getByRole('combobox', { name: /size/i })).toHaveValue('town');
    expect(screen.getByLabelText('Population')).toHaveValue('1,500 souls');
    expect(screen.getByLabelText(/tags/i)).toHaveValue('generated');
    expect(screen.getByTestId('preview-toggle-settlement-government')).toHaveValue('Council of Elders');
    expect(screen.getByTestId('preview-toggle-settlement-description')).toHaveValue('A bustling town of brick and smoke.');
    expect(screen.getByTestId('preview-toggle-settlement-atmosphere')).toHaveValue('Lively');
    expect(screen.getByPlaceholderText(/current dangers or tensions/i)).toHaveValue('Bandits');

    expect(screen.getByDisplayValue('The Rusty Anchor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mayor Aldric')).toBeInTheDocument();
    expect(screen.getByTestId('preview-toggle-settlement-rumor-0')).toHaveValue('A dragon sleeps in the hills');

    // Generated output is a draft for a new settlement, not an edit in place.
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('logs the error, keeps the modal closed, and re-enables the button when generation fails', async () => {
    vi.mocked(generateSettlement).mockRejectedValueOnce(new Error('Generation failed'));
    renderSettlements();
    const genBtn = screen.getByRole('button', { name: /generate settlement/i });
    clickGenerate();

    await waitFor(() => {
      expect(generateSettlement).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to generate settlement:', expect.any(Error));
    });

    await waitFor(() => {
      expect(genBtn).toBeEnabled();
    });

    expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
  });
});
