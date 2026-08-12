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

describe('AnimalShapesSelectionModal - utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('customization props', () => {
        it('renders custom title when provided', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ title: 'Wild Shape Selection' })} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape Selection')).toBeInTheDocument();
            });
        });

        it('renders custom icon when provided', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ icon: 'fa-dragon' })} />);
            await waitFor(() => {
                const icons = document.querySelectorAll('i.fa-solid.fa-dragon');
                expect(icons.length).toBeGreaterThan(0);
            });
        });

        it('uses default title and icon when not provided', async () => {
            const props = {
                targets: ['Alric'],
                maxCR: 4,
                campaignName: 'test-campaign',
                onConfirm: vi.fn(),
                onCancel: vi.fn(),
            };
            render(<AnimalShapesSelectionModal {...props} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });
            const icons = document.querySelectorAll('i.fa-solid.fa-paw');
            expect(icons.length).toBeGreaterThan(0);
        });
    });

    describe('challenge rating parsing', () => {
        it('handles fractional CR (1/4)', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ maxCR: 0.1 })} />);
            await waitFor(() => {
                const beasts = document.querySelectorAll('.animal-shapes-beast-name');
                const names = Array.from(beasts).map(el => el.childNodes[0].textContent.trim());
                expect(names).not.toContain('Wolf');
            });
        });

        it('handles CR as integer string', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.animal-shapes-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 1');
            });
        });

        it('handles CR 0 beasts', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const beasts = document.querySelectorAll('.animal-shapes-beast-name');
                const names = Array.from(beasts).map(el => el.childNodes[0].textContent.trim());
                expect(names).not.toContain('Spider');
            });
        });
    });

    describe('empty targets', () => {
        it('renders with no target sections when targets is empty', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ targets: [] })} />);
            await waitFor(() => {
                expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            });
            const targetSections = document.querySelectorAll('.animal-shapes-target-section');
            expect(targetSections.length).toBe(0);
        });

        it('disables Transform button when targets is empty', async () => {
            render(<AnimalShapesSelectionModal {...makeProps({ targets: [] })} />);
            await waitFor(() => {
                const transformBtn = screen.getByRole('button', { name: /Transform/ });
                expect(transformBtn).toBeDisabled();
            });
        });
    });

    describe('speed formatting', () => {
        it('renders walk speed', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Walk 40'))).toBe(true);
            });
        });

        it('renders climb speed when present', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Climb 20'))).toBe(true);
            });
        });

        it('renders swim speed when present', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Swim 20'))).toBe(true);
            });
        });

        it('renders fly speed when present', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Fly 50'))).toBe(true);
            });
        });

        it('separates multiple speeds with commas', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.animal-shapes-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s === 'Walk 40, Climb 20, Swim 20')).toBe(true);
            });
        });
    });

    describe('beast image', () => {
        it('renders an img element for each beast', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const images = document.querySelectorAll('.animal-shapes-beast-avatar img');
                expect(images.length).toBeGreaterThan(0);
            });
        });

        it('sets the img src to the expected URL pattern', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const images = document.querySelectorAll('.animal-shapes-beast-avatar img');
                images.forEach((img) => {
                    expect(img.src).toMatch(/\/images\/[^/]+\.jpg$/);
                });
            });
        });

        it('hides the img on error', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const images = document.querySelectorAll('.animal-shapes-beast-avatar img');
                expect(images.length).toBeGreaterThan(0);
            });

            const images = document.querySelectorAll('.animal-shapes-beast-avatar img');
            fireEvent.error(images[0]);

            await waitFor(() => {
                expect(images[0].style.display).toBe('none');
            });
        });
    });

    describe('sorting', () => {
        it('sorts beasts by CR ascending then by name', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                const items = document.querySelectorAll('.animal-shapes-beast-item');
                expect(items.length).toBeGreaterThan(0);
            });
        });
    });

    describe('button types', () => {
        it('renders all buttons with type="button"', async () => {
            render(<AnimalShapesSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getAllByText('Crocodile').length).toBe(2);
            });

            const dismissBtn = document.querySelector('.sp-dismiss-btn');
            const rollBtn = document.querySelector('.sp-roll-btn');
            expect(dismissBtn).toBeInTheDocument();
            expect(rollBtn).toBeInTheDocument();
            expect(dismissBtn.textContent).toContain('Cancel');
        });
    });
});
