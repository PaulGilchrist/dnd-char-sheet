import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimalShapesSelectionModal from './AnimalShapesSelectionModal.jsx';

// Mock dataLoader.loadMonsters to return controlled beast data
// Filtering rules: type='beast' (case-insensitive), CR <= maxCR, size Small or Large only
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

// Helper to extract beast name from a beast-item element
function getBeastName(itemEl) {
    const nameEl = itemEl.querySelector('.animal-shapes-beast-name');
    return nameEl ? nameEl.childNodes[0].textContent.trim() : '';
}

// Helper to find a beast item by name within a specific target section
function findBeastItemInSection(beastName, sectionIndex) {
    const sections = document.querySelectorAll('.animal-shapes-target-section');
    const section = sections[sectionIndex];
    if (!section) return null;
    const items = section.querySelectorAll('.animal-shapes-beast-item');
    for (const item of items) {
        if (getBeastName(item) === beastName) {
            return item;
        }
    }
    return null;
}

// Helper to find a beast item by name across all target sections (first match, section 0)
function findBeastItem(beastName) {
    return findBeastItemInSection(beastName, 0);
}

describe('AnimalShapesSelectionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loading state', () => {
        it('renders the modal container', () => {
            const { container } = render(<AnimalShapesSelectionModal {...baseProps} />);
            expect(container.querySelector('.sp-modal')).toBeInTheDocument();
        });
    });

    describe('rendering after data loads', () => {
        it('renders the modal with header and icon', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });
            const icons = document.querySelectorAll('i.fa-solid.fa-paw');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders the instruction text with CR limit', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText(/Choose a beast form \(CR 4 or lower, Small or Large\)/)).toBeInTheDocument();
            });
        });

        it('renders sections for each target', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Alric')).toBeInTheDocument();
                expect(screen.getByText('Berenik')).toBeInTheDocument();
            });
        });

        it('renders beast names in the filtered list', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Wolf').length).toBe(2);
                expect(screen.getAllByText('Giant Spider').length).toBe(2);
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Panther').length).toBe(2);
                expect(screen.getAllByText('Eagle').length).toBe(2);
                expect(screen.getAllByText('Brown Bear').length).toBe(2);
            });
        });

        it('filters out non-beast creatures', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.queryAllByText('Ghast').length).toBe(0);
            });
        });

        it('filters out creatures with CR above maxCR', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ maxCR: 0.1 })} />);
            await waitFor(() => {
                const notes = document.querySelectorAll('.sp-note');
                expect(notes.length).toBe(2);
            });
        });

        it('filters out creatures that are not Small or Large', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Wolf').length).toBe(2);
                expect(screen.getAllByText('Giant Spider').length).toBe(2);
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Panther').length).toBe(2);
                expect(screen.getAllByText('Eagle').length).toBe(2);
                expect(screen.getAllByText('Brown Bear').length).toBe(2);
            });
        });

        it('renders CR and size for each beast', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.animal-shapes-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 0.25');
                expect(crs).toContain('CR 1');
            });
        });

        it('renders speed info for beasts', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Walk 40'))).toBe(true);
            });
        });

        it('renders actions summary for beasts', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const actionTexts = document.querySelectorAll('.animal-shapes-beast-actions');
                const actions = Array.from(actionTexts).map(el => el.textContent.trim());
                expect(actions.some(a => a.includes('Bite, Grapple, Swallow'))).toBe(true);
            });
        });

        it('renders search inputs for each target', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                expect(inputs.length).toBe(2);
                expect(inputs[0]).toHaveAttribute('placeholder', 'Search beasts for Alric...');
                expect(inputs[1]).toHaveAttribute('placeholder', 'Search beasts for Berenik...');
            });
        });

        it('renders Cancel button', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            });
        });

        it('renders Transform button with count', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeInTheDocument();
                expect(transformBtn.textContent).toContain('0/2');
            });
        });

        it('disables Transform button when not all targets have beasts selected', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeDisabled();
            });
        });
    });

    describe('search functionality', () => {
        function getBeastNamesInSection(sectionEl) {
            const items = sectionEl.querySelectorAll('.animal-shapes-beast-item');
            return Array.from(items).map(getBeastName);
        }

        it('filters beasts by name when searching', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Panther').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'cro' } });

            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                const firstNames = getBeastNamesInSection(firstSection);
                expect(firstNames).toContain('Crocodile');
                expect(firstNames).not.toContain('Panther');
            });
        });

        it('search is per-target (does not affect other targets)', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Eagle').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'cro' } });

            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                const firstNames = getBeastNamesInSection(firstSection);
                expect(firstNames).toContain('Crocodile');
                expect(firstNames).not.toContain('Eagle');

                const secondSection = document.querySelectorAll('.animal-shapes-target-section')[1];
                const secondNames = getBeastNamesInSection(secondSection);
                expect(secondNames).toContain('Eagle');
            });
        });

        it('clears search filter when input is cleared', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Panther').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'cro' } });
            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                const firstNames = getBeastNamesInSection(firstSection);
                expect(firstNames).not.toContain('Panther');
            });

            fireEvent.change(inputs[0], { target: { value: '' } });
            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                const firstNames = getBeastNamesInSection(firstSection);
                expect(firstNames).toContain('Panther');
            });
        });

        it('shows "No beasts match" when search has no results', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'xyznonexistent' } });

            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                expect(firstSection.querySelector('.sp-note')).toBeInTheDocument();
            });
        });

        it('performs case-insensitive search', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Eagle').length).toBe(2);
            });

            const inputs = document.querySelectorAll('input[type="text"]');
            fireEvent.change(inputs[0], { target: { value: 'EAGLE' } });

            await waitFor(() => {
                const firstSection = document.querySelectorAll('.animal-shapes-target-section')[0];
                const firstNames = getBeastNamesInSection(firstSection);
                expect(firstNames).toContain('Eagle');
                expect(firstNames).not.toContain('Crocodile');
            });
        });
    });

    describe('beast selection', () => {
        it('selects a beast when clicking on it', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const crocItem = findBeastItem('Crocodile');
            fireEvent.click(crocItem);

            await waitFor(() => {
                const selectedBadge = document.querySelector('.animal-shapes-selected-badge');
                expect(selectedBadge).toBeInTheDocument();
                expect(selectedBadge.textContent).toContain('Crocodile');
            });
        });

        it('toggles selection off when clicking the same beast again', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const crocItem = findBeastItem('Crocodile');
            fireEvent.click(crocItem);
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge')).toBeInTheDocument();
            });

            const selectedCroc = document.querySelector('.animal-shapes-beast-item.selected');
            expect(getBeastName(selectedCroc)).toBe('Crocodile');
            fireEvent.click(selectedCroc);
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge')).not.toBeInTheDocument();
            });
        });

        it('switches selection to a different beast for the same target', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Brown Bear').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge').textContent).toContain('Crocodile');
            });

            fireEvent.click(findBeastItem('Brown Bear'));
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge').textContent).toContain('Brown Bear');
            });
        });

        it('allows independent selection per target', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
                expect(screen.getAllByText('Panther').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge').textContent).toContain('Crocodile');
            });

            fireEvent.click(findBeastItemInSection('Panther', 1));
            await waitFor(() => {
                const badges = document.querySelectorAll('.animal-shapes-selected-badge');
                expect(badges.length).toBe(2);
            });
        });

        it('updates Transform button count when beasts are selected', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            let transformBtn = screen.getByRole('button', { name: /Transform/ });
            expect(transformBtn.textContent).toContain('0/2');

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            await waitFor(() => {
                transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn.textContent).toContain('1/2');
            });

            fireEvent.click(findBeastItemInSection('Panther', 1));
            await waitFor(() => {
                transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn.textContent).toContain('2/2');
            });
        });

        it('enables Transform button when all targets have beasts selected', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            await waitFor(() => {
                expect(document.querySelector('.animal-shapes-selected-badge')).toBeInTheDocument();
            });

            fireEvent.click(findBeastItemInSection('Panther', 1));
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeEnabled();
            });
        });

        it('applies selected CSS class to selected beast items', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));

            await waitFor(() => {
                const selectedItem = document.querySelector('.animal-shapes-beast-item.selected');
                expect(selectedItem).toBeInTheDocument();
            });
        });

        it('shows selected beast name in target header badge', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItem('Crocodile'));

            await waitFor(() => {
                const badge = document.querySelector('.animal-shapes-selected-badge');
                expect(badge).toBeInTheDocument();
                expect(badge.textContent).toContain('Crocodile');
            });
        });

        it('deselecting a beast disables the Transform button', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            fireEvent.click(findBeastItemInSection('Crocodile', 0));
            fireEvent.click(findBeastItemInSection('Panther', 1));
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeEnabled();
            });

            const selectedCroc = findBeastItemInSection('Crocodile', 0);
            if (selectedCroc && selectedCroc.classList.contains('selected')) {
                fireEvent.click(selectedCroc);
            }
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeDisabled();
            });
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
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
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

            const transformBtn = screen.getByRole('button', { name: /Transform/ });
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
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                fireEvent.click(transformBtn);
            });

            await waitFor(() => {
                const map = baseProps.onConfirm.mock.calls[0][0];
                expect(map.Alric.index).toBe('crocodile');
                expect(map.Berenik.index).toBe('panther');
            });
        });

        it('keeps Transform button disabled when not all targets are selected', async () => {
            const props = makeProps({
                targets: ['Alric', 'Berenik', 'Cedric'],
            });
            render(<AnimalShapesSelectionModal {...props} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(3);
            });

            fireEvent.click(findBeastItem('Crocodile'));

            const transformBtn = screen.getByRole('button', { name: /Transform/ });
            expect(transformBtn).toBeDisabled();
        });
    });
});
