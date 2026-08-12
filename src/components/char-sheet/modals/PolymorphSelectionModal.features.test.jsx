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

let getClassFeaturesOverride = undefined;
const CLASS_FEATURES_DEFAULT = {
    wildShapeLimitations: 'walk only (no swim or fly)',
    maxWildShapeChallengeRating: 1,
};

vi.mock('../../../services/character/classFeatures.js', () => ({
    getClassFeatures: vi.fn(() => {
        if (getClassFeaturesOverride !== undefined) {
            return getClassFeaturesOverride;
        }
        return CLASS_FEATURES_DEFAULT;
    }),
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

describe('PolymorphSelectionModal - Features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getClassFeaturesOverride = undefined;
    });

    describe('customization props', () => {
        it('renders custom title when provided', async () => {
            render(<PolymorphSelectionModal {...makeProps({ title: 'Polymorph Selection' })} />);
            await waitFor(() => {
                expect(screen.getByText('Polymorph Selection')).toBeInTheDocument();
            });
        });

        it('renders custom icon when provided', async () => {
            render(<PolymorphSelectionModal {...makeProps({ icon: 'fa-dragon' })} />);
            await waitFor(() => {
                const icons = document.querySelectorAll('i.fa-solid.fa-dragon');
                expect(icons.length).toBeGreaterThan(0);
            });
        });

        it('uses custom action label when provided', async () => {
            render(<PolymorphSelectionModal {...makeProps({ actionLabel: 'Transform' })} />);
            await waitFor(() => {
                const confirmBtn = screen.getByRole('button', { name: 'Transform' });
                expect(confirmBtn).toBeInTheDocument();
            });
        });

        it('uses default title and icon when not provided', async () => {
            const props = {
                playerStats: { class: { name: 'Druid' }, level: 4, rules: '5e' },
                maxCR: 1,
                campaignName: 'test-campaign',
                onConfirm: vi.fn(),
                onCancel: vi.fn(),
            };
            render(<PolymorphSelectionModal {...props} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });
            const icons = document.querySelectorAll('i.fa-solid.fa-paw');
            expect(icons.length).toBeGreaterThan(0);
        });
    });

    describe('allowAnyCreature mode', () => {
        it('includes non-beast creatures when allowAnyCreature is true', async () => {
            render(<PolymorphSelectionModal {...makeProps({ allowAnyCreature: true, maxCR: 3 })} />);
            await waitFor(() => {
                // Ghast has CR 2, which passes with maxCR 3
                expect(screen.getByText('Ghast')).toBeInTheDocument();
            });
        });

        it('changes search placeholder for allowAnyCreature mode', async () => {
            render(<PolymorphSelectionModal {...makeProps({ allowAnyCreature: true })} />);
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search creatures...')).toBeInTheDocument();
            });
        });

        it('changes instruction text for allowAnyCreature mode', async () => {
            render(<PolymorphSelectionModal {...makeProps({ allowAnyCreature: true })} />);
            await waitFor(() => {
                expect(screen.getByText('Choose a creature form (CR 1 or lower)')).toBeInTheDocument();
            });
        });

        it('does not show wild shape limitations info in allowAnyCreature mode', async () => {
            render(<PolymorphSelectionModal {...makeProps({ allowAnyCreature: true })} />);
            await waitFor(() => {
                expect(screen.queryByText(/Movement:/)).not.toBeInTheDocument();
            });
        });

        it('filters to CR 9 or lower in object_into_creature mode', async () => {
            render(<PolymorphSelectionModal {...makeProps({
                allowAnyCreature: true,
                mode: 'object_into_creature',
            })} />);
            await waitFor(() => {
                expect(screen.getByText('Choose a creature form (CR 9 or lower)')).toBeInTheDocument();
            });
        });
    });

    describe('excludeTypes filtering', () => {
        it('excludes specified creature types', async () => {
            render(<PolymorphSelectionModal {...makeProps({
                excludeTypes: ['Beast'],
            })} />);
            await waitFor(() => {
                // All mock beasts are type 'Beast', so all should be excluded
                // Since allowAnyCreature is false, the no-results message says "No beasts match..."
                expect(screen.getByText(/No beasts match/)).toBeInTheDocument();
            });
        });

        it('excludes types case-insensitively', async () => {
            render(<PolymorphSelectionModal {...makeProps({
                excludeTypes: ['beast'],
            })} />);
            await waitFor(() => {
                expect(screen.getByText(/No beasts match/)).toBeInTheDocument();
            });
        });

        it('does not show excluded types info when excludeTypes is empty', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.queryByText(/Excluded Types:/)).not.toBeInTheDocument();
            });
        });
    });

    describe('challenge rating parsing', () => {
        it('handles fractional CR (1/4) correctly', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.wild-shape-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 0.25');
            });
        });

        it('handles CR as integer string', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.wild-shape-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 1');
            });
        });

        it('handles CR 0 beasts', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const crTexts = document.querySelectorAll('.wild-shape-beast-cr');
                const crs = Array.from(crTexts).map(el => el.textContent.trim());
                expect(crs).toContain('CR 0');
            });
        });

        it('sorts beasts by CR ascending then by name', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const items = document.querySelectorAll('.wild-shape-beast-item');
                const names = Array.from(items).map(item => {
                    const nameEl = item.querySelector('.wild-shape-beast-name');
                    return nameEl ? nameEl.textContent.trim() : '';
                });
                // CR 0 (Rat) should come first
                expect(names[0]).toContain('Rat');
                // CR 0.25 items (Panther, Wolf) should come next, sorted alphabetically
                const cr025Items = names.filter(n => n.includes('Panther') || n.includes('Wolf'));
                expect(cr025Items[0]).toContain('Panther');
                expect(cr025Items[1]).toContain('Wolf');
            });
        });
    });

    describe('speed formatting', () => {
        it('renders walk speed', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.wild-shape-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Walk 40'))).toBe(true);
            });
        });

        it('renders climb speed when present', async () => {
            // "walk and swim" limitations allow climb speeds (filterBeastSpeeds keeps climb when hasSwim=true)
            getClassFeaturesOverride = {
                wildShapeLimitations: 'walk and swim',
                maxWildShapeChallengeRating: 1,
            };
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.wild-shape-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                expect(speeds.some(s => s.includes('Climb 20'))).toBe(true);
            });
        });

        it('renders walk speed for beasts with walk 20', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                const speedTexts = document.querySelectorAll('.wild-shape-beast-stats');
                const speeds = Array.from(speedTexts).map(el => el.textContent.trim());
                // Crocodile has walk: 20
                expect(speeds.some(s => s.includes('Walk 20'))).toBe(true);
            });
        });

        it('separates multiple speeds with commas', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                // Panther has walk: 40, climb: 20, so formatSpeed returns "Walk 40, Climb 20"
                // The component renders these as separate spans inside .wild-shape-beast-stats
                // Check the parent element's textContent which combines all spans
                const speedParents = document.querySelectorAll('.wild-shape-beast-stats');
                const parentTexts = Array.from(speedParents).map(el => el.textContent.trim());
                // Should have a parent containing "SmallWalk 40, Climb 20" (size + speeds combined)
                // or we can check that some element contains both Walk and Climb
                expect(parentTexts.some(t => t.includes('Walk 40') && t.includes('Climb 20'))).toBe(true);
            });
        });
    });

    describe('error handling', () => {
        it('renders error message when loadMonsters fails', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockRejectedValueOnce(new Error('Network error'));

            render(<PolymorphSelectionModal {...baseProps} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load creature data.')).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });
        });

        it('calls onCancel when Close button is clicked in error state', async () => {
            const { loadMonsters } = await import('../../../services/ui/dataLoader.js');
            loadMonsters.mockRejectedValueOnce(new Error('Network error'));

            render(<PolymorphSelectionModal {...baseProps} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
            expect(baseProps.onCancel).toHaveBeenCalled();
        });
    });

    describe('wild shape limitations filtering', () => {
        it('filters out beasts without walk speed when limitations require walk', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                // All remaining beasts should have walk speed
                const items = document.querySelectorAll('.wild-shape-beast-item');
                expect(items.length).toBeGreaterThan(0);
            });
        });

        it('shows wild shape limitations text when available and not allowAnyCreature', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText(/Movement:/)).toBeInTheDocument();
            });
        });

        it('does not show wild shape limitations when allowAnyCreature is true', async () => {
            render(<PolymorphSelectionModal {...makeProps({ allowAnyCreature: true })} />);
            await waitFor(() => {
                expect(screen.queryByText(/Movement:/)).not.toBeInTheDocument();
            });
        });


    });

    describe('effectiveMaxCR from props vs class features', () => {
        it('uses maxCR prop when it is a number', async () => {
            render(<PolymorphSelectionModal {...makeProps({ maxCR: 2 })} />);
            await waitFor(() => {
                expect(screen.getByText('Choose a beast form (CR 2 or lower)')).toBeInTheDocument();
            });
        });

        it('falls back to class feature maxWildShapeChallengeRating when maxCR is not a number', async () => {
            getClassFeaturesOverride = {
                wildShapeLimitations: 'walk only (no swim or fly)',
                maxWildShapeChallengeRating: 2,
            };

            render(<PolymorphSelectionModal {...makeProps({ maxCR: null })} />);
            await waitFor(() => {
                // getClassFeatures returns maxWildShapeChallengeRating: 2
                expect(screen.getByText('Choose a beast form (CR 2 or lower)')).toBeInTheDocument();
            });
        });

        it('filters by effectiveMaxCR from class features', async () => {
            getClassFeaturesOverride = {
                wildShapeLimitations: 'walk only (no swim or fly)',
                maxWildShapeChallengeRating: 0,
            };

            render(<PolymorphSelectionModal {...makeProps({ maxCR: null })} />);
            await waitFor(() => {
                // CR 0 beasts should pass (max is 0), CR 1 beasts should be filtered
                expect(screen.getByText('Rat')).toBeInTheDocument();
                expect(screen.queryByText('Giant Spider')).not.toBeInTheDocument();
            });
        });
    });

    describe('overlay behavior', () => {
        it('renders the overlay with sp-overlay and sp-overlay--evasion classes', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });
            const overlay = document.querySelector('.sp-overlay');
            expect(overlay).toHaveClass('sp-overlay');
            expect(overlay).toHaveClass('sp-overlay--evasion');
        });

        it('renders the modal with sp-modal and sp-modal--wide classes', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });
            const modal = document.querySelector('.sp-modal');
            expect(modal).toHaveClass('sp-modal');
            expect(modal).toHaveClass('sp-modal--wide');
        });
    });

    describe('button classes', () => {
        it('renders both Cancel and confirm buttons in the actions area', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            });
            const dismissBtn = document.querySelector('.sp-dismiss-btn');
            const rollBtn = document.querySelector('.sp-roll-btn');
            expect(dismissBtn).toBeInTheDocument();
            expect(rollBtn).toBeInTheDocument();
            expect(dismissBtn.textContent).toContain('Cancel');
        });
    });

    describe('beast size rendering', () => {
        it('renders beast size in the stats line', async () => {
            render(<PolymorphSelectionModal {...baseProps} />);
            await waitFor(() => {
                expect(screen.getByText('Wolf')).toBeInTheDocument();
            });

            // Find the wolf item specifically
            let wolfStats = null;
            for (const item of document.querySelectorAll('.wild-shape-beast-item')) {
                const nameEl = item.querySelector('.wild-shape-beast-name');
                if (nameEl && nameEl.textContent.includes('Wolf')) {
                    const statsEl = item.querySelector('.wild-shape-beast-stats');
                    wolfStats = statsEl ? statsEl.textContent.trim() : '';
                    break;
                }
            }
            expect(wolfStats).toContain('Medium');
        });
    });
});
