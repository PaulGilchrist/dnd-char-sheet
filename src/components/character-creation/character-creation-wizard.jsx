import React, { useState, useEffect } from 'react';
import './character-creation-wizard.css';
// Import dark mode styles - will be loaded via media query
import './character-creation-wizard-dark.css';
import merge from 'lodash/merge';
import {
  REQUIRED_FIELDS,
  ABILITY_NAMES,
  DEFAULT_FORM_DATA,
  POINT_BUY_COSTS
} from './constants';
import { validateStep, validateFinalFormData } from './utils';
import WizardHeader from './wizard-header';
import WizardProgressBar from './wizard-progress-bar';
import WizardFooter from './wizard-footer';
import WizardStepRules from './wizard-step-rules';
import WizardStepBasic from './wizard-step-basic';
import WizardStepRaceClass from './wizard-step-race-class';
import WizardStepAbilities from './wizard-step-abilities';
import WizardStepSkills from './wizard-step-skills';
import WizardStepLanguages from './wizard-step-languages';
import WizardStepInventory from './wizard-step-inventory';
import { validateSkills, getSkillLimits, getExpertiseLimits } from '../../services/skill-validation.js';
import { getLanguageLimits, getFightingStyleLimits, validateLanguagesAndFightingStyles } from '../../services/languages-fightingstyles-validation.js';
import WizardStepSpells from './wizard-step-spells';
import WizardStepFeats from './wizard-step-feats';
import WizardStepSpecial from './wizard-step-special';
import WizardStepResistances from './wizard-step-resistances';
import WizardStepMagicItems from './wizard-step-magic-items';

