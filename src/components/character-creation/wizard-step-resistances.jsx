import React from 'react';
import { RESISTANCES_IMMUNITIES } from './constants';

function WizardStepResistances({ formData, onResistanceToggle, onImmunityToggle }) {
  return (
    <div className="wizard-step">
      <h2>Step 9: Resistances & Immunities</h2>
      
      <div className="form-group">
        <label>Resistances</label>
        <div className="multi-select-container multi-select-compact">
          {RESISTANCES_IMMUNITIES.map(type => (
            <label 
              key={`resistance-${type}`} 
              className={`multi-select-item ${(formData.resistances || []).includes(type) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={(formData.resistances || []).includes(type)}
                onChange={() => onResistanceToggle(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>
      
      <div className="form-group">
        <label>Immunities</label>
        <div className="multi-select-container multi-select-compact">
          {RESISTANCES_IMMUNITIES.map(type => (
            <label 
              key={`immunity-${type}`} 
              className={`multi-select-item ${(formData.immunities || []).includes(type) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={(formData.immunities || []).includes(type)}
                onChange={() => onImmunityToggle(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WizardStepResistances;