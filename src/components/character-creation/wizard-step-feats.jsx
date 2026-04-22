import React, { useState, useEffect } from 'react';
// No component-specific CSS needed - uses shared wizard styles

function WizardStepFeats({ formData, allFeats, onArrayFieldChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [showFullDetails, setShowFullDetails] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [types, setTypes] = useState([]);

  // Load feat types from the data
  useEffect(() => {
    if (allFeats && allFeats.length > 0) {
      const typeSet = new Set(['All']);
      allFeats.forEach(feats => {
        if (feats.type) {
          typeSet.add(feats.type);
        }
      });
      setTypes(Array.from(typeSet).sort());
    }
  }, [allFeats]);

  const filteredFeats = (() => {
    if (!allFeats || allFeats.length === 0) return [];
    
    let results = [...allFeats];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(feats => 
        feats.name.toLowerCase().includes(query) ||
        (feats.index && feats.index.toLowerCase().includes(query))
      );
    }

    if (selectedType !== 'All') {
      results = results.filter(feats => feats.type === selectedType);
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const handleFeatToggle = (featName) => {
    const currentFeats = formData.feats || [];
    const newFeats = currentFeats.includes(featName)
      ? currentFeats.filter(f => f !== featName)
      : [...currentFeats, featName];
    onArrayFieldChange('feats', newFeats);
  };

  const featIsSelected = (featName) => {
    return (formData.feats || []).includes(featName);
  };

  const toggleFullDetails = (featIndex) => {
    setShowFullDetails(prev => ({
      ...prev,
      [featIndex]: !prev[featIndex]
    }));
  };

  const removeFeat = (featName) => {
    const currentFeats = formData.feats || [];
    const newFeats = currentFeats.filter(f => f !== featName);
    onArrayFieldChange('feats', newFeats);
  };

  const renderFeatDetails = (feat, index) => {
    const isExpanded = showFullDetails[index];
    const isSelected = featIsSelected(feat.name);

    return (
      <div
        key={feat.index || index}
        className={`list-item feat-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleFeatToggle(feat.name)}
      >
        <div className="list-item-header">
          <div className="list-item-name">{feat.name}</div>
          {feat.type && <span className="feat-type">{feat.type}</span>}
          <div className={`list-item-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected ? '✓' : ''}
          </div>
        </div>
        
        <div className="list-item-details">
          {isExpanded && (
            <div className="list-item-full-details">
              {feat.prerequisites && (
                <div className="feat-prerequisites">
                  <strong>Prerequisites:</strong> {Array.isArray(feat.prerequisites) ? feat.prerequisites.join(', ') : feat.prerequisites}
                </div>
              )}
              {feat.description && (
                <div className="feat-description">
                  {Array.isArray(feat.description) ? feat.description[0] : feat.description}
                </div>
              )}
              {feat.description && Array.isArray(feat.description) && feat.description.length > 1 && (
                <div className="feat-more-description">
                  {feat.description.slice(1).join('\n')}
                </div>
              )}
            </div>
          )}

          <div className="list-item-full-details">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullDetails(index);
              }}
              className="toggle-details-btn"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchModal = () => {
    if (!allFeats || allFeats.length === 0) {
      return (
        <div className="wizard-step">
          <h2>Step 9: Feats</h2>
          <div className="no-feats-found">
            Feat data not yet loaded. Please try again.
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-step">
        <h2>Step 9: Feats</h2>
        
        <div className="list-filter-container feats-filters">
          <div className="filter-group">
            <label htmlFor="feat-search">Search Feats</label>
            <input
              type="text"
              id="feat-search"
              className="feat-search-input"
              placeholder="Search feats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="type-filter">Feat Type</label>
            <select
              id="type-filter"
              className="type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="list-results-container feat-results-container">
          <div className="feat-results-header">
            <span className="result-count">
              Showing {filteredFeats.length} feat{filteredFeats.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="feat-results-list">
            {filteredFeats.length === 0 ? (
              <div className="no-results-found">
                {searchQuery || selectedType !== 'All'
                  ? 'No feats found matching your criteria.'
                  : 'No feats available.'}
              </div>
            ) : (
              filteredFeats.map((feat, index) => renderFeatDetails(feat, index))
            )}
          </div>
        </div>
      </div>
    );
  };

  return renderSearchModal();
}

export default WizardStepFeats;
