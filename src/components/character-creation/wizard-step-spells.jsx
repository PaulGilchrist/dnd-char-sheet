import React, { useState, useEffect } from 'react';
import './wizard-step-spells.css';

function WizardStepSpells({ formData, allSpells, onArrayFieldChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showFullDetails, setShowFullDetails] = useState({});

  const [levels, setLevels] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (allSpells && allSpells.length > 0) {
      const levelSet = new Set(['All']);
      const classSet = new Set(['All']);
      allSpells.forEach(spell => {
        levelSet.add(spell.level !== undefined ? spell.level.toString() : '0');
        if (spell.classes) {
          spell.classes.forEach(cls => classSet.add(cls));
        }
      });
      setLevels(Array.from(levelSet).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return parseInt(a) - parseInt(b);
      }));
      setClasses(Array.from(classSet).sort());
    }
  }, [allSpells]);

  const filteredSpells = (() => {
    if (!allSpells || allSpells.length === 0) return [];
    
    let results = [...allSpells];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(spell => 
        spell.name.toLowerCase().includes(query) ||
        (spell.index && spell.index.toLowerCase().includes(query))
      );
    }

    if (selectedLevel !== 'All') {
      results = results.filter(spell => {
        const spellLevel = spell.level !== undefined ? spell.level.toString() : '0';
        return spellLevel === selectedLevel;
      });
    }

    if (selectedClass !== 'All') {
      results = results.filter(spell => 
        spell.classes && spell.classes.includes(selectedClass)
      );
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const handleSpellToggle = (spellName) => {
    const currentSpells = formData.spells || [];
    const newSpells = currentSpells.includes(spellName)
      ? currentSpells.filter(s => s !== spellName)
      : [...currentSpells, spellName];
    onArrayFieldChange('spells', newSpells);
  };

  const spellIsSelected = (spellName) => {
    return (formData.spells || []).includes(spellName);
  };

  const getLevelClass = (spell) => {
    const level = spell.level !== undefined ? spell.level : 0;
    if (level === 0) return 'cantrip';
    if (level <= 3) return 'low';
    if (level <= 5) return 'mid';
    return 'high';
  };

  const toggleFullDetails = (spellIndex) => {
    setShowFullDetails(prev => ({
      ...prev,
      [spellIndex]: !prev[spellIndex]
    }));
  };

  const removeSpell = (spellName) => {
    const currentSpells = formData.spells || [];
    const newSpells = currentSpells.filter(s => s !== spellName);
    onArrayFieldChange('spells', newSpells);
  };

  const renderSpellDetails = (spell, index) => {
    const isExpanded = showFullDetails[index];
    const isSelected = spellIsSelected(spell.name);

    return (
      <div
        key={spell.index || index}
        className={`spell-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSpellToggle(spell.name)}
      >
        <div className="spell-item-header">
          <div className="spell-name">{spell.name}</div>
          <span className={`spell-level ${getLevelClass(spell)}`}>
            {spell.level !== undefined ? spell.level : '0'}
          </span>
          <div className="spell-checkbox">
            {isSelected ? '✓' : ''}
          </div>
        </div>
        
        <div className="spell-item-details">
          <div className="spell-meta">
            <span className="spell-school">{spell.school || 'Unknown'}</span>
            {spell.ritual && <span className="spell-ritual">Ritual</span>}
            {spell.concentration && <span className="spell-concentration">Concentration</span>}
            {spell.duration && <span className="spell-duration">Duration: {spell.duration}</span>}
            {spell.casting_time && <span className="spell-casting-time">Casting: {spell.casting_time}</span>}
          </div>

          {isExpanded && (
            <div className="spell-full-details">
              <div className="spell-description">
                {spell.desc && spell.desc[0] && spell.desc[0]}
              </div>
              
              {spell.higher_level && spell.higher_level[0] && (
                <div className="spell-higher-level">
                  <strong>Higher Levels:</strong> {spell.higher_level[0]}
                </div>
              )}
              
              {spell.components && spell.components.length > 0 && (
                <div className="spell-components">
                  <strong>Components:</strong> {spell.components.join(', ')}
                </div>
              )}
              
              {spell.damage && spell.damage.damage_type && (
                <div className="spell-damage">
                  <strong>Damage:</strong> {spell.damage.damage_type}
                </div>
              )}
              
              {spell.material && (
                <div className="spell-material">
                  <strong>Material:</strong> {spell.material}
                </div>
              )}
            </div>
          )}

          <div className="spell-full-details">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullDetails(index);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '0.25rem 0.5rem',
                marginTop: '0.5rem'
              }}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchModal = () => {
    if (!allSpells || allSpells.length === 0) {
      return (
        <div className="wizard-step">
          <h2>Step 6: Spells</h2>
          <div className="no-spells-found">
            Spell data not yet loaded. Please try again.
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-step-spells">
        <h2>Step 6: Spells</h2>
        
        <div className="spells-filters">
          <div className="filter-group">
            <label htmlFor="spell-search">Search Spells</label>
            <input
              type="text"
              id="spell-search"
              className="spell-search-input"
              placeholder="Search spells..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="level-filter">Spell Level</label>
            <select
              id="level-filter"
              className="level-filter"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              {levels.map(level => (
                <option key={level} value={level}>{level === '0' ? 'Cantrip' : level}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="class-filter">Class</label>
            <select
              id="class-filter"
              className="class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="spell-results-container">
          <div className="spell-results-header">
            <span className="result-count">
              Showing {filteredSpells.length} spell{filteredSpells.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="spell-results-list">
            {filteredSpells.length === 0 ? (
              <div className="no-spells-found">
                {searchQuery || selectedLevel !== 'All' || selectedClass !== 'All'
                  ? 'No spells found matching your criteria.'
                  : 'No spells available.'}
              </div>
            ) : (
              filteredSpells.map((spell, index) => renderSpellDetails(spell, index))
            )}
          </div>
        </div>

        <div className="spells-summary">
          <h3>Selected Spells ({formData.spells?.length || 0})</h3>
          {formData.spells && formData.spells.length > 0 ? (
            <div className="selected-spells-list">
              {formData.spells.map(spellName => (
                <span key={spellName} className="selected-spell-tag">
                  {spellName}
                  <button
                    type="button"
                    className="remove-spell-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSpell(spellName);
                    }}
                    title="Remove spell"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="no-spells-selected">No spells selected yet</p>
          )}
        </div>
      </div>
    );
  };

  return renderSearchModal();
}

export default WizardStepSpells;