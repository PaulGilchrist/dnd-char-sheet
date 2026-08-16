// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PolymorphSelectionModal from './PolymorphSelectionModal.jsx';

// Mock dataLoader.loadMonsters to return controlled creature data
const mockMonsters = [
    {
        index: 'wolf',
        name: 'Wolf',
        type: 'Beast',
        size: 'Medium',
        challenge_rating: '1/4',
        speed: { walk: 40, climb: 20, swim: 20 },
        actions: [{ name: 'Bite' }, { name: 'Dash' }],
    },
    {
        index: 'spider',
        name: 'Giant Spider',
        type: 'Beast',
        size: 'Medium',
        challenge_rating: '1',
        speed: { walk: 20, climb: 20 },
        actions: [{ name: 'Bite' }, { name: 'Net' }],
    },
    {
        index: 'crocodile',
        name: 'Crocodile',
        type: 'Beast',
        size: 'Large',
        challenge_rating: '1',
        speed: { walk: 20, swim: 10 },
        actions: [{ name: 'Bite' }, { name: 'Grapple' }, { name: 'Swallow' }],
    },
    {
        index: 'panther',
        name: 'Panther',
        type: 'Beast',
        size: 'Small',
        challenge_rating: '1/4',
        speed: { walk: 40, climb: 20 },
        actions: [{ name: 'Bite' }],
    },
    {
        index: 'eagle',
        name: 'Eagle',
        type: 'Beast',
        size: 'Small',
        challenge_rating: '1/4',
        speed: { fly: 50 },
        actions: [{ name: 'Beak' }, { name: 'Talons' }],
    },
    {
        index: 'ghast',
        name: 'Ghast',
        type: 'Undead',
        size: 'Medium',
        challenge_rating: '2',
        speed: { walk: 40 },
        actions: [{ name: 'Claws' }],
    },
    {
        index: 'brown_bear',
        name: 'Brown Bear',
        type: 'Beast',
        size: 'Large',
        challenge_rating: '1',
        speed: { walk: 40, climb: 20 },
        actions: [{ name: 'Bite' }, { name: 'Multiattack' }, { name: 'Dash' }],
    },
    {
        index: 'rat',
        name: 'Rat',
        type: 'Beast',
        size: 'Tiny',
        challenge_rating: '0',
        speed: { walk: 20 },
        actions: [],
    },
];

vi.mock('../../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(async () => mockMonsters),
}));

