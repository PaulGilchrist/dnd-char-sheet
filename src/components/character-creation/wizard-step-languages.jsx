import React, { useState, useEffect } from 'react';
import { LANGUAGES, FIGHTING_STYLES } from './constants';

function WizardStepLanguages({ formData, errors, onLanguageToggle, onFightingStyleToggle, languageLimits, fightingStyleLimits, warnings, preSelectedLanguages, preSelectedFightingStyles }) {
  const fightingStyles = formData.class?.fightingStyles || [];
  const languages = formData.languages || [];

   // Auto-select pre-selected languages when languageLimits changes
  useEffect(() => {
    if (languageLimits && languageLimits.preSelected) {
      languageLimits.preSelected.forEach(lang => {
        if (!languages.includes(lang)) {
          onLanguageToggle(lang);
         }
       });
     }
   }, [languageLimits]);

   // Auto-select pre-selected fighting styles when fightingStyleLimits changes
  useEffect(() => {
    if (fightingStyleLimits && fightingStyleLimits.preSelected) {
      fightingStyleLimits.preSelected.forEach(style => {
        if (!fightingStyles.includes(style)) {
          onFightingStyleToggle(style);
         }
       });
     }
   }, [fightingStyleLimits]);

  const isLanguagePreSelected = (language) => (preSelectedLanguages || []).includes(language);
  const isFightingStylePreSelected = (style) => (preSelectedFightingStyles || []).includes(style);

  return (
     <div className="wizard-step">
       <h2>Step 7: Languages & Fighting Styles</h2>

       {/* Display language limits info */}
       {languageLimits && (
         <div className="rule-info">
           <p><strong>Rules:</strong> {languageLimits.details}</p>
             <p>You have selected {languages.length} of {languageLimits.allowed} allowed language(s).</p>
         </div>
       )}

       {/* Display fighting style limits info */}
       {fightingStyleLimits && (
         <div className="rule-info">
           <p><strong>Rules:</strong> {fightingStyleLimits.details}</p>
           <p>You have selected {fightingStyles.length} of {fightingStyleLimits.allowed} allowed fighting style(s).</p>
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
         <label>Languages</label>
         <div className="multi-select-container multi-select-compact">
           {LANGUAGES.map(language => (
             <label 
              key={language} 
               className={`multi-select-item ${languages.includes(language) ? 'selected' : ''} ${isLanguagePreSelected(language) ? 'pre-selected' : ''}`}
             >
               <input
                type="checkbox"
                 checked={languages.includes(language)}
                onChange={() => onLanguageToggle(language)}
                disabled={isLanguagePreSelected(language)}
               />
               &nbsp;{language}
             </label>
           ))}
         </div>
         {errors.languages && <span className="error-message">{errors.languages}</span>}
       </div>

       <div className="form-group">
         <label>Fighting Styles</label>
         <div className="multi-select-container multi-select-compact">
           {FIGHTING_STYLES.map(style => (
             <label 
              key={style} 
              className={`multi-select-item ${fightingStyles.includes(style) ? 'selected' : ''} ${isFightingStylePreSelected(style) ? 'pre-selected' : ''}`}
             >
               <input
                type="checkbox"
                checked={fightingStyles.includes(style)}
                onChange={() => onFightingStyleToggle(style)}
                disabled={isFightingStylePreSelected(style)}
               />
               &nbsp;{style}
             </label>
           ))}
         </div>
         {errors.fightingStyles && <span className="error-message">{errors.fightingStyles}</span>}
       </div>
     </div>
   );
}

export default WizardStepLanguages;