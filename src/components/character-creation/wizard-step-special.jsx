import React from 'react';

function WizardStepSpecial({ formData, onArrayFieldChange }) {
  return (
    <div className="wizard-step">
      <h2>Step 6: Special Features</h2>
      
      <div className="form-group">
        <label>Spells Known/Prepared</label>
        <textarea
          value={formData.spells.join(', ')}
          onChange={(e) => onArrayFieldChange('spells', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
          placeholder="Enter spells separated by commas"
          rows={4}
        />
      </div>
      
      <div className="form-group">
        <label>Resistances</label>
        <textarea
          value={formData.resistances.join(', ')}
          onChange={(e) => onArrayFieldChange('resistances', e.target.value.split(',').map(r => r.trim()).filter(r => r))}
          placeholder="Enter damage types separated by commas"
          rows={2}
        />
        <p className="field-description">e.g., Fire, Cold, Lightning</p>
      </div>
      
      <div className="form-group">
        <label>Feats</label>
        <textarea
          value={formData.feats.join(', ')}
          onChange={(e) => onArrayFieldChange('feats', e.target.value.split(',').map(f => f.trim()).filter(f => f))}
          placeholder="Enter feats separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Alert, War Caster, Sharpshooter</p>
      </div>
      
      <div className="form-group">
        <label>Special Actions</label>
        <textarea
          value={formData.specialActions.join(', ')}
          onChange={(e) => onArrayFieldChange('specialActions', e.target.value.split(',').map(a => a.trim()).filter(a => a))}
          placeholder="Enter special actions separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Second Wind (1d10 + CON modifier)</p>
      </div>
    </div>
  );
}

export default WizardStepSpecial;
