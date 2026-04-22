import React from 'react';
// No component-specific CSS needed - uses shared wizard styles

function WizardStepSpecial({ formData, onArrayFieldChange }) {
  return (
    <div className="wizard-step">
      <h2>Step 11: Special Actions</h2>
      
      <div className="form-group">
        <label>Special Actions</label>
        <textarea className='inventory-textarea'
          value={formData.specialActions.join(', ')}
          onChange={(e) => onArrayFieldChange('specialActions', e.target.value.split(',').map(a => a.trim()).filter(a => a))}
          placeholder="Enter special actions separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Second Wind (1d10 + CON modifier), Action Surge</p>
      </div>
    </div>
  );
}

export default WizardStepSpecial;
