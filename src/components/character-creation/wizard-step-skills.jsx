import React, { useState, useEffect } from 'react';
import './wizard-step-skills.css';
// Dark mode styles loaded via media query
import './wizard-step-skills-dark.css';
import { SKILL_PROFICIENCIES } from './constants';
import { validateSkills, getSkillLimits, getExpertiseLimits } from '../../services/skill-validation.js';

function WizardStepSkills({ formData, errors, onSkillToggle, onSkillExpertiseToggle, skillLimits, expertiseLimits, warnings }) {
  const [showExpertiseFeedback, setShowExpertiseFeedback] = useState(null);

  const handleExpertiseToggle = (skill) => {
    const isCurrentlyExpert = (formData.expertSkills || []).includes(skill);
    const isCurrentlyProficient = (formData.skillProficiencies || []).includes(skill);

    if (isCurrentlyExpert) {
      // Deselecting expertise - remove from expertSkills only
      onSkillExpertiseToggle(skill, false);
      setShowExpertiseFeedback(null);
     } else {
       // Elevating to expertise
      if (!isCurrentlyProficient) {
        setShowExpertiseFeedback(`Please select ${skill} as proficient first`);
        setTimeout(() => setShowExpertiseFeedback(null), 3000);
        return;
      }
      onSkillExpertiseToggle(skill, true);
      setShowExpertiseFeedback(`${skill} is now Expert!`);
      setTimeout(() => setShowExpertiseFeedback(null), 3000);
     }
   };

  const isSkillExpert = (skill) => (formData.expertSkills || []).includes(skill);
  const isSkillProficient = (skill) => (formData.skillProficiencies || []).includes(skill);

  return (
     <div className="wizard-step">
       <h2>Step 6: Skill Proficiencies</h2>

       {/* Display skill limits info */}
       {skillLimits && (
         <div className="rule-info">
           <p><strong>Rules:</strong> {skillLimits.details}</p>
           <p>You have selected {formData.skillProficiencies?.length || 0} of {skillLimits.allowed} allowed skill proficiency/ies.</p>
         </div>
        )}

       {/* Display expertise info */}
       {expertiseLimits && expertiseLimits.allowed && (
         <div className="rule-info">
           <p><strong>Expertise:</strong> {expertiseLimits.details}</p>
           <p>You have expertise in {formData.expertSkills?.length || 0} of {expertiseLimits.count} allowed skill(s).</p>
         </div>
        )}

       {/* Display warnings if any */}
       {warnings && warnings.length > 0 && (
         <div className="warning-container">
           {warnings.map((warning, index) => (
             <div key={index} className={`warning-message ${warning.type}`}>
               {warning.message}
             </div>
            ))}
         </div>
        )}

       <div className="form-group">
         <label>Skill Proficiencies</label>
         <div className="multi-select-container multi-select-compact">
           {SKILL_PROFICIENCIES.map(skill => (
             <label
              key={skill}
              className={`multi-select-item ${(formData.skillProficiencies || []).includes(skill) ? 'selected' : ''}`}
             >
               <input
                type="checkbox"
                checked={isSkillProficient(skill)}
                onChange={() => onSkillToggle(skill)}
               />
               &nbsp;
               <span className={isSkillExpert(skill) ? 'skill-expert-label' : ''}>
                 {skill}
                 {isSkillExpert(skill) && (
                   <span className="expertise-indicator"> (Expert)</span>
                 )}
               </span>
               <button
                type="button"
                className={`expertise-toggle-btn ${isSkillExpert(skill) ? 'active' : ''}`}
                onClick={() => handleExpertiseToggle(skill)}
                disabled={!isSkillProficient(skill) || (!expertiseLimits?.allowed && !isSkillExpert(skill))}
                title={isSkillProficient(skill) ? 'Click to elevate to Expert' : 'Select proficient first'}
               >
                 {isSkillExpert(skill) ? '✓ Expert' : 'Elevate'}
               </button>
             </label>
            ))}
         </div>
        {errors.skillProficiencies && <span className="error-message">{errors.skillProficiencies}</span>}
      </div>

       {showExpertiseFeedback && (
         <div className={`expertise-feedback ${showExpertiseFeedback.includes('Expert') ? 'success' : 'error'}`}>
           {showExpertiseFeedback}
         </div>
        )}
     </div>
   );
}

export default WizardStepSkills;

