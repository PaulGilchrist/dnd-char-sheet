import React, { useState, useEffect } from 'react';
// No component-specific CSS needed - uses shared wizard styles
import { validateFeats, getFeatLimits } from '../../services/feat-validation.js';

function WizardStepFeats({ formData, allFeats, onArrayFieldChange, preSelectedFeats }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [showFullDetails, setShowFullDetails] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [warnings, setWarnings] = useState([]);

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

    // Validate feats when selection changes
    useEffect(() => {
        const validationWarnings = validateFeats(formData, allFeats);
        setWarnings(validationWarnings);
    }, [formData.feats, formData.level, formData.rules, allFeats]);

    // Get feat limits for display
    const featLimits = getFeatLimits(formData);

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
        const isPreSelected = (preSelectedFeats || []).includes(featName);
        const isCurrentlySelected = currentFeats.includes(featName);

        // Don't allow unselection if the feat is pre-selected
        if (isCurrentlySelected && isPreSelected) {
            return;
        }

        const newFeats = isCurrentlySelected
             ? currentFeats.filter(f => f !== featName)
             : [...currentFeats, featName];
        onArrayFieldChange('feats', newFeats);
    };

    const featIsSelected = (featName) => {
        return (formData.feats || []).includes(featName);
    };

    const featIsPreSelected = (featName) => {
        return (preSelectedFeats || []).includes(featName);
     };

    const toggleFullDetails = (featIndex) => {
        setShowFullDetails(prev => ({
             ...prev,
             [featIndex]: !prev[featIndex]
         }));
     };

    const removeFeat = (featName) => {
        const isPreSelected = (preSelectedFeats || []).includes(featName);
        
        // Don't allow removal of pre-selected feats
        if (isPreSelected) {
            return;
        }

        const currentFeats = formData.feats || [];
        const newFeats = currentFeats.filter(f => f !== featName);
        onArrayFieldChange('feats', newFeats);
    };

    const renderFeatDetails = (feat, index) => {
        const isExpanded = showFullDetails[index];
        const isSelected = featIsSelected(feat.name);
        const isPreSelected = featIsPreSelected(feat.name);

        // Safely extract description text - handle both string and object descriptions
        const getDescriptionData = () => {
            let descriptionData = { text: '', isHtml: false };

            // Try 2024 format first (description field) - HTML
            if (feat.description) {
                const desc = feat.description;

                if (typeof desc === 'string') {
                    descriptionData = { text: desc, isHtml: true };
                } else if (Array.isArray(desc) && desc[0]) {
                    const firstItem = desc[0];
                    if (typeof firstItem === 'string') {
                        descriptionData = { text: firstItem, isHtml: true };
                    } else if (typeof firstItem === 'object') {
                        if (firstItem.text) {
                            descriptionData = { text: firstItem.text, isHtml: true };
                        } else if (firstItem.content) {
                            descriptionData = { text: firstItem.content, isHtml: true };
                        } else if (firstItem.description) {
                            descriptionData = { text: firstItem.description, isHtml: true };
                        } else if (firstItem.level !== undefined) {
                            console.warn('Unexpected description object structure:', firstItem);
                            descriptionData = { text: '', isHtml: false };
            }
                     }
                 }
             }

            // Try 5e format (desc field) - text/plain
            if (!descriptionData.isHtml && feat.desc) {
                const desc = feat.desc;

                if (typeof desc === 'string') {
                    descriptionData = { text: desc, isHtml: false };
                } else if (Array.isArray(desc) && desc[0]) {
                    const firstItem = desc[0];
                    if (typeof firstItem === 'string') {
                        descriptionData = { text: firstItem, isHtml: false };
                    } else if (typeof firstItem === 'object') {
                        if (firstItem.text) {
                            descriptionData = { text: firstItem.text, isHtml: false };
                        } else if (firstItem.content) {
                            descriptionData = { text: firstItem.content, isHtml: false };
                        } else if (firstItem.description) {
                            descriptionData = { text: firstItem.description, isHtml: false };
                        } else if (firstItem.level !== undefined) {
                            console.warn('Unexpected description object structure:', firstItem);
                            descriptionData = { text: '', isHtml: false };
            }
                     }
                 }
             }

            return descriptionData;
        };

        // Safely render prerequisites
        const renderPrerequisites = () => {
            if (!feat.prerequisites) return '';

            if (Array.isArray(feat.prerequisites)) {
                return feat.prerequisites
                     .filter(p => typeof p === 'string' || (typeof p === 'object' && p.name))
                     .map(p => typeof p === 'string' ? p : (p.name || JSON.stringify(p)))
                     .join(', ');
             }

            return typeof feat.prerequisites === 'string' ? feat.prerequisites : JSON.stringify(feat.prerequisites);
        };

        const descData = getDescriptionData();

        return (
            <div
                key={feat.index || index}
                className={`list-item feat-item ${isSelected ? 'selected' : ''} ${isPreSelected ? 'pre-selected' : ''}`}
                onClick={() => handleFeatToggle(feat.name)}
             >
                 <div className="list-item-header">




                       <div className="list-item-name">
                           {feat.name}
                           {isPreSelected && <span className="pre-selected-label">(Pre-selected)</span>}
                     </div>
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
                                      <strong>Prerequisites:</strong> {renderPrerequisites()}
                                  </div>
                              )}
                              {descData.text && (
                                  <div className="feat-description">
                                      {descData.isHtml ? (
                                          <div dangerouslySetInnerHTML={{ __html: descData.text }} />
                                      ) : (
                                        descData.text
                     )}
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
                 <h2>Step 4: Feats</h2>





                      <div className="no-feats-found">
                        Feat data not yet loaded. Please try again.
                 </div>







                             </div>















              );
          }

        return (
              <div className="wizard-step">
                  <h2>Step 4: Feats</h2>

                  {/* Display feat limits info */}
                  <div className="rule-info">
                      <p><strong>Rules:</strong> {featLimits.details}</p>
                      <p>You have selected {formData.feats?.length || 0} of {featLimits.allowed} allowed feat(s).</p>
                  </div>

                  {/* Display warnings if any */}
                  {warnings.length > 0 && (
                      <div className="warning-container">
                          {warnings.map((warning, index) => (
                              <div key={index} className={`warning-message ${warning.type}`}>
                                  {warning.message}
                              </div>
                          ))}
                     </div>
































                         )}



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
