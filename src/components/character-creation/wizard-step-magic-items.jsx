import React, { useState, useEffect } from 'react';
import './wizard-step-magic-items.css'
import './wizard-step-magic-items-dark.css'

function WizardStepMagicItems({ formData, allMagicItems, ruleset, onArrayFieldChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [showFullDetails, setShowFullDetails] = useState({});
  const [types, setTypes] = useState([]);
  const [warnings, setWarnings] = useState([]);

  // Load magic item types from the data
  useEffect(() => {
    if (allMagicItems && allMagicItems.length > 0) {
      const typeSet = new Set(['All']);
      allMagicItems.forEach(item => {
        if (item.type) {
          typeSet.add(item.type);
        }
      });
      setTypes(Array.from(typeSet).sort());
    }
  }, [allMagicItems]);

  // Check for attunement limit warnings
  useEffect(() => {
    const warnings = [];
    const selectedItems = formData.magicItems || [];

    if (selectedItems.length > 0 && allMagicItems) {
      const attunementItems = selectedItems.filter(itemName => {
        const item = allMagicItems.find(i => i.name === itemName || i.index === itemName);
        return item && item.requiresAttunement;
      });

      if (attunementItems.length > 3) {
        warnings.push({
          message: `You have selected ${attunementItems.length} items requiring attunement, but a character can only attune to a maximum of 3 items.`,
          type: 'warning'
        });
      }
    }

    setWarnings(warnings);
  }, [formData.magicItems, allMagicItems]);

  const filteredMagicItems = (() => {
    if (!allMagicItems || allMagicItems.length === 0) return [];
    
    let results = [...allMagicItems];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.index && item.index.toLowerCase().includes(query))
      );
    }

    if (selectedType !== 'All') {
      results = results.filter(item => item.type === selectedType);
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const handleMagicItemToggle = (itemName) => {
    const currentItems = formData.magicItems || [];
    const newItems = currentItems.includes(itemName)
      ? currentItems.filter(i => i !== itemName)
      : [...currentItems, itemName];
    onArrayFieldChange('magicItems', newItems);
  };

  const itemIsSelected = (itemName) => {
    return (formData.magicItems || []).includes(itemName);
  };

  const toggleFullDetails = (itemIndex) => {
    setShowFullDetails(prev => ({
      ...prev,
      [itemIndex]: !prev[itemIndex]
    }));
  };

  const renderMagicItemDetails = (item, index) => {
  const isExpanded = showFullDetails[index];
  const isSelected = itemIsSelected(item.name);
  // Use index as key since it's now guaranteed to be unique
  const uniqueKey = item.index || index;

  return (
    <div
      key={uniqueKey}
      className={`list-item magic-item ${isSelected ? 'selected' : ''}`}
      onClick={() => handleMagicItemToggle(item.name)}
    >
        <div className="list-item-header">
          <div className="list-item-name">{item.name}</div>
          {item.type && <span className="magic-item-type">{item.type}</span>}
          {item.rarity && <span className="magic-item-rarity">{item.rarity}</span>}
          <div className={`list-item-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected ? '✓' : ''}
          </div>
        </div>
        
        <div className="list-item-details">
          {isExpanded && (
            <div className="list-item-full-details">
              {item.description && (
                <div 
                  className="magic-item-description" 
                  dangerouslySetInnerHTML={{ 
                    __html: Array.isArray(item.description) ? item.description[0] : item.description 
                  }} 
                />
              )}
              {item.description && Array.isArray(item.description) && item.description.length > 1 && (
                <div 
                  className="magic-item-more-description" 
                  dangerouslySetInnerHTML={{ 
                    __html: item.description.slice(1).join('\n') 
                  }} 
                />
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
    if (!allMagicItems || allMagicItems.length === 0) {
      return (
        <div className="wizard-step">
          <h2>Step 9: Magic Items</h2>
          <div className="no-magic-items-found">
            Magic item data not yet loaded. Please try again.
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-step-magic-items">
        <div className="wizard-step">
          <h2>Step 10: Magic Items</h2>

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

           <div className="list-filter-container magic-items-filters">
             <div className="filter-group">
               <label htmlFor="magic-item-search">Search Magic Items</label>
               <input
                type="text"
                id="magic-item-search"
                className="magic-item-search-input"
                placeholder="Search magic items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
               />
        </div>

             <div className="filter-group">
               <label htmlFor="magic-item-type-filter">Item Type</label>
               <select
                id="magic-item-type-filter"
                className="magic-item-type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
               >
                 {types.map(type => (
                   <option key={type} value={type}>{type}</option>
                 ))}
               </select>
      </div>
           </div>

           <div className="list-results-container magic-item-results-container">
             <div className="magic-item-results-header">
               <span className="result-count">
                Showing {filteredMagicItems.length} magic item{filteredMagicItems.length !== 1 ? 's' : ''}
               </span>
             </div>

             <div className="magic-item-results-list">
               {filteredMagicItems.length === 0 ? (
                 <div className="no-results-found">
                   {searchQuery || selectedType !== 'All'
                     ? 'No magic items found matching your criteria.'
                     : 'No magic items available.'}
                 </div>
               ) : (
                filteredMagicItems.map((item, index) => renderMagicItemDetails(item, index))
               )}
             </div>
           </div>
         </div>
       </div>
    );
  };

  return renderSearchModal();
}

export default WizardStepMagicItems;

