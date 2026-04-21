import React from 'react';

function WizardStepRaceClass({ 
  formData, 
  errors, 
  racesData, 
  classSubtypes,
  onInputChange 
}) {
  const selectedClass = formData.class?.name;
  const availableSubclasses = classSubtypes.find(
    cs => cs.className === selectedClass
  )?.subtypes || [];
  
  return (
    <div className="wizard-step">
      <h2>Step 2: Race & Class</h2>
      
      <div className="form-group">
        <label>Race *</label>
        <select
          value={formData.race?.name || ''}
          onChange={(e) => onInputChange('race', { name: e.target.value })}
          className={errors.race ? 'error' : ''}
        >
          {racesData.length > 0 ? (
            racesData.map(race => (
              <option key={race.name || race.index} value={race.name || race.index}>{race.name || race.index}</option>
            ))
          ) : (
            <option value="">Loading races...</option>
          )}
        </select>
        {errors.race && <span className="error-message">{errors.race}</span>}
      </div>
      
      <div className="form-group">
        <label>Class *</label>
        <select
          value={formData.class?.name || ''}
          onChange={(e) => onInputChange('class', { name: e.target.value })}
          className={errors.class ? 'error' : ''}
        >
          {classSubtypes.length > 0 ? (
            classSubtypes.map(cs => (
              <option key={cs.className} value={cs.className}>{cs.className}</option>
            ))
          ) : (
            <option value="">Loading classes...</option>
          )}
        </select>
        {errors.class && <span className="error-message">{errors.class}</span>}
      </div>
      
      {availableSubclasses.length > 0 && (
        <div className="form-group">
          <label>Subclass</label>
          <select
            value={formData.class?.subclass?.name || ''}
            onChange={(e) => {
              const updatedClass = {
                ...formData.class,
                subclass: { name: e.target.value, type: '' }
              };
              onInputChange('class', updatedClass);
            }}
          >
            <option value="">Select a subclass</option>
            {availableSubclasses.map(subclass => (
              <option key={subclass.name} value={subclass.name}>{subclass.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {availableSubclasses.length > 0 && (
        <div className="form-group">
          <label>Subclass Type (Optional)</label>
          <input
            type="text"
            value={formData.class?.subclass?.type || ''}
            onChange={(e) => {
              const updatedClass = {
                ...formData.class,
                subclass: { ...formData.class.subclass, type: e.target.value }
              };
              onInputChange('class', updatedClass);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default WizardStepRaceClass;
