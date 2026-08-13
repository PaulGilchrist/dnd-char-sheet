import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settlements from './Settlements.jsx';

// Module-level mock store for useEntityManagement — vi.mock closure captures this object.
const settlementMockStore = {
  items: [],
  loading: false,
  loadItems: vi.fn(),
  deleteItem: vi.fn(),
  saveItems: vi.fn(),
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

// Module-level mock service functions — vi.mock closure captures these by reference.
const mockSaveSettlement = vi.fn();
const mockDeleteSettlement = vi.fn();

vi.mock('../../services/campaign/settlementsService.js', () => ({
  loadSettlements: vi.fn(),
  saveSettlement: (...args) => mockSaveSettlement(...args),
  deleteSettlement: (...args) => mockDeleteSettlement(...args),
}));

describe('Settlements - save and delete behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSettlement.mockResolvedValue({ success: true });
    mockDeleteSettlement.mockResolvedValue({ success: true });
    settlementMockStore.deleteItem.mockResolvedValue({});
    settlementMockStore.loadItems.mockResolvedValue(undefined);
    settlementMockStore.items = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls saveSettlement with campaign name, formData, and oldName when editing an existing settlement', async () => {
    settlementMockStore.items = [
      { name: 'Old Name', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
    ];
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const editBtn = screen.getByRole('button', { name: /edit settlement/i });
    fireEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveSettlement).toHaveBeenCalledWith('test', expect.objectContaining({ name: 'New Name' }), 'Old Name');
    });
  });

  it('calls saveSettlement with undefined oldName when creating a new settlement', async () => {
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveSettlement).toHaveBeenCalledWith('test', expect.objectContaining({ name: 'My Settlement' }), undefined);
    });
  });

  it('calls loadItems after successful save and closes modal', async () => {
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveSettlement).toHaveBeenCalled();
      expect(settlementMockStore.loadItems).toHaveBeenCalled();
    });

    expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
  });

  it('does not call saveSettlement when name is only whitespace', async () => {
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {});
    expect(mockSaveSettlement).not.toHaveBeenCalled();
  });

  it('disables the save button while saving is in progress', async () => {
    mockSaveSettlement.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));

    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent('Saving…');

    // Wait for save to complete and modal to close
    await waitFor(() => {
      expect(mockSaveSettlement).toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'New Settlement' })).not.toBeInTheDocument();
    });
  });

  it('disables the save button and keeps modal open when save fails', async () => {
    mockSaveSettlement.mockRejectedValue(new Error('Save failed'));

    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    expect(saveBtn).toBeDisabled();

    await waitFor(() => {
      expect(mockSaveSettlement).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(saveBtn).not.toBeDisabled();
    });
    expect(screen.getByRole('heading', { name: 'New Settlement' })).toBeInTheDocument();
  });

  it('does not call saveSettlement when name input is empty', async () => {
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    expect(mockSaveSettlement).not.toHaveBeenCalled();
  });

  it('does not call deleteSettlement when user cancels confirmation', async () => {
    vi.spyOn(globalThis.window, 'confirm').mockReturnValue(false);

    settlementMockStore.items = [
      { name: 'Keep Me', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
    ];
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const editBtn = screen.getByRole('button', { name: /edit settlement/i });
    fireEvent.click(editBtn);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(mockDeleteSettlement).not.toHaveBeenCalled();
    expect(settlementMockStore.deleteItem).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
  });

  it('calls deleteSettlement with settlement name when user confirms deletion', async () => {
    vi.spyOn(globalThis.window, 'confirm').mockReturnValue(true);

    settlementMockStore.items = [
      { name: 'Delete Me', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
    ];
    render(<Settlements campaignName="test" onBack={() => {}} />);

    const editBtn = screen.getByRole('button', { name: /edit settlement/i });
    fireEvent.click(editBtn);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(settlementMockStore.deleteItem).toHaveBeenCalledWith('Delete Me');
    });
  });

  it('disables the delete button and shows deleting text during delete', async () => {
    vi.spyOn(globalThis.window, 'confirm').mockReturnValue(true);

    settlementMockStore.items = [
      { name: 'Deleting...', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
    ];
    settlementMockStore.deleteItem.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({}), 100)));

    render(<Settlements campaignName="test" onBack={() => {}} />);

    const editBtn = screen.getByRole('button', { name: /edit settlement/i });
    fireEvent.click(editBtn);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(deleteBtn).toBeDisabled();
    expect(screen.getByText('Deleting…')).toBeInTheDocument();

    // Wait for delete to complete and modal to close
    await waitFor(() => {
      expect(settlementMockStore.deleteItem).toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'Edit Settlement' })).not.toBeInTheDocument();
    });
  });

  it('keeps modal open when delete fails', async () => {
    vi.spyOn(globalThis.window, 'confirm').mockReturnValue(true);

    settlementMockStore.items = [
      { name: 'Keep Me', size: 'village', population: '', tags: '', services: [], description: '', atmosphere: '', government: '', notableNPCs: [], rumors: [], notes: '', threat: '' },
    ];
    settlementMockStore.deleteItem.mockRejectedValue(new Error('Delete failed'));

    render(<Settlements campaignName="test" onBack={() => {}} />);

    const editBtn = screen.getByRole('button', { name: /edit settlement/i });
    fireEvent.click(editBtn);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(settlementMockStore.deleteItem).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: 'Edit Settlement' })).toBeInTheDocument();
  });

  it('disables cancel button while saving', async () => {
    mockSaveSettlement.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));

    render(<Settlements campaignName="test" onBack={() => {}} />);

    const newBtn = screen.getByRole('button', { name: /new settlement/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByRole('textbox', { name: /name\s?\*/i });
    fireEvent.change(nameInput, { target: { value: 'My Settlement' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeDisabled();
  });
});
