import React from 'react';
import { loadMonsters } from '../../../services/ui/dataLoader.js';
import { getClassFeatures } from '../../../services/character/classFeatures.js';
import './WildShapeBeastModal.css';

function parseChallengeRating(crString) {
    if (!crString) return 0;
    if (crString.includes('/')) {
        const parts = crString.split('/');
        return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(crString) || 0;
}

function filterBeastSpeeds(beastSpeeds, limitations) {
    if (!beastSpeeds) return {};
    const filtered = {};
    if (beastSpeeds.walk) filtered.walk = beastSpeeds.walk;
    const hasFly = limitations.includes('fly');
    const hasSwim = limitations.includes('swim');
    if (beastSpeeds.swim && hasSwim) filtered.swim = beastSpeeds.swim;
    if (beastSpeeds.fly && hasFly) filtered.fly = beastSpeeds.fly;
    if (beastSpeeds.climb && hasSwim) filtered.climb = beastSpeeds.climb;
    if (beastSpeeds.burrow && hasSwim) filtered.burrow = beastSpeeds.burrow;
    return filtered;
}

function formatSpeed(speeds) {
    const parts = [];
    if (speeds.walk) parts.push(`Walk ${speeds.walk}`);
    if (speeds.climb) parts.push(`Climb ${speeds.climb}`);
    if (speeds.swim) parts.push(`Swim ${speeds.swim}`);
    if (speeds.fly) parts.push(`Fly ${speeds.fly}`);
    return parts.join(', ');
}

function getBeastActionsSummary(actions) {
    if (!actions || actions.length === 0) return 'No actions';
    return actions.map(a => a.name).join(', ');
}

function WildShapeBeastModal({ playerStats, campaignName, onConfirm, onCancel }) {
    const [beasts, setBeasts] = React.useState([]);
    const [selectedBeast, setSelectedBeast] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState('');

    React.useEffect(() => {
        async function loadBeasts() {
            try {
                const allMonsters = await loadMonsters();
                const druidFeatures = getClassFeatures(playerStats) || {};
                const maxCR = druidFeatures.maxWildShapeChallengeRating || 0;
                const limitations = druidFeatures.wildShapeLimitations || 'walk only (no swim or fly)';

                const beastList = allMonsters
                    .filter(m => m.type && m.type.toLowerCase() === 'beast')
                    .filter(m => {
                        const cr = parseChallengeRating(m.challenge_rating);
                        return cr <= maxCR;
                    })
                    .filter(m => {
                        const filteredSpeeds = filterBeastSpeeds(m.speed, limitations);
                        return filteredSpeeds.walk;
                    })
                    .sort((a, b) => {
                        const crA = parseChallengeRating(a.challenge_rating);
                        const crB = parseChallengeRating(b.challenge_rating);
                        if (crA !== crB) return crA - crB;
                        return a.name.localeCompare(b.name);
                    });

                setBeasts(beastList);
            } catch (err) {
                console.error('[WildShapeBeastModal] Error loading beasts:', err);
                setError('Failed to load beast data.');
            } finally {
                setLoading(false);
            }
        }
        loadBeasts();
    }, [playerStats, campaignName]);

    const filteredBeasts = React.useMemo(() => {
        if (!searchTerm.trim()) return beasts;
        const term = searchTerm.toLowerCase();
        return beasts.filter(b => b.name.toLowerCase().includes(term));
    }, [beasts, searchTerm]);

    const handleSelect = (beast) => {
        setSelectedBeast(beast);
    };

    const handleConfirm = () => {
        if (selectedBeast) {
            onConfirm(selectedBeast);
        }
    };

    React.useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onCancel() };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onCancel]);

    const maxCR = (() => {
        const druidFeatures = getClassFeatures(playerStats) || {};
        return druidFeatures.maxWildShapeChallengeRating || 0;
    })();

    const limitations = (() => {
        const druidFeatures = getClassFeatures(playerStats) || {};
        return druidFeatures.wildShapeLimitations || 'walk only (no swim or fly)';
    })();

    if (loading) {
        return (
            <div className="sp-overlay sp-overlay--evasion" onClick={onCancel}>
                <div className="sp-modal sp-modal--wide" onClick={(e) => e.stopPropagation()}>
                    <div className="sp-header"><i className="fa-solid fa-paw"></i> Wild Shape</div>
                    <div className="sp-body"><p>Loading available beasts...</p></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sp-overlay sp-overlay--evasion" onClick={onCancel}>
                <div className="sp-modal sp-modal--wide" onClick={(e) => e.stopPropagation()}>
                    <div className="sp-header"><i className="fa-solid fa-paw"></i> Wild Shape</div>
                    <div className="sp-body"><p className="sp-note">{error}</p></div>
                    <div className="sp-actions">
                        <button className="sp-dismiss-btn" onClick={onCancel}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sp-overlay sp-overlay--evasion" onClick={onCancel}>
            <div className="sp-modal sp-modal--wide" onClick={(e) => e.stopPropagation()}>
                <div className="sp-header"><i className="fa-solid fa-paw"></i> Wild Shape</div>
                <div className="sp-body">
                    <p>Choose a beast form (CR {maxCR} or lower)</p>
                    <div className="wild-shape-info">
                        <strong>Movement:</strong> {limitations}
                    </div>
                    <div className="wild-shape-search">
                        <input
                            type="text"
                            placeholder="Search beasts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="wild-shape-list">
                        {filteredBeasts.length === 0 ? (
                            <p className="sp-note">No beasts match your Wild Shape limitations.</p>
                        ) : (
                            filteredBeasts.map((beast) => {
                                const cr = parseChallengeRating(beast.challenge_rating);
                                const isSelected = selectedBeast?.index === beast.index;
                                const filteredSpeeds = filterBeastSpeeds(beast.speed, limitations);
                                const imageUrl = `https://paulgilchrist.github.io/dnd-tools/images/${beast.name.toLowerCase().replace(/[^a-z0-9()]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}.jpg`;

                                return (
                                    <div
                                        key={beast.index}
                                        className={`wild-shape-beast-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(beast)}
                                    >
                                        <div className="wild-shape-beast-avatar">
                                            <img
                                                src={imageUrl}
                                                alt={beast.name}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <div className="wild-shape-beast-info">
                                            <div className="wild-shape-beast-name">
                                                {beast.name}
                                                <span className="wild-shape-beast-cr">CR {cr}</span>
                                            </div>
                                            <div className="wild-shape-beast-stats">
                                                <span>{beast.size}</span>
                                                <span>{formatSpeed(filteredSpeeds)}</span>
                                            </div>
                                            <div className="wild-shape-beast-actions">
                                                {getBeastActionsSummary(beast.actions)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="sp-actions">
                    <button className="sp-dismiss-btn" onClick={onCancel}>Cancel</button>
                    <button
                        className="sp-roll-btn"
                        onClick={handleConfirm}
                        disabled={!selectedBeast}
                    >
                        <i className="fa-solid fa-paw"></i> Wild Shape
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WildShapeBeastModal;