function CharacterCreationWizard({ onComplete, onCancel, allRaces, allClasses, allSpells, allSpells2024, characterData, isEditing = false }) {
  const [currentStep, setCurrentStep] = useState(isEditing ? 2 : 1);
  const [ruleset, setRuleset] = useState(characterData?.rules ?? null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [racesData, setRacesData] = useState([]);
  const [classSubtypes, setClassSubtypes] = useState([]);
  const [feats, setFeats] = useState([]);
  const [magicItems, setMagicItems] = useState([]);
  const [formData, setFormData] = useState(() => {
    if (isEditing && characterData) {
      return merge({}, DEFAULT_FORM_DATA, characterData);
    }
    return DEFAULT_FORM_DATA;
  });
  const [errors, setErrors] = useState({});
  const [tempInventory, setTempInventory] = useState({ backpack: [], equipped: [] });
  const [skillLimits, setSkillLimits] = useState(null);
  const [expertiseLimits, setExpertiseLimits] = useState(null);
  const [skillWarnings, setSkillWarnings] = useState([]);
  const [languageLimits, setLanguageLimits] = useState(null);
  const [fightingStyleLimits, setFightingStyleLimits] = useState(null);
  const [languageWarnings, setLanguageWarnings] = useState([]);

   // Validate skills when selection changes
  useEffect(() => {
    const validate = async () => {
      try {
        const limits = await getSkillLimits(formData);
        const expertise = await getExpertiseLimits(formData);
        const warnings = await validateSkills(formData);

        setSkillLimits(limits);
        setExpertiseLimits(expertise);
        setSkillWarnings(warnings);
       } catch (error) {
        console.error('Error validating skills:', error);
       }
     };

    validate();
   }, [formData.skillProficiencies, formData.expertSkills, formData.class?.name, formData.race?.name, formData.background, formData.rules, formData.level]);

      // Validate languages and fighting styles when selections change
     useEffect(() => {
       const validate = async () => {
         try {
           const langLimits = await getLanguageLimits(formData);
           const styleLimits = await getFightingStyleLimits(formData);
           const warnings = await validateLanguagesAndFightingStyles(formData);
           setLanguageLimits(langLimits);
           setFightingStyleLimits(styleLimits);
           setLanguageWarnings(warnings);
          } catch (error) {
           console.error('Error validating languages and fighting styles:', error);
          }
        };

       validate();
      }, [formData.languages, formData.class?.fightingStyles, formData.class?.name, formData.race?.name, formData.background, formData.rules, formData.level]);

      // Sync tempInventory with formData.inventory when it changes
  useEffect(() => {
    setTempInventory({
      backpack: formData.inventory?.backpack || [],
      equipped: formData.inventory?.equipped || [],
    });
  }, [formData.inventory]);

  // Load data based on ruleset
  useEffect(() => {
    const loadData = async (url, setData) => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error(`Failed to load ${url}:`, error);
        setData([]);
      }
    };

    if (ruleset === '2024') {
      loadData('/dnd-char-sheet/data/2024/backgrounds.json', setBackgrounds);
      loadData('/dnd-char-sheet/data/2024/races.json', setRacesData);
      loadData('/dnd-char-sheet/data/2024/classes.json', (data) => {
        setClassSubtypes(data.map(cls => ({
          className: cls.name,
          subtypes: cls.subclasses || cls.majors || []
        })));
      });
      loadData('/dnd-char-sheet/data/2024/feats.json', setFeats);
      loadData('/dnd-char-sheet/data/2024/magic-items.json', setMagicItems);
    } else {
      // 5e does not use the same background system as 2024
      setBackgrounds([]);
      loadData('/dnd-char-sheet/data/races.json', setRacesData);
      loadData('/dnd-char-sheet/data/classes.json', (data) => {
        setClassSubtypes(data.map(cls => ({
          className: cls.name,
          subtypes: cls.subclasses || []
        })));
      });
      loadData('/dnd-char-sheet/data/feats.json', setFeats);
      loadData('/dnd-char-sheet/data/magic-items.json', setMagicItems);
    }
  }, [ruleset]);

  // Validate ability scores
  useEffect(() => {
    if (currentStep === 3) {
      const abilityErrors = {};
      let totalPointsSpent = 0;
      
      formData.abilities.forEach((ability, index) => {
        const baseScore = parseInt(ability.baseScore) || 8;
        const improvements = parseInt(ability.abilityImprovements) || 0;
        const misc = parseInt(ability.miscBonus) || 0;
        const totalScore = baseScore + improvements + misc;

        const cost = POINT_BUY_COSTS[baseScore] || 0;
        totalPointsSpent += cost;

        if (baseScore < 8) {
          abilityErrors[`ability_${index}_baseScore`] = 'Base score must be at least 8';
        }
        if (baseScore > 18) {
          abilityErrors[`ability_${index}_baseScore`] = 'Base score cannot exceed 18';
        }
        if (totalScore > 20) {
          abilityErrors[`ability_${index}_totalScore`] = `Total score (base + improvements + misc) cannot exceed 20`;
        }
        if (improvements < 0) {
          abilityErrors[`ability_${index}_abilityImprovements`] = 'Improvements must be 0 or above';
        }
        if (misc < 0) {
          abilityErrors[`ability_${index}_miscBonus`] = 'Misc bonus must be 0 or above';
        }
      });

      if (totalPointsSpent > 27) {
        abilityErrors.pointsExceeded = `You have spent ${totalPointsSpent} points. You only have 27 points to spend.`;
      }

      setErrors(prev => ({ ...prev, ...abilityErrors }));
    }
  }, [formData.abilities, currentStep]);

  const handleRulesetChange = async (newRuleset) => {
    setRuleset(newRuleset);
    
    if (newRuleset === '2024') {
      setFormData(prev => ({
        ...prev,
        rules: '2024',
        spells: [],
        feats: [],
        background: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        rules: '5e',
        spells: [],
        feats: [],
        background: ''
      }));
    }
    
    setCurrentStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleArrayFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleAbilityChange = (index, field, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], [field]: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleAbilityBaseScoreChange = (index, value) => {
    const newBaseScore = parseInt(value) || 8;
    const oldBaseScore = parseInt(formData.abilities[index].baseScore) || 8;
    
    const calculateCost = (score) => {
      return POINT_BUY_COSTS[score] || 0;
    };
    
    const newCost = calculateCost(newBaseScore);
    const oldCost = calculateCost(oldBaseScore);
    
    const currentTotalSpent = formData.abilities.reduce((sum, ability, i) => {
      if (i === index) {
        return sum + newCost;
      }
      const baseScore = parseInt(ability.baseScore) || 8;
      const cost = calculateCost(baseScore);
      return sum + cost;
    }, 0);

    if (currentTotalSpent <= 27) {
      handleAbilityChange(index, 'baseScore', newBaseScore);
    }
  };

  const handleAbilityImprovementChange = (index, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], abilityImprovements: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleAbilityMiscBonusChange = (index, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], miscBonus: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => {
      const currentSkills = prev.skillProficiencies || [];
      const newSkills = currentSkills.includes(skill)
        ? currentSkills.filter(s => s !== skill)
        : [...currentSkills, skill];
      return { ...prev, skillProficiencies: newSkills };
    });
    setErrors(prev => ({ ...prev, skillProficiencies: null }));
  };

  const handleSkillExpertiseToggle = (skill, isExpert) => {
    setFormData(prev => {
      if (isExpert) {
        // Add to expertSkills
        const currentExpertSkills = prev.expertSkills || [];
        const newExpertSkills = [...currentExpertSkills, skill];
        return { ...prev, expertSkills: newExpertSkills };
      } else {
        // Remove from expertSkills
        const currentExpertSkills = prev.expertSkills || [];
        const newExpertSkills = currentExpertSkills.filter(s => s !== skill);
        return { ...prev, expertSkills: newExpertSkills };
      }
    });
    setErrors(prev => ({ ...prev, expertSkills: null }));
  };

  const handleLanguageToggle = (language) => {
    setFormData(prev => {
      const currentLanguages = prev.languages || [];
      const newLanguages = currentLanguages.includes(language)
        ? currentLanguages.filter(l => l !== language)
        : [...currentLanguages, language];
      return { ...prev, languages: newLanguages };
    });
    setErrors(prev => ({ ...prev, languages: null }));
  };

  const handleFightingStyleToggle = (style) => {
    setFormData(prev => {
      const currentStyles = prev.class?.fightingStyles || [];
      const newStyles = currentStyles.includes(style)
        ? currentStyles.filter(s => s !== style)
        : [...currentStyles, style];
      return { ...prev, class: { ...prev.class, fightingStyles: newStyles } };
    });
    setErrors(prev => ({ ...prev, fightingStyles: null }));
  };

  const handleResistanceToggle = (type) => {
    setFormData(prev => {
      const currentResistances = prev.resistances || [];
      const newResistances = currentResistances.includes(type)
        ? currentResistances.filter(r => r !== type)
        : [...currentResistances, type];
      return { ...prev, resistances: newResistances };
    });
    setErrors(prev => ({ ...prev, resistances: null }));
  };

  const handleImmunityToggle = (type) => {
    setFormData(prev => {
      const currentImmunities = prev.immunities || [];
      const newImmunities = currentImmunities.includes(type)
        ? currentImmunities.filter(i => i !== type)
        : [...currentImmunities, type];
      return { ...prev, immunities: newImmunities };
    });
    setErrors(prev => ({ ...prev, immunities: null }));
  };

  const handleInventoryChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      inventory: { ...prev.inventory, [field]: value }
    }));
  };

  const handleTempInventoryChange = (field, value) => {
    setTempInventory(prev => ({ ...prev, [field]: value }));
  };

   // Check if current step is valid (for disabling Next button)
  const currentStepErrors = validateStep(currentStep, formData, errors, racesData, classSubtypes, ruleset);
  const isNextDisabled = Object.keys(currentStepErrors).length > 0;

  const handleNext = () => {
    if (validateStep(currentStep, formData, errors, racesData, classSubtypes, ruleset)) {
      setCurrentStep(prev => prev + 1);
       }
     };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(currentStep, formData, errors, racesData, classSubtypes, ruleset)) {
      const finalErrors = validateFinalFormData(formData);
      if (Object.keys(finalErrors).length > 0) {
        setErrors(finalErrors);
        return;
      }
      onComplete(formData);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStepRules
            ruleset={ruleset}
            errors={errors}
            onRulesetChange={handleRulesetChange}
          />
        );
      case 2:
        return (
          <WizardStepBasic
            formData={formData}
            errors={errors}
            backgrounds={backgrounds}
            ruleset={ruleset}
            onInputChange={handleInputChange}
          />
        );
      case 3:
        return (
          <WizardStepRaceClass
            formData={formData}
            errors={errors}
            racesData={racesData}
            classSubtypes={classSubtypes}
            ruleset={ruleset}
            onInputChange={handleInputChange}
          />
        );
      case 4:
        return (
          <WizardStepFeats
            formData={formData}
            allFeats={feats}
            onArrayFieldChange={handleArrayFieldChange}
          />
        );
      case 5:
        return (
          <WizardStepAbilities
            formData={formData}
            errors={errors}
            onAbilityBaseScoreChange={handleAbilityBaseScoreChange}
            onAbilityImprovementChange={handleAbilityImprovementChange}
            onAbilityMiscBonusChange={handleAbilityMiscBonusChange}
          />
        );
      case 6:
        return (
          <WizardStepSkills
            formData={formData}
            errors={errors}
            onSkillToggle={handleSkillToggle}
            onSkillExpertiseToggle={handleSkillExpertiseToggle}
            skillLimits={skillLimits}
            expertiseLimits={expertiseLimits}
            warnings={skillWarnings}
          />
        );
      case 7:
          return (
             <WizardStepLanguages
              formData={formData}
              errors={errors}
              onLanguageToggle={handleLanguageToggle}
              onFightingStyleToggle={handleFightingStyleToggle}
              languageLimits={languageLimits}
              fightingStyleLimits={fightingStyleLimits}
              warnings={languageWarnings}
             />
        );
      case 8:
        return (
          <WizardStepResistances
            formData={formData}
            onResistanceToggle={handleResistanceToggle}
            onImmunityToggle={handleImmunityToggle}
          />
        );
      case 9:
        return (
          <WizardStepSpells
            formData={formData}
            allSpells={allSpells || []}
            onArrayFieldChange={handleArrayFieldChange}
          />
        );
      case 10:
        return (
          <WizardStepMagicItems
            formData={formData}
            allMagicItems={magicItems}
            ruleset={ruleset}
            onArrayFieldChange={handleArrayFieldChange}
          />
        );
      case 11:
        return (
          <WizardStepInventory
            formData={formData}
            tempInventory={tempInventory}
            onInventoryChange={handleInventoryChange}
            onTempInventoryChange={handleTempInventoryChange}
          />
        );
      case 12:
        return (
          <WizardStepSpecial
            formData={formData}
            onArrayFieldChange={handleArrayFieldChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="character-creation-wizard-overlay">
      <div className="character-creation-wizard">
        <WizardHeader
          title={isEditing ? "Edit Character" : "Create New Character"}
          onClose={onCancel}
        />
        <WizardProgressBar
                    currentStep={currentStep}
                    totalSteps={12}
                    isEditing={isEditing}
                  />
        <div className="wizard-content">
          {renderStep()}
        </div>
        <WizardFooter
          currentStep={currentStep}
          isFirstStep={isEditing ? currentStep === 2 : currentStep === 1}
          isLastStep={currentStep === 12}
          onCancel={onCancel}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleSubmit}
          isEditing={isEditing}
          isNextDisabled={isNextDisabled}
        />
      </div>
    </div>
  );
}

export default CharacterCreationWizard;

