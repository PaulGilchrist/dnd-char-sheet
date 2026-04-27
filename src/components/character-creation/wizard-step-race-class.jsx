import React from 'react';

function WizardStepRaceClass({ 
  formData, 
  errors, 
  racesData, 
  classSubtypes,
  ruleset,
  onInputChange 
}) {
  const selectedClass = formData.class?.name;
  const selectedRace = formData.race?.name;
  
  // Get available subclasses/majors based on selected class
  const availableSubclasses = classSubtypes.find(
    cs => cs.className === selectedClass
  )?.subtypes || [];
  
  // Get available subraces based on selected race
  const availableSubraces = racesData.find(
    race => race.name === selectedRace
  )?.subraces || [];
  
  // Determine if we should show "Major" or "Subclass" label for 2024
  const subclassLabel = ruleset === '2024' ? 'Subclass (Major)' : 'Subclass';
  const subraceLabel = ruleset === '2024' ? 'Subrace (Major)' : 'Subrace';
  
  return (
    <div className="wizard-step">
      <h2>Step 3: Race & Class</h2>
      
      <div className="form-group">
        <label>Race *</label>
        <select
          value={formData.race?.name || ''}
          onChange={(e) => onInputChange('race', { name: e.target.value })}
          className={errors.race ? 'error' : ''}
        >
          <option value="">Select a race</option>
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
      
      {availableSubraces.length > 0 && (
        <div className="form-group">
          <label>{subraceLabel} *</label>
          <select
           value={formData.race?.subrace?.name || ''}
           onChange={(e) => {
             const updatedRace = {
                ...formData.race,
                subrace: { name: e.target.value, description: '' }
              };
              onInputChange('race', updatedRace);
            }}
           className={errors.subrace ? 'error' : ''}
          >
            <option value="">Select a {subraceLabel.toLowerCase()}</option>
            {availableSubraces.map((subrace, index) => (
              <option key={subrace.index || `subrace-${index}`} value={subrace.name}>
                {subrace.name}
              </option>
            ))}
          </select>
          {errors.subrace && <span className="error-message">{errors.subrace}</span>}
        </div>
      )}
      
      <div className="form-group">
        <label>Class *</label>
        <select
          value={formData.class?.name || ''}
          onChange={(e) => onInputChange('class', { name: e.target.value })}
          className={errors.class ? 'error' : ''}
        >
          <option value="">Select a class</option>
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

          <label>{subclassLabel} *</label>
          <select
          value={formData.class?.subclass?.name || ''}
          onChange={(e) => {
            const updatedClass = {
                ...formData.class,
                subclass: { name: e.target.value, type: '' }
              };
              onInputChange('class', updatedClass);
            }}
          className={errors.subclass ? 'error' : ''}
          >

            <option value="">Select a {subclassLabel.toLowerCase()}</option>
            {availableSubclasses.map(subclass => (

              <option key={subclass.name || subclass.index} value={subclass.name || subclass.index}>
                {subclass.name || subclass.index}
              </option>
            ))}
          </select>
          {errors.subclass && <span className="error-message">{errors.subclass}</span>}
        </div>
      )}
      
    </div>
  );
}

export default WizardStepRaceClass;
