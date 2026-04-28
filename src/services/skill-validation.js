/**
 * Skill validation service for character creation wizard
 * Provides non-blocking warnings about skill proficiency selections
 * Supports both 5e and 2024 rulesets
 */

let classDataCache = {
  '5e': null,
  '2024': null
};

let raceDataCache = {
  '5e': null,
  '2024': null
};

let backgroundDataCache = {
  '2024': null
};

/**
 * Fetches class data from JSON files (with caching)
 * @param {string} version - '5e' or '2024'
 * @returns {Promise<object[]>} - Array of class data
 */
async function loadClassData(version = '5e') {
  if (classDataCache[version]) {
    return classDataCache[version];
  }
  
  try {
    const path = version === '2024' ? 'data/2024/classes.json' : 'data/classes.json';
    const baseUrl = import.meta.env?.BASE_URL || '';
    const fullPath = baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${version} classes.json from ${fullPath}`);
    }
    const data = await response.json();
    classDataCache[version] = data;
    return data;
  } catch (error) {
    console.error(`Error loading ${version} classes.json:`, error);
    return [];
  }
}

/**
 * Fetches race data from JSON files (with caching)
 * @param {string} version - '5e' or '2024'
 * @returns {Promise<object[]>} - Array of race data
 */
async function loadRaceData(version = '5e') {
  if (raceDataCache[version]) {
    return raceDataCache[version];
  }
  
  try {
    const path = version === '2024' ? 'data/2024/races.json' : 'data/races.json';
    const baseUrl = import.meta.env?.BASE_URL || '';
    const fullPath = baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${version} races.json from ${fullPath}`);
    }
    const data = await response.json();
    raceDataCache[version] = data;
    return data;
  } catch (error) {
    console.error(`Error loading ${version} races.json:`, error);
    return [];
  }
}

/**
 * Fetches background data from JSON files (with caching) - 2024 only
 * @returns {Promise<object[]>} - Array of background data
 */
async function loadBackgroundData() {
  if (backgroundDataCache['2024']) {
    return backgroundDataCache['2024'];
  }
  
  try {
    const path = 'data/2024/backgrounds.json';
    const baseUrl = import.meta.env?.BASE_URL || '';
    const fullPath = baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`Failed to load 2024 backgrounds.json from ${fullPath}`);
    }
    const data = await response.json();
    backgroundDataCache['2024'] = data;
    return data;
  } catch (error) {
    console.error(`Error loading 2024 backgrounds.json:`, error);
    return [];
  }
}

/**
 * Fetches a specific class by name from the JSON data
 * @param {string} className - The name of the class (e.g., 'Wizard', 'Bard')
 * @param {string} version - '5e' or '2024'
 * @returns {object|null} - The class data or null if not found
 */
export async function fetchClassData(className, version = '5e') {
  const classes = await loadClassData(version);
  return classes.find(c => c.name === className || c.index === className.toLowerCase()) || null;
}

/**
 * Fetches a specific race by name from the JSON data
 * @param {string} raceName - The name of the race (e.g., 'Human', 'Elf')
 * @param {string} version - '5e' or '2024'
 * @returns {object|null} - The race data or null if not found
 */
export async function fetchRaceData(raceName, version = '5e') {
  const races = await loadRaceData(version);
  return races.find(r => r.name === raceName || r.index === raceName.toLowerCase()) || null;
}

/**
 * Fetches a specific background by name from the JSON data (2024 only)
 * @param {string} backgroundName - The name of the background
 * @returns {object|null} - The background data or null if not found
 */
export async function fetchBackgroundData(backgroundName) {
  const backgrounds = await loadBackgroundData();
  return backgrounds.find(b => b.name === backgroundName || b.index === backgroundName.toLowerCase()) || null;
}

/**
 * Parses skill proficiencies from a class/race/background data object
 * Handles both "Choose X from..." format and direct skill lists
 * @param {object} data - The class/race/background data object
 * @returns {object} - { count: number, skills: string[], isChoice: boolean }
 */