const baseProps = {
    playerStats: { class: { name: 'Druid' }, level: 4, rules: '5e' },
    maxCR: 1,
    campaignName: 'test-campaign',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

function findBeastItem(beastName) {
    for (const item of document.querySelectorAll('.wild-shape-beast-item')) {
        const nameEl = item.querySelector('.wild-shape-beast-name');
        if (nameEl && nameEl.textContent.includes(beastName)) {
            return item;
        }
    }
    return null;
}

function getBeastNames() {
    const items = document.querySelectorAll('.wild-shape-beast-item');
    return Array.from(items).map(item => {
        const nameEl = item.querySelector('.wild-shape-beast-name');
        if (!nameEl) return '';
        const clone = nameEl.cloneNode(true);
        const crSpan = clone.querySelector('.wild-shape-beast-cr');
        if (crSpan) crSpan.remove();
        return clone.textContent.replace(/\s+/g, ' ').trim();
    });
}

describe('PolymorphSelectionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loading state', () => {
        it('shows loading text while data is loading', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            const originalImpl = loadMonsters.getMockImplementation();
            loadMonsters.mockReturnValue(new Promise(() => { /* never resolves */ }));

            render(<PolymorphSelectionModal {...baseProps} />);

            expect(screen.getByText('Loading available creatures...')).toBeInTheDocument();

            loadMonsters.mockImplementation(originalImpl);
        });
    });

    describe('rendering after data loads', () => {
        it('renders the modal with header and default icon', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });
            const icons = document.querySelectorAll('i.fa-solid.fa-paw');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders the instruction text with CR limit for beast mode', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Choose a beast form (CR 1 or lower)')).toBeInTheDocument();
            });
        });

        it('renders wild shape limitations info when not allowAnyCreature', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const infoDivs = document.querySelectorAll('.wild-shape-info');
                const movementText = Array.from(infoDivs).find(d => d.querySelector('strong')?.textContent === 'Movement:');
                expect(movementText).toBeInTheDocument();
                expect(movementText.textContent).toContain('walk only');
            });
        });

        it('filters out non-beast creatures when allowAnyCreature is false', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.queryByText('Ghast')).not.toBeInTheDocument();
            });
        });

        it('filters out creatures with CR above effectiveMaxCR', async () => {
            render(<PolymorphSelectionModal {...makeProps({ maxCR: 0 })} />);
            await waitFor(() => {
                expect(screen.getByText('Rat')).toBeInTheDocument();
                expect(screen.queryByText('Wolf')).not.toBeInTheDocument();
            });
        });

        it('filters beasts that lack walk speed per wild shape limitations', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                // Eagle has only fly speed, should be filtered out
                expect(screen.queryByText('Eagle')).not.toBeInTheDocument();
                // Crocodile has walk: 20, so it passes the walk filter
                expect(screen.getByText('Crocodile')).toBeInTheDocument();
            });
        });

        it('renders beast names in the list', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
                expect(screen.getByText('Giant Spider')).toBeInTheDocument();
                expect(screen.getByText('Brown Bear')).toBeInTheDocument();
            });
        });

        it('renders CR for each beast', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.wild-shape-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 0');
                expect(crs).toContain('CR 0.25');
                expect(crs).toContain('CR 1');
            });
        });

        it('renders speed info for beasts', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.wild-shape-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Walk 40'))).toBe(true);
            });
        });

        it('renders actions summary for beasts', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const actionTexts = document.querySelectorAll('.wild-shape-beast-actions');
                const actions = Array.from(actionTexts).map(el => el.textContent.trim());
                expect(actions.some(a => a.includes('Bite, Grapple, Swallow'))).toBe(true);
            });
        });

        it('shows "No actions" for beasts with empty actions array', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Rat')).toBeInTheDocument();
            });
            const ratItem = findBeastItem('Rat');
            expect(ratItem).toBeInTheDocument();
            expect(ratItem.querySelector('.wild-shape-beast-actions').textContent).toBe('No actions');
        });

        it('renders search input', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search beasts...')).toBeInTheDocument();
            });
        });

        it('disables the confirm button when no beast is selected', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const confirmBtn = screen.getByRole('button', { name: 'Wild Shape' });
                expect(confirmBtn).toBeDisabled();
            });
        });
    });

    describe('search functionality', () => {
        it('filters beasts by name when searching', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Crocodile')).toBeInTheDocument();
                expect(screen.getByText('Panther')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'cro' } });

            await waitFor(() => {
                const names = getBeastNames();
                expect(names).toContain('Crocodile');
                expect(names).not.toContain('Panther');
            });
        });

        it('clears search filter when input is cleared', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Crocodile')).toBeInTheDocument();
                expect(screen.getByText('Panther')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'cro' } });
            await waitFor(() => {
                const names = getBeastNames();
                expect(names).not.toContain('Panther');
            });

            fireEvent.change(input, { target: { value: '' } });
            await waitFor(() => {
                const names = getBeastNames();
                expect(names).toContain('Panther');
            });
        });

        it('shows "No beasts match" when search has no results', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Crocodile')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'xyznonexistent' } });

            await waitFor(() => {
                expect(screen.getByText(/No beasts match/)).toBeInTheDocument();
            });
        });

        it('performs case-insensitive search', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'WOLF' } });

            await waitFor(() => {
                const names = getBeastNames();
                expect(names).toContain('Wolf');
            });
        });

        it('filters based on already-filtered beast list', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.queryByText('Eagle')).not.toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'eagle' } });

            await waitFor(() => {
                expect(screen.getByText(/No beasts match/)).toBeInTheDocument();
            });
        });
    });

    describe('beast selection', () => {
        it('selects a beast, enables confirm, and calls onConfirm with correct data', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });

            // Confirm button starts disabled
            const confirmBtn = screen.getByRole('button', { name: 'Wild Shape' });
            expect(confirmBtn).toBeDisabled();

            // Click to select Wolf
            const wolfItem = findBeastItem('Wolf');
            expect(wolfItem).toBeInTheDocument();
            fireEvent.click(wolfItem);

            // Confirm button should be enabled
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Wild Shape' })).toBeEnabled();
            });

            // Verify selection visual state
            const selectedItem = document.querySelector('.wild-shape-beast-item.selected');
            expect(selectedItem).toBeInTheDocument();
            const selectedName = selectedItem.querySelector('.wild-shape-beast-name').textContent;
            expect(selectedName).toContain('Wolf');

            // Click confirm
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(baseProps.onConfirm).toHaveBeenCalled();
                const selected = baseProps.onConfirm.mock.calls[0][0];
                expect(selected.index).toBe('wolf');
            });
        });

        it('switches selection to a different beast', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
                expect(screen.getByText('Brown Bear')).toBeInTheDocument();
            });

            const wolfItem = findBeastItem('Wolf');
            fireEvent.click(wolfItem);
            await waitFor(() => {
                expect(document.querySelector('.wild-shape-beast-item.selected')).toBeInTheDocument();
            });

            const bearItem = findBeastItem('Brown Bear');
            fireEvent.click(bearItem);
            await waitFor(() => {
                const selected = document.querySelector('.wild-shape-beast-item.selected');
                const nameEl = selected.querySelector('.wild-shape-beast-name');
                expect(nameEl.textContent).toContain('Brown Bear');
            });
        });

        it('does not call onConfirm when confirm button is not clicked', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });
            expect(baseProps.onConfirm).not.toHaveBeenCalled();
        });

        it('does not call onConfirm if no beast is selected', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const confirmBtn = screen.getByRole('button', { name: 'Wild Shape' });
                expect(confirmBtn).toBeDisabled();
                fireEvent.click(confirmBtn);
            });
            expect(baseProps.onConfirm).not.toHaveBeenCalled();
        });
    });

    describe('close behavior', () => {
        it('calls onCancel when Cancel button is clicked', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('calls onCancel when clicking the overlay background', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });

            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('does not close when clicking inside the modal content', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });

            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not close when clicking a beast item', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });

            const wolfItem = findBeastItem('Wolf');
            expect(wolfItem).toBeInTheDocument();
            fireEvent.click(wolfItem);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not close when typing in the search input', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Search beasts...');
            fireEvent.change(input, { target: { value: 'wolf' } });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('closes when Escape key is pressed', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });

            fireEvent.keyDown(document, { key: 'Escape' });
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('does not close when other keys are pressed', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });

            fireEvent.keyDown(document, { key: 'Enter' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();

            fireEvent.keyDown(document, { key: ' ' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });
});
