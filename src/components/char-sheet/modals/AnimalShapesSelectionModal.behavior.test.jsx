import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimalShapesSelectionModal from './AnimalShapesSelectionModal.jsx';

const mockBeasts = [
    {
        index: 'wolf',
        name: 'Wolf',
        type: 'Beast',
        size: 'Large',
        challenge_rating: '1/4',
        speed: { walk: 40, climb: 20, swim: 20 },
        actions: [{ name: 'Bite' }, { name: 'Dash' }],
    },
    {
        index: 'spider',
        name: 'Giant Spider',
        type: 'Beast',
        size: 'Large',
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
        index: 'bear',
        name: 'Brown Bear',
        type: 'Beast',
        size: 'Large',
        challenge_rating: '1',
        speed: { walk: 40, climb: 20 },
        actions: [{ name: 'Bite' }, { name: 'Multiattack' }, { name: 'Dash' }],
    },
];

vi.mock('../../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(async () => mockBeasts),
}));

const baseProps = {
    targets: ['Alric', 'Berenik'],
    maxCR: 4,
    campaignName: 'test-campaign',
    title: 'Animal Shapes',
    icon: 'fa-paw',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

function findBeastItem(beastName) {
    const sections = document.querySelectorAll('.animal-shapes-target-section');
    const section = sections[0];
    if (!section) return null;
    const items = section.querySelectorAll('.animal-shapes-beast-item');
    for (const item of items) {
        const nameEl = item.querySelector('.animal-shapes-beast-name');
        if (nameEl && nameEl.childNodes[0].textContent.trim() === beastName) {
            return item;
        }
    }
    return null;
}

describe('AnimalShapesSelectionModal - behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('close behavior', () => {
        it('calls onCancel when Cancel button is clicked', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('calls onCancel when clicking the overlay background', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });

            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('does not close when clicking inside the modal content', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });

            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not close when clicking a beast item', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not close when typing in a search input', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'cro' } });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('closes when Escape key is pressed', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });

            fireEvent.keyDown(document, { key: 'Escape' });
            expect(baseProps.onCancel).toHaveBeenCalled();
        });

        it('does not close when other keys are pressed', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });

            fireEvent.keyDown(document, { key: 'Enter' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();

            fireEvent.keyDown(document, { key: ' ' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('renders error message when loadMonsters fails', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockRejectedValueOnce(new Error('Network error'));

            render(<AnimalShapesSelectionModal {...baseProps} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load creature data.')).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });
        });

        it('calls onCancel when Close button is clicked in error state', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockRejectedValueOnce(new Error('Network error'));

            render(<AnimalShapesSelectionModal {...baseProps} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
            expect(baseProps.onCancel).toHaveBeenCalled();
        });
    });

    describe('single target', () => {
        it('renders a single target section', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ targets: ['SoloTarget'] })} />);
            await waitFor(() => {
                expect(screen.getByText('SoloTarget')).toBeInTheDocument();
                expect(screen.getByText(/Transform \(0\/1\)/)).toBeInTheDocument();
            });
        });

        it('enables Transform when the single target has a beast selected', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ targets: ['SoloTarget'] })} />);
            await waitFor(() => {
                expect(screen.getByText('Crocodile')).toBeInTheDocument();
            });

            fireEvent.click(findBeastItem('Crocodile'));
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeEnabled();
                expect(transformBtn.textContent).toContain('1/1');
            });
        });
    });
});
