import { POINT_BUY_COSTS, REQUIRED_FIELDS } from './constants';

export const calculatePointBuyCost = (baseScore) => {
  const score = parseInt(baseScore) || 8;
  return POINT_BUY_COSTS[score] || 0;
};

export const calculateTotalScore = (ability) => {
  const base = parseInt(ability.baseScore) || 8;
  const improvements = parseInt(ability.abilityImprovements) || 0;
  const misc = parseInt(ability.miscBonus) || 0;
  return base + improvements + misc;
};

export const validateAbility = (ability, index) => {
  const errors = {};
  const baseScore = parseInt(ability.baseScore) || 8;
  const totalScore = calculateTotalScore(ability);

  if (baseScore < 8) {
    errors.baseScore = 'Base score must be at least 8';
  }
  if (baseScore > 18) {
    errors.baseScore = 'Base score cannot exceed 18 (point buy max)';
  }
  if (totalScore > 20) {
    errors.totalScore = `Total score (base + improvements + misc) cannot exceed 20`;
  }
  if (parseInt(ability.abilityImprovements) < 0) {
    errors.abilityImprovements = 'Improvements must be 0 or above';
  }
  if (parseInt(ability.miscBonus) < 0) {
    errors.miscBonus = 'Misc bonus must be 0 or above';
  }

  return errors;
};

export const validateStep = (step, formData, errors, racesData = [], classSubtypes = [], ruleset) => {
  const newErrors = {};
    
    // Step 2: Basic Information - validate name, level, alignment, and background (2024)
  if (step === 2) {
    if (!formData.name?.trim()) {
      newErrors.name = 'Character name is required';
    }
    if (!formData.level || formData.level < 1 || formData.level > 20) {
      newErrors.level = 'Level must be between 1 and 20';
    }
    if (!formData.alignment) {
      newErrors.alignment = 'Alignment is required';
      }
    if (ruleset === '2024' && !formData.background) {
      newErrors.background = 'Background is required';
      }
    }
    
    // Step 3: Race & Class - validate race, class, subrace and subclass
  if (step === 3) {
    if (!formData.race || !formData.race.name) {
      newErrors.race = 'Race is required';
    }
    if (!formData.class || !formData.class.name) {
      newErrors.class = 'Class is required';
    }
    
    // Check if subrace is required (when race has subraces)
    if (formData.race?.name) {
      const selectedRace = racesData.find(race => race.name === formData.race.name);
      const availableSubraces = selectedRace?.subraces || [];
      if (availableSubraces.length > 0) {
        if (!formData.race.subrace || !formData.race.subrace.name) {
          newErrors.subrace = 'Subrace is required';
    }
       }
     }
    
    // Check if subclass is required (when class has subclasses)
    if (formData.class?.name) {
      const selectedClass = classSubtypes.find(cs => cs.className === formData.class.name);
      const availableSubclasses = selectedClass?.subtypes || [];
      if (availableSubclasses.length > 0) {
        if (!formData.class.subclass || !formData.class.subclass.name) {
          newErrors.subclass = 'Subclass is required';
  }
       }
     }
   }
  
  if (step === 4) {
    let totalPointsSpent = 0;
    formData.abilities.forEach((ability, index) => {
      const abilityErrors = validateAbility(ability, index);
      Object.keys(abilityErrors).forEach(key => {
        newErrors[`ability_${index}_${key}`] = abilityErrors[key];
      });
      totalPointsSpent += calculatePointBuyCost(ability.baseScore);
    });

    if (totalPointsSpent > 27) {
      newErrors.pointsExceeded = `You have spent ${totalPointsSpent} points. You only have 27 points to spend.`;
  }
   }
  
  return newErrors;
};

export const validateFinalFormData = (formData) => {
  const finalErrors = {};
  REQUIRED_FIELDS.forEach(field => {
    if (field === 'abilities' || field === 'inventory' || field === 'skillProficiencies') {
      return;
    }
    if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
      finalErrors[field] = `${field} is required`;
    }
  });
  return finalErrors;
};
