// @improved-by-ai
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

// Helper to find a beast item by name within a specific target section
function findBeastItemInSection(beastName, sectionIndex) {
    const sections = document.querySelectorAll('.animal-shapes-target-section');
    const section = sections[sectionIndex];
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

function findBeastItem(beastName) {
    return findBeastItemInSection(beastName, 0);
}

function getTransformButton() {
    return screen.getByRole('button', { name: /Transform/ });
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
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('does not close when clicking a beast item', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));
            expect(baseProps.onCancel).not.toHaveBeenCalled();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('does not close when typing in a search input', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'cro' } });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
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

        it('calls onCancel when clicking the overlay in error state', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockRejectedValueOnce(new Error('Network error'));

            render(<AnimalShapesSelectionModal {...baseProps} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load creature data.')).toBeInTheDocument();
            });

            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(baseProps.onCancel).toHaveBeenCalled();
        });
    });

    describe('loading state', () => {
        it('shows loading text while beasts are loading', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockReturnValueOnce(new Promise(() => {}));

            render(<AnimalShapesSelectionModal {...baseProps} />);

            expect(screen.getByText('Loading available creatures...')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });
    });

    describe('Transform button state', () => {
        it('is disabled by default before any selection', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText(/Choose a beast form/)).toBeInTheDocument();
            });

            const transformBtn = getTransformButton();
            expect(transformBtn).toBeDisabled();
            expect(transformBtn.textContent).toContain('0/2');
        });

        it('enables Transform when all targets have beasts selected', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            fireEvent.click(findBeastItemInSection('Panther', 1));

            await waitFor(() => {
                const transformBtn = getTransformButton();
                expect(transformBtn).toBeEnabled();
                expect(transformBtn.textContent).toContain('2/2');
            });
        });

        it('updates count display when selections change', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            await waitFor(() => {
                const transformBtn = getTransformButton();
                expect(transformBtn.textContent).toContain('1/2');
            });

            // Deselect first target
            const selectedCroc = findBeastItemInSection('Crocodile', 0);
            if (selectedCroc && selectedCroc.classList.contains('selected')) {
                fireEvent.click(selectedCroc);
            }
            await waitFor(() => {
                const transformBtn = getTransformButton();
                expect(transformBtn.textContent).toContain('0/2');
                expect(transformBtn).toBeDisabled();
            });
        });
    });

    describe('empty targets behavior', () => {
        it('disables Transform button when there are no targets', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ targets: [] })} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });

            const transformBtn = getTransformButton();
            expect(transformBtn).toBeDisabled();
            expect(transformBtn.textContent).toContain('0/0');
        });
    });

    describe('confirm behavior', () => {
        it('calls onConfirm with selected beast map when all targets have selections', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            fireEvent.click(findBeastItemInSection('Panther', 1));

            await waitFor(() => {
                const transformBtn = getTransformButton();
                expect(transformBtn).toBeEnabled();
                fireEvent.click(transformBtn);
            });

            await waitFor(() => {
                expect(baseProps.onConfirm).toHaveBeenCalled();
                const map = baseProps.onConfirm.mock.calls[0][0];
                expect(map).toHaveProperty('Alric');
                expect(map).toHaveProperty('Berenik');
            });
        });

        it('does not call onConfirm when not all targets are selected', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));

            const transformBtn = getTransformButton();
            expect(transformBtn).toBeDisabled();
            // Even if the user somehow clicks a disabled button, onConfirm should not fire
            fireEvent.click(transformBtn);
            expect(baseProps.onConfirm).not.toHaveBeenCalled();
        });

        it('passes the correct beast index in the confirm map', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            fireEvent.click(findBeastItemInSection('Panther', 1));

            await waitFor(() => {
                const transformBtn = getTransformButton();
                fireEvent.click(transformBtn);
            });

            await waitFor(() => {
                const map = baseProps.onConfirm.mock.calls[0][0];
                expect(map.Alric.index).toBe('crocodile');
                expect(map.Berenik.index).toBe('panther');
            });
        });

        it('keeps Transform button disabled when not all targets are selected with 3 targets', async () => {
            const props = makeProps({
                targets: ['Alric', 'Berenik', 'Cedric'],
            });
            render(<AnimalShapesSelectionModal {...props} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(3);
            });

            fireEvent.click(findBeastItem('Crocodile'));

            const transformBtn = getTransformButton();
            expect(transformBtn).toBeDisabled();
            expect(transformBtn.textContent).toContain('1/3');
        });
    });
});