function parseSkillProficiencies(data) {
  if (!data) {
    return { count: 0, skills: [], isChoice: false };
  }

  const skillField = data.skill_proficiencies || data.skill_proficiencies_choices;
  if (!skillField) {
    return { count: 0, skills: [], isChoice: false };
  }

  // Check if it's a "Choose X from..." format
  const chooseMatch = skillField.match(/Choose\s+(\d+)/i);
  if (chooseMatch) {
    const count = parseInt(chooseMatch[1], 10);
    
    // Extract the list of available skills
    const fromMatch = skillField.match(/from\s+(.+)$/i);
    if (fromMatch) {
      const skillsString = fromMatch[1];
      // Parse skills, handling "or" before the last skill
      const skills = skillsString
        .replace(/ or ,?$/, '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      return { count, skills, isChoice: true };
    }
    
    return { count, skills: [], isChoice: true };
  }

  // Direct skill list (e.g., "Insight and Religion" for backgrounds)
  const skills = skillField
    .replace(/ and /g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return { count: skills.length, skills, isChoice: false };
}

/**
 * Gets the number of skill proficiencies allowed based on ruleset, class, race, and background
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { allowed: number, fromClass: object, fromRace: object, fromBackground: object, details: string }
 */
export async function getSkillLimits(formData) {
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const raceName = formData.race?.name || '';
  const backgroundName = formData.background || '';

  let fromClass = { count: 0, skills: [], isChoice: true };
  let fromRace = { count: 0, skills: [], isChoice: false };
  let fromBackground = { count: 0, skills: [], isChoice: false };

  if (ruleset === '2024') {
    // 2024 rules: Class gives choice, Race gives automatic, Background gives 2 skills
    if (className) {
      const classData = await fetchClassData(className, '2024');
      fromClass = parseSkillProficiencies(classData);
    }

    if (raceName) {
      const raceData = await fetchRaceData(raceName, '2024');
      fromRace = parseSkillProficiencies(raceData);
    }

    if (backgroundName) {
      const backgroundData = await fetchBackgroundData(backgroundName);
      fromBackground = parseSkillProficiencies(backgroundData);
    }

    const totalAllowed = fromClass.count + fromRace.count + fromBackground.count;

    return {
      allowed: totalAllowed,
      fromClass,
      fromRace,
      fromBackground,
      details: `In 2024 rules, you get ${fromClass.count} skill choice(s) from your class, ${fromRace.count} from your race, and ${fromBackground.count} from your background (${totalAllowed} total)`
    };
  }

  // 5e rules: Class gives choice, Race gives automatic or choice, Background gives 2 skills
  if (className) {
    const classData = await fetchClassData(className, '5e');
    fromClass = parseSkillProficiencies(classData);
  }

  if (raceName) {
    const raceData = await fetchRaceData(raceName, '5e');
    fromRace = parseSkillProficiencies(raceData);
  }

  // 5e backgrounds typically give 2 skills but data structure may differ
  // For now, assume 2 background skills in 5e
  fromBackground = { count: 2, skills: [], isChoice: true };

  const totalAllowed = fromClass.count + fromRace.count + fromBackground.count;

  return {
    allowed: totalAllowed,
    fromClass,
    fromRace,
    fromBackground,
    details: `In 5e rules, you get ${fromClass.count} skill choice(s) from your class, ${fromRace.count} from your race, and 2 from your background (${totalAllowed} total)`
  };
}

/**
 * Determines which skills are pre-selected (automatically granted) from race/class/background
 * @param {object} formData - The character form data
 * @returns {Promise<string[]>} - Array of skill names that are automatically granted
 */
export async function getPreSelectedSkills(formData) {
  const ruleset = formData.rules || '5e';
  const preSelected = new Set();

  // Race skills (automatic, not choices)
  if (formData.race?.name) {
    const raceData = await fetchRaceData(formData.race.name, ruleset);
    const raceSkills = parseSkillProficiencies(raceData);
    if (!raceSkills.isChoice) {
      raceSkills.skills.forEach(skill => preSelected.add(skill));
    }
  }

  // Background skills (automatic, not choices)
  if (formData.background) {
    if (ruleset === '2024') {
      const backgroundData = await fetchBackgroundData(formData.background);
      const bgSkills = parseSkillProficiencies(backgroundData);
      if (!bgSkills.isChoice) {
        bgSkills.skills.forEach(skill => preSelected.add(skill));
      }
    }
    // 5e backgrounds typically let you choose, so no pre-selection
  }

  // Class skills that are automatic (not choices)
  if (formData.class?.name) {
    const classData = await fetchClassData(formData.class.name, ruleset);
    const classSkills = parseSkillProficiencies(classData);
    if (!classSkills.isChoice) {
      classSkills.skills.forEach(skill => preSelected.add(skill));
    }
  }

  return Array.from(preSelected);
}

/**
 * Determines if expertise is allowed and how many expertise slots are available
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { allowed: boolean, count: number, details: string }
 */
export async function getExpertiseLimits(formData) {
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const level = formData.level || 1;

  // Expertise is primarily a Bard and Rogue feature
  if (className === 'Bard' || className === 'Rogue') {
    if (ruleset === '2024') {
      // 2024 Bard: Expertise at level 2 (2 skills), level 9 (2 more)
      // 2024 Rogue: Expertise at level 1 (2 skills), level 6 (2 more)
      let count = 0;
      
      if (className === 'Rogue') {
        if (level >= 1) count += 2;
        if (level >= 6) count += 2;
      } else if (className === 'Bard') {
        if (level >= 2) count += 2;
        if (level >= 9) count += 2;
      }

      return {
        allowed: true,
        count,
        details: `${className} can have expertise in ${count} skill(s) at level ${level}`
      };
    }

    // 5e Bard: Expertise at level 1 (2 skills), level 10 (2 more)
    // 5e Rogue: Expertise at level 1 (2 skills), level 7 (2 more)
    let count5e = 0;
    
    if (className === 'Rogue') {
      if (level >= 1) count5e += 2;
      if (level >= 7) count5e += 2;
    } else if (className === 'Bard') {
      if (level >= 1) count5e += 2;
      if (level >= 10) count5e += 2;
    }

    return {
      allowed: true,
      count: count5e,
      details: `${className} can have expertise in ${count5e} skill(s) at level ${level}`
    };
  }

  // Other classes don't get expertise (unless from multiclassing, feats, etc.)
  return {
    allowed: false,
    count: 0,
    details: 'Expertise is not available for this class'
  };
}

/**
 * Validates skill selections and returns warnings (not blocking errors)
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - Array of warning objects { message: string, type: 'warning'|'info' }
 */
export async function validateSkills(formData) {
  const warnings = [];
  const selectedSkills = formData.skillProficiencies || [];
  const expertSkills = formData.expertSkills || [];
  const ruleset = formData.rules || '5e';

  // Get skill limits
  const limits = await getSkillLimits(formData);
  const expertiseLimits = await getExpertiseLimits(formData);

  // Check if too many skills selected
  if (selectedSkills.length > limits.allowed) {
    warnings.push({
      message: `Rules allow ${limits.allowed} skill proficiency/ies. You have selected ${selectedSkills.length}. (${limits.details})`,
      type: 'warning'
    });
  }

  // Check if too few skills selected (info, not warning)
  if (selectedSkills.length < limits.allowed && selectedSkills.length > 0) {
    warnings.push({
      message: `You can select up to ${limits.allowed} skill proficiencies. You have selected ${selectedSkills.length}.`,
      type: 'info'
    });
  }

  // Check expertise validity
  if (expertSkills.length > 0) {
    // Check if expertise is allowed for this class
    if (!expertiseLimits.allowed) {
      warnings.push({
        message: `Expertise is not available for ${formData.class?.name || 'this class'}. Expertise is typically a Bard or Rogue feature.`,
        type: 'warning'
      });
    }

    // Check if too many expertise selections
    if (expertSkills.length > expertiseLimits.count) {
      warnings.push({
        message: `You can have expertise in ${expertiseLimits.count} skill(s). You have selected ${expertSkills.length}. (${expertiseLimits.details})`,
        type: 'warning'
      });
    }

    // Check if all expert skills are also proficient
    const nonProficientExperts = expertSkills.filter(skill => !selectedSkills.includes(skill));
    if (nonProficientExperts.length > 0) {
      warnings.push({
        message: `Expertise requires proficiency first. These skills are not proficient: ${nonProficientExperts.join(', ')}`,
        type: 'warning'
      });
    }
  }

  // Check for duplicate skills in selection
  const uniqueSkills = new Set(selectedSkills);
  if (uniqueSkills.size < selectedSkills.length) {
    warnings.push({
      message: `Some skills are selected multiple times. Each skill should only be selected once.`,
      type: 'warning'
    });
  }

  return warnings;
   }

/**
 * Gets skill proficiency information for display
 * @param {string} skillName - Name of the skill
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { isAllowed: boolean, source: string, isPreSelected: boolean }
 */
export async function getSkillInfo(skillName, formData) {
  const ruleset = formData.rules || '5e';
  const sources = [];
  let isPreSelected = false;

   // Check if skill comes from class
  if (formData.class?.name) {
  const classData = await fetchClassData(formData.class.name, ruleset);
  const classSkills = parseSkillProficiencies(classData);
  if (classSkills.skills.includes(skillName)) {
    sources.push('Class');
    if (!classSkills.isChoice) {
      isPreSelected = true;
   }
   }
  }

   // Check if skill comes from race
  if (formData.race?.name) {
  const raceData = await fetchRaceData(formData.race.name, ruleset);
  const raceSkills = parseSkillProficiencies(raceData);
  if (raceSkills.skills.includes(skillName)) {
    sources.push('Race');
    if (!raceSkills.isChoice) {
      isPreSelected = true;
   }
   }
  }

   // Check if skill comes from background (2024 only)
  if (formData.background && ruleset === '2024') {
  const backgroundData = await fetchBackgroundData(formData.background);
  const bgSkills = parseSkillProficiencies(backgroundData);
  if (bgSkills.skills.includes(skillName)) {
    sources.push('Background');
    if (!bgSkills.isChoice) {
      isPreSelected = true;
   }
   }
  }

  return {
  isAllowed: sources.length > 0,
  source: sources.join(', '),
  isPreSelected
   };
}
