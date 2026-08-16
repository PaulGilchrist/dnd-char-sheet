// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Notes from './Notes.jsx';
import { useEntityManagement } from '../../hooks/useEntityManagement.js';

vi.mock('../../hooks/useEntityManagement.js', () => ({
  useEntityManagement: vi.fn(),
}));

vi.mock('../common/PreviewToggle.jsx', () => ({
  default: function PreviewToggle({ value, onChange, placeholder, label }) {
    return (
      <div className="preview-toggle-wrapper">
        {label && <label>{label}</label>}
        <textarea
          data-testid="preview-toggle-textarea"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  },
}));

const createMockHook = () => ({
  items: [],
  loading: false,
  loadItems: vi.fn(),
  saveItems: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
});

const renderNotes = (props = {}) =>
  render(
    <Notes
      campaignName="test"
      characters={[]}
      isLocalhost={true}
      onBack={() => {}}
      {...props}
    />,
  );

describe('Notes', () => {
  let originalConfirm;

  beforeEach(() => {
    useEntityManagement.mockReturnValue(createMockHook());
    originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe('rendering', () => {
    it('renders header, new note button, and search bar', () => {
      renderNotes();
      expect(screen.getByRole('heading', { name: /notes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new note/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Search notes')).toBeInTheDocument();
    });

    it('renders empty state when no notes exist', () => {
      renderNotes();
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });

    it('renders loading state when loading is true', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        loading: true,
      });
      renderNotes();
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    it('shows private lock icon for private notes', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Secret',
            partyLocation: '',
            isPrivate: true,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      expect(screen.getByTitle('Private note')).toBeInTheDocument();
    });

    it('shows location text when present and no-location placeholder when absent', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Test',
            partyLocation: 'Dungeon',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      expect(screen.getByText('Dungeon')).toBeInTheDocument();

      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '2',
            description: 'Test',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      expect(screen.getByText(/no location/i)).toBeInTheDocument();
    });

    it('renders multiple notes in a list', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'First note',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
          {
            id: '2',
            description: 'Second note',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-02-01T00:00:00.000Z',
            dateModified: '2025-02-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const listItems = screen.getAllByRole('button', { name: /edit note/i });
      expect(listItems).toHaveLength(2);
    });

    it('renders markdown content in note descriptions', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: '**bold text** and *italic text*',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      expect(screen.getByText('bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('filters notes by search query and shows no results for non-matching query', async () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Fireball is a 3rd level spell',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
          {
            id: '2',
            description: 'Thunderwave explosion',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const searchInput = screen.getByLabelText('Search notes');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText(/no notes found matching/i)).toBeInTheDocument();
    });

    it('shows matching notes when search query matches', async () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Fireball is a 3rd level spell',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
          {
            id: '2',
            description: 'Thunderwave explosion',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const searchInput = screen.getByLabelText('Search notes');
      fireEvent.change(searchInput, { target: { value: 'fireball' } });
      expect(screen.getByText('Fireball is a 3rd level spell')).toBeInTheDocument();
      expect(screen.queryByText('Thunderwave explosion')).not.toBeInTheDocument();
    });

    it('shows clear button when search query is non-empty', async () => {
      useEntityManagement.mockReturnValue(createMockHook());
      renderNotes();
      const searchInput = screen.getByLabelText('Search notes');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Fireball is a 3rd level spell',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const searchInput = screen.getByLabelText('Search notes');
      fireEvent.change(searchInput, { target: { value: 'fireball' } });
      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn);
      expect(searchInput.value).toBe('');
    });
  });

  describe('modal', () => {
    it('opens modal when new note button is clicked', () => {
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();
    });

    it('does not show private note checkbox when not localhost', () => {
      renderNotes({ isLocalhost: false });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.queryByLabelText(/private note/i)).not.toBeInTheDocument();
    });

    it('shows private note checkbox when localhost', () => {
      renderNotes({ isLocalhost: true });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByLabelText(/private note/i)).toBeInTheDocument();
    });

    it('closes modal when cancel button is clicked', () => {
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);
      expect(screen.queryByRole('heading', { name: 'New Note' })).not.toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('heading', { name: 'New Note' })).not.toBeInTheDocument();
    });

    it('closes modal when overlay is clicked', () => {
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();

      const overlay = document.querySelector('.ct-modal-overlay');
      fireEvent.click(overlay);
      expect(screen.queryByRole('heading', { name: 'New Note' })).not.toBeInTheDocument();
    });

    it('calculates party level from characters', () => {
      renderNotes({ characters: [{ level: 5 }, { level: 7 }] });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('defaults party level to 1 when no characters', () => {
      renderNotes({ characters: [] });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calculates party level with mixed levels', () => {
      renderNotes({ characters: [{ level: 1 }, { level: 2 }, { level: 3 }] });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('uses fallback level 1 for characters without level property', () => {
      renderNotes({ characters: [{}, { level: 5 }] });
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('saving notes', () => {
    it('saves a new note when save is clicked with description', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'My new note' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      expect(mock.saveItems).toHaveBeenCalled();
    });

    it('passes correct data to saveItems when creating a new note', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'My new note' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      const callArgs = mock.saveItems.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0].description).toBe('My new note');
      expect(callArgs[0].isPrivate).toBe(false);
      expect(callArgs[0].partyLocation).toBe('');
      expect(callArgs[0].dateModified).toBeDefined();
    });

    it('passes isPrivate=true when private checkbox is checked', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'Private note content' } });
      const checkbox = screen.getByLabelText(/private note/i);
      fireEvent.click(checkbox);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      const callArgs = mock.saveItems.mock.calls[0][0];
      expect(callArgs[0].isPrivate).toBe(true);
    });

    it('passes partyLocation when provided', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'Note content' } });
      const locationInput = screen.getByLabelText(/party location/i);
      fireEvent.change(locationInput, { target: { value: 'Skull Creek Cave' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      const callArgs = mock.saveItems.mock.calls[0][0];
      expect(callArgs[0].partyLocation).toBe('Skull Creek Cave');
    });

    it('does not save when description is empty', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();

      await act(async () => {
        fireEvent.click(saveBtn);
      });
      expect(mock.saveItems).not.toHaveBeenCalled();
    });

    it('does not save when description is whitespace only', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: '   \n\t  ' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();
    });

    it('closes modal after successful save', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue(mock);
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();

      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'New note' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      expect(screen.queryByRole('heading', { name: 'New Note' })).not.toBeInTheDocument();
    });

    it('updates existing note when editing', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue({
        ...mock,
        items: [
          {
            id: '1',
            description: 'Original text',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated text' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      const callArgs = mock.saveItems.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0].id).toBe('1');
      expect(callArgs[0].description).toBe('Updated text');
    });

    it('preserves existing note id when updating', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue({
        ...mock,
        items: [
          {
            id: 'abc-123',
            description: 'Original',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      const callArgs = mock.saveItems.mock.calls[0][0];
      expect(callArgs[0].id).toBe('abc-123');
    });
  });

  describe('editing notes', () => {
    it('opens edit modal when clicking a note', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Edit me',
            partyLocation: 'Cave',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    });

    it('shows delete button when editing an existing note', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Delete me',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      expect(deleteBtn).toBeInTheDocument();
    });

    it('does not show delete button when creating a new note', () => {
      renderNotes();
      const modalOpen = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(modalOpen);
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('pre-fills form with existing note data when editing', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Existing content',
            partyLocation: 'Dungeon',
            isPrivate: true,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const textarea = screen.getByTestId('preview-toggle-textarea');
      expect(textarea.value).toBe('Existing content');
      const locationInput = screen.getByLabelText(/party location/i);
      expect(locationInput.value).toBe('Dungeon');
    });
  });

  describe('deleting notes', () => {
    it('calls deleteItem when delete is confirmed', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue({
        ...mock,
        items: [
          {
            id: '1',
            description: 'Delete me',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      window.confirm.mockReturnValue(true);
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });
      expect(mock.deleteItem).toHaveBeenCalledWith('1');
    });

    it('does not delete when user cancels confirmation', async () => {
      const mock = createMockHook();
      useEntityManagement.mockReturnValue({
        ...mock,
        items: [
          {
            id: '1',
            description: 'Keep me',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      window.confirm.mockReturnValue(false);
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });
      expect(mock.deleteItem).not.toHaveBeenCalled();
    });

    it('disables delete button while deleting', async () => {
      const mock = createMockHook();
      mock.deleteItem = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      useEntityManagement.mockReturnValue({
        ...mock,
        items: [
          {
            id: '1',
            description: 'Delete me',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      window.confirm.mockReturnValue(true);
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.click(noteItem);
      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });
      expect(deleteBtn).toBeDisabled();
      expect(deleteBtn).toHaveTextContent(/deleting/i);
    });
  });

  describe('lifecycle', () => {
    it('loads notes on mount with campaignName', () => {
      const loadNotesListMock = vi.fn();
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        loadItems: loadNotesListMock,
      });
      renderNotes();
      expect(loadNotesListMock).toHaveBeenCalled();
    });
  });

  describe('keyboard accessibility', () => {
    it('opens edit modal when list item is activated via Enter key', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Keyboard test',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.keyDown(noteItem, { key: 'Enter' });
      expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    });

    it('opens edit modal when list item is activated via Space key', () => {
      useEntityManagement.mockReturnValue({
        ...createMockHook(),
        items: [
          {
            id: '1',
            description: 'Space key test',
            partyLocation: '',
            isPrivate: false,
            dateCreated: '2025-01-01T00:00:00.000Z',
            dateModified: '2025-01-15T12:00:00.000Z',
          },
        ],
      });
      renderNotes();
      const noteItem = screen.getByRole('button', { name: /edit note/i });
      fireEvent.keyDown(noteItem, { key: ' ' });
      expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    });
  });
});
