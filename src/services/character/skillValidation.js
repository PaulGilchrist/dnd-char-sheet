/**
 * Skill validation service for character creation wizard
 * Provides non-blocking warnings about skill proficiency selections
 * Supports both 5e and 2024 rulesets
 */

const ALL_SKILL_NAMES = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

/**
 * Checks if a feat grants proficiency in all skills (e.g., Boon of Skill)
 * @param {object} feat - The feat data object
 * @returns {boolean}
 */
function featGrantsAllSkillProficiencies(feat) {
  if (!feat || !feat.benefits) return false;
  return feat.benefits.some(benefit =>
    benefit.type === 'proficiency' &&
    benefit.description &&
    /proficiency in (all|every).?skill/i.test(benefit.description)
  );
}

/**
 * Checks if a feat grants expertise slots (e.g., Boon of Skill)
 * @param {object} feat - The feat data object
 * @returns {number} Number of expertise slots granted (0 or 1)
 */
function featGrantsExpertise(feat) {
  if (!feat || !feat.benefits) return 0;
  return feat.benefits.reduce((count, benefit) => {
    if (
      benefit.type === 'proficiency' &&
      benefit.description &&
      /choose\s+(\d+|one)/i.test(benefit.description)
    ) {
      const match = benefit.description.match(/choose\s+(\d+)/i);
      if (match) {
        return count + parseInt(match[1], 10);
      }
      if (benefit.description.match(/choose\s+one/i)) {
        return count + 1;
      }
    }
    if (
      benefit.type === 'proficiency' &&
      benefit.automation &&
      benefit.automation.effect === 'expertise'
    ) {
      return count + (benefit.automation.count || 1);
    }
    return count;
  }, 0);
}

/**
 * Finds feats in formData that grant all skill proficiencies
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Array} Matching feat objects
 */
async function findAllSkillProfFeats(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return [];
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return [];
  }

  return formData.feats
    .map(featName => featData.find(f => f.name === featName || f.index === featName.toLowerCase()))
    .filter(feat => feat && featGrantsAllSkillProficiencies(feat));
}

/**
 * Counts proficiency choices granted by feats (e.g., Keen Mind Lore Knowledge: choose 1 from 5 skills)
 * These are proficiency-type benefits with a "choose X" pattern that grant proficiency in a skill list
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {number} Total proficiency choices from feats
 */
async function countFeatProficiencyChoices(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return 0;
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return 0;
  }

  return formData.feats.reduce((total, featName) => {
    const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
    if (!feat || !feat.benefits) return total;

    return total + feat.benefits.reduce((featTotal, benefit) => {
      if (benefit.type === 'proficiency' && benefit.description) {
        // Count "choose X" proficiency benefits (not "all skills" which is handled separately)
        if (/choose\s+(\d+|one)/i.test(benefit.description)) {
          const match = benefit.description.match(/choose\s+(\d+)/i);
          if (match) return featTotal + parseInt(match[1], 10);
          if (benefit.description.match(/choose\s+one/i)) return featTotal + 1;
        }
      }
      return featTotal;
    }, 0);
  }, 0);
}


/**
 * Counts expertise slots granted by feats in formData
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {number} Total expertise slots from feats
 */
async function countFeatExpertiseSlots(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return 0;
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return 0;
  }

  return formData.feats.reduce((total, featName) => {
    const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
    return total + featGrantsExpertise(feat);
  }, 0);
}

/**
 * Finds feat proficiency benefits that grant expertise with a restricted skill list
 * (e.g., Keen Mind "Lore Knowledge": Arcana, History, Investigation, Nature, Religion)
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Array<string[]>|null} Array of skill name arrays, or null if no restricted lists found
 */
async function getFeatExpertiseSkillLists(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return null;
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return null;
  }

  const skillLists = [];

  formData.feats.forEach(featName => {
    const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
    if (!feat || !feat.benefits) return;

    feat.benefits.forEach(benefit => {
      if (benefit.type === 'proficiency' && benefit.description && benefit.description.includes('Expertise')) {
        const match = benefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
        if (match) {
          const skillList = match[1]
            .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
          if (skillList.length > 0) {
            skillLists.push(skillList);
          }
        }
      }
    });
  });

  return skillLists.length > 0 ? skillLists : null;
}

/**
 * Counts Skilled feat instances and returns total skill/tool choice uses
 * Each Skilled instance grants 3 uses (skills or tools of your choice)
 * Skilled is repeatable in 2024 ruleset
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {number} Total Skilled uses available (instances × 3)
 */
async function countSkilledUses(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return 0;
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return 0;
  }

  const SKILLED_NAME = 'Skilled';
  let skilledInstances = 0;

  formData.feats.forEach(featName => {
    if (featName === SKILLED_NAME) {
      skilledInstances++;
    }
  });
  return skilledInstances * 3;
}

/**
 * Counts Skill Expert feat instances and returns total skill proficiency choices.
 * Each Skill Expert instance grants 1 skill proficiency of your choice.
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {number} Total Skill Expert skill proficiency choices available
 */
async function countSkillExpertProficiencyChoices(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return 0;
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return 0;
  }

  const SKILL_EXPERT_NAME = 'Skill Expert';
  let skillExpertInstances = 0;

  formData.feats.forEach(featName => {
    if (featName === SKILL_EXPERT_NAME) {
      skillExpertInstances++;
    }
  });

  return skillExpertInstances;
}


/**
 * Computes how many total skill proficiency selections are not covered by restrictive sources.
 * These uncovered selections are assumed to come from Skilled.
 * Used by both skill and tool limits to coordinate shared Skilled pool.
 * @param {Array} skillChoiceSources - The skillChoiceSources array from getSkillLimits
 * @param {Array} selectedSkills - Array of selected skill names
 * @returns {number} Number of selected skills allocated from Skilled
 */
function computeSkilledSkillUsage(skillChoiceSources, selectedSkills) {
  if (!skillChoiceSources || skillChoiceSources.length === 0 || !selectedSkills || selectedSkills.length === 0) {
    return 0;
  }

  const assignedSkills = new Set();
  const sourceAssignments = {};
  skillChoiceSources.forEach(s => {
    const key = s.source + '_' + (s.featName || '0');
    sourceAssignments[key] = 0;
  });

  const remainingSkills = [...selectedSkills];

  while (remainingSkills.length > 0) {
    let bestSource = null;
    let bestSize = Infinity;

    skillChoiceSources.forEach(source => {
      const key = source.source + '_' + (source.featName || '0');
      const remainingCapacity = source.count - sourceAssignments[key];
      if (remainingCapacity <= 0) return;
      const unassignedInPool = remainingSkills.filter(s =>
        source.skills.includes(s) && !assignedSkills.has(s)
      );
      if (unassignedInPool.length > 0 && source.skills.length < bestSize) {
        bestSource = source;
        bestSize = source.skills.length;
      }
    });

    if (!bestSource) break;

    const assigned = remainingSkills.find(s =>
      bestSource.skills.includes(s) && !assignedSkills.has(s)
    );
    if (!assigned) break;

    const key = bestSource.source + '_' + (bestSource.featName || '0');
    sourceAssignments[key]++;
    assignedSkills.add(assigned);
    const idx = remainingSkills.indexOf(assigned);
    remainingSkills.splice(idx, 1);
  }

  return selectedSkills.length - assignedSkills.size;
}

/**
 * Computes total Skilled usage across both skills and tools.
 * Skills: count of skillProficiencies not covered by restrictive sources
 * Tools: count of toolProficiencies not covered by category limits
 * @param {object} formData - The character form data
 * @param {Array} skillChoiceSources - The skillChoiceSources array from getSkillLimits
 * @returns {Promise<number>} Total Skilled uses consumed (skills + tools)
 */
async function computeTotalSkilledUsage(formData, skillChoiceSources) {
  const skilledSkillUsage = computeSkilledSkillUsage(
    skillChoiceSources,
    formData.skillProficiencies || []
  );

  const skilledToolUsage = await computeSkilledToolUsageOnly(formData);

  return skilledSkillUsage + skilledToolUsage;
}

/**
 * Computes how many tool proficiency selections are not covered by category limits (i.e., from Skilled)
 * @param {object} formData - The character form data
 * @returns {Promise<number>} Number of selected tools allocated from Skilled
 */
async function computeSkilledToolUsageOnly(formData) {
  const isPlaceholder = (t) => /^(\d+) from: (.+)$/.test(t);
  const allTools = (formData.toolProficiencies || []);

  // Load tool data and class/background limits to categorize
  const { loadEquipment, fetchClassData, fetchBackgroundData } = await import('../ui/dataLoader.js');
  const equipment = await loadEquipment();
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const backgroundName = formData.background || '';

  if (ruleset !== '2024') {
    // Tools only exist in 2024 ruleset
    return 0;
  }

  const toolCategories = ["Artisan's Tools", 'Gaming Sets', 'Musical Instrument', 'Other Tools'];
  const toolsByCategory = {};
  toolCategories.forEach(cat => {
    toolsByCategory[cat] = new Set(
      equipment.filter(e =>
        e.equipment_category === 'Tools' &&
        e.tool_category === cat
      ).map(e => e.name)
    );
  });

  // Build category limits and pre-selected tools from class and background
  const categoryLimits = new Map();
  const preSelectedTools = new Set();

  if (backgroundName) {
    const bgData = await fetchBackgroundData(backgroundName, '2024');
    if (bgData?.tool_proficiencies) {
      const parsed = parseToolChoiceString?.(bgData.tool_proficiencies);
      if (parsed?.isChoice) {
        for (const cat of parsed.categories) {
          categoryLimits.set(cat, (categoryLimits.get(cat) || 0) + parsed.count);
        }
      } else {
        preSelectedTools.add(bgData.tool_proficiencies);
      }
    }
  }

  if (className) {
    const classData = await fetchClassData(className, '2024');
    if (classData?.tool_proficiencies) {
      const parsed = parseToolChoiceString?.(classData.tool_proficiencies);
      if (parsed?.isChoice) {
        for (const cat of parsed.categories) {
          categoryLimits.set(cat, (categoryLimits.get(cat) || 0) + parsed.count);
        }
      } else {
        preSelectedTools.add(classData.tool_proficiencies);
      }
    }
  }

  // Feats (e.g., Chef grants Cook's Utensils)
  if (formData.feats && formData.feats.length > 0) {
    const { loadFeatData } = await import('../ui/dataLoader.js');
    const allFeats = await loadFeatData('2024');
    for (const featName of formData.feats) {
      const feat = allFeats.find(f => f.name === featName || f.index === featName.toLowerCase());
      if (feat) {
        const chefBenefit = feat.benefits.find(b =>
          b.type === 'proficiency' &&
          b.description &&
          /cook['\u2019]?\w*\s*utensil/i.test(b.description)
        );
        if (chefBenefit) {
          preSelectedTools.add("Cook's Utensils");
        }
      }
    }
  }

  // Filter out pre-selected and placeholder tools
  const userSelectedTools = allTools.filter(t => !preSelectedTools.has(t) && !isPlaceholder(t));

  if (userSelectedTools.length === 0) {
    return 0;
  }

  let categoryCovered = 0;
  for (const [category, limit] of categoryLimits) {
    const selectedInCategory = userSelectedTools.filter(t =>
      toolsByCategory[category]?.has(t)
    ).length;
    categoryCovered += Math.min(selectedInCategory, limit);
  }

  const result = Math.max(0, userSelectedTools.length - categoryCovered);

  return result;
}

import { fetchClassData, fetchRaceData, fetchBackgroundData, loadFeatData } from '../ui/dataLoader.js';
import { parseToolChoiceString } from './toolValidation.js';

/**
 * Extracts skill choice lists from race traits with proficiency_choices
 * (e.g., Human "Skillful": choose 1 from all 18 skills)
 * @param {object} formData - The character form data
 * @returns {Array<{count: number, skills: string[]}>} Race proficiency choice sources
 */
async function getRaceProficiencyChoiceSources(formData) {
  if (!formData.race?.name) return [];

  const raceData = await fetchRaceData(formData.race.name, formData.rules || '2024');
  if (!raceData || !raceData.traits) return [];

  const sources = [];
  raceData.traits.forEach(trait => {
    if (trait.proficiency_choices && trait.proficiency_choices.from && trait.proficiency_choices.from[0].startsWith('Skill: ')) {
      const skills = trait.proficiency_choices.from
        .map(s => s.replace('Skill: ', '').trim())
        .filter(s => s.length > 0);
      if (skills.length > 0 && trait.proficiency_choices.choose > 0) {
        sources.push({
          source: 'race',
          count: trait.proficiency_choices.choose,
          skills: skills,
        });
      }
    }
  });

  return sources;
}

/**
 * Extracts skill choice lists from race origin feats
 * (e.g., Human's Versatile trait grants an origin feat like Keen Mind)
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Array<{count: number, skills: string[], featName: string}>} Race feat proficiency choice sources
 */
async function getRaceFeatProficiencyChoiceSources(formData, allFeats) {
  if (!formData.race?.name) return [];

  const raceData = await fetchRaceData(formData.race.name, formData.rules || '2024');
  if (!raceData || !raceData.traits) return [];

  const originFeats = [];
  raceData.traits.forEach(trait => {
    if (trait.proficiency_choices && trait.proficiency_choices.from && !trait.proficiency_choices.from[0].startsWith('Skill: ')) {
      originFeats.push(...trait.proficiency_choices.from);
    }
  });

  if (originFeats.length === 0) return [];

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) return [];

  const sources = [];
  originFeats.forEach(featName => {
    const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
    if (!feat || !feat.benefits) return;

    feat.benefits.forEach(benefit => {
      if (benefit.type === 'proficiency' && benefit.description) {
        const match = benefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
        if (match) {
          const skills = match[1]
            .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
          if (skills.length > 0) {
            sources.push({
              source: 'race_feat',
              count: 1,
              skills: skills,
              featName: feat.name,
            });
          }
        }
      }
    });
  });

  return sources;
}

/**
 * Gets proficiency choice data from character feats
 * Returns { count, skillLists } where skillLists is an array of skill arrays
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Promise<{count: number, skillLists: Array<{skills: string[], featName: string}>}>}
 */
async function getFeatProficiencyChoiceData(formData, allFeats) {
  if (!formData.feats || formData.feats.length === 0) {
    return { count: 0, skillLists: [] };
  }

  const featData = (allFeats && allFeats.length > 0) ? allFeats : await loadFeatData(formData.rules || '5e');
  if (!featData || featData.length === 0) {
    return { count: 0, skillLists: [] };
  }

  let totalCount = 0;
  const skillLists = [];

  formData.feats.forEach(featName => {
    const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
    if (!feat || !feat.benefits) return;

    feat.benefits.forEach(benefit => {
      if (benefit.type === 'proficiency' && benefit.description) {
        const match = benefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
        if (match) {
          const skills = match[1]
            .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
          if (skills.length > 0) {
            totalCount += 1;
            skillLists.push({
              skills: skills,
              featName: feat.name,
            });
          }
        }
      }
    });
  });

  return { count: totalCount, skillLists };
}

/**
 * Parses skill proficiencies from a class/race/background data object
 * Handles both "Choose X from..." format and direct skill lists
 * @param {object} data - The class/race/background data object
 * @returns {object} - { count: number, skills: string[], isChoice: boolean }
 */
function parseSkillProficiencies(data, ruleset = '5e') {
  if (!data) {
    return { count: 0, skills: [], isChoice: false };
  }

  // 2024: Check trait descriptions for skill proficiency grants
  if (ruleset === '2024' && data.traits) {
    const skills = [];
    let choiceCount = 0;
    data.traits.forEach(trait => {
      if (trait.proficiency_choices) {
        const pc = trait.proficiency_choices;
        if (pc.from && pc.from.length > 0 && pc.from[0].startsWith('Skill: ')) {
          choiceCount += pc.choose || 0;
          pc.from.forEach(s => {
            const skillName = s.replace('Skill: ', '').trim();
            if (skillName && !skills.includes(skillName)) {
              skills.push(skillName);
            }
          });
        }
        return;
      }
      if (trait.description) {
        const match = trait.description.match(/proficiency in the ([A-Z][a-z]+(?:,|[,\s]and[,\s]|[,\s]or[,\s]|,?)[A-Za-z,\s]+?)\s*skill/i);
        if (match) {
          const skillsStr = match[1]
            .replace(/\s+and\s+/g, ',')
            .replace(/\s+or\s+/g, ',')
            .replace(/,\s*,/g, ',')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          skillsStr.forEach(s => {
            if (!skills.includes(s)) {
              skills.push(s);
            }
          });
        }
      }
    });
    return { count: choiceCount > 0 ? choiceCount : skills.length, skills, isChoice: choiceCount > 0 };
  }

  const skillField = data.skill_proficiencies || data.skill_proficiency_choices;
  if (!skillField) {
    return { count: 0, skills: [], isChoice: false };
  }

  // Check if it's a "Choose X from..." or "Choose X:" format
  const chooseMatch = skillField.match(/Choose\s+(\d+)/i);
  if (chooseMatch) {
    const count = parseInt(chooseMatch[1], 10);
    
    // Extract the list of available skills - try "from" first, then ":"
    const fromMatch = skillField.match(/(?:from|:)\s*(.+)$/i);
    if (fromMatch) {
      const skillsString = fromMatch[1];
      // Parse skills, handling "or" before the last skill (with or without comma)
      const skills = skillsString
         .replace(/\s+or\s+/g, ',')
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
     .replace(/\s+or\s+/g, ',')
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
export async function getSkillLimits(formData, allFeats) {
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const raceName = formData.race?.name || '';
  const backgroundName = formData.background || '';

  let fromClass = { count: 0, skills: [], isChoice: true };
  let fromRace = { count: 0, skills: [], isChoice: false };
  let fromBackground = { count: 0, skills: [], isChoice: false };

  const allSkillProfFeats = await findAllSkillProfFeats(formData, allFeats);
  if (allSkillProfFeats.length > 0) {
    const skilledUsesAvailable = await countSkilledUses(formData, allFeats);
    // With Boon of Skill, all skills are covered, so skilled usage only comes from tools
    const skilledToolUsage = await computeSkilledToolUsageOnly(formData);
    return {
      allowed: ALL_SKILL_NAMES.length + skilledUsesAvailable,
      fromClass: { count: 0, skills: [], isChoice: true },
      fromRace: { count: 0, skills: [], isChoice: false },
      fromBackground: { count: 0, skills: [], isChoice: false },
      details: 'Boon of Skill grants proficiency in all skills',
      allSkillsGranted: true,
      skilledUsesAvailable,
      skilledUsesUsed: skilledToolUsage,
    };
  }

  if (ruleset === '2024') {
    // 2024 rules: Class gives choice, Race gives choice(s) via traits, Background gives specific skills
    if (className) {
      const classData = await fetchClassData(className, '2024');
      fromClass = parseSkillProficiencies(classData, '2024');
    }

    if (raceName) {
      const raceData = await fetchRaceData(raceName, '2024');
      fromRace = parseSkillProficiencies(raceData, '2024');
    }

    if (backgroundName) {
      const backgroundData = await fetchBackgroundData(backgroundName, '2024');
      fromBackground = parseSkillProficiencies(backgroundData, '2024');
    }

    const totalAllowed = fromClass.count + fromRace.count + fromBackground.count;
    const featProfs = await countFeatProficiencyChoices(formData, allFeats);
    const finalTotal = totalAllowed + featProfs;

    // Build skillChoiceSources array with restricted pools
    const skillChoiceSources = [];
    const raceChoiceSources = [];
    // Background skills (non-choice) are always allowed
    if (fromBackground.skills.length > 0 && !fromBackground.isChoice) {
      skillChoiceSources.push({
        source: 'background',
        count: fromBackground.count,
        skills: fromBackground.skills,
      });
    }
    if (fromClass.isChoice && fromClass.skills.length > 0) {
      skillChoiceSources.push({
        source: 'class',
        count: fromClass.count,
        skills: fromClass.skills,
      });
    }
    if (fromRace.isChoice && fromRace.count > 0) {
      // Race with "from" format has skills populated
      if (fromRace.skills.length > 0) {
        skillChoiceSources.push({
          source: 'race',
          count: fromRace.count,
          skills: fromRace.skills,
        });
      } else {
        // Race with proficiency_choices in traits (e.g., Human Skillful)
        const raceSources = await getRaceProficiencyChoiceSources(formData);
        skillChoiceSources.push(...raceSources);
        raceChoiceSources.push(...raceSources);
      }
    }
    // Race origin feats (e.g., Human Versatile -> Keen Mind)
    const raceFeatSources = await getRaceFeatProficiencyChoiceSources(formData, allFeats);
    skillChoiceSources.push(...raceFeatSources);
    // Character feats with restricted skill lists
    const featChoiceData = await getFeatProficiencyChoiceData(formData, allFeats);
    featChoiceData.skillLists.forEach(sl => {
      skillChoiceSources.push({
        source: 'feat',
        count: 1,
        skills: sl.skills,
        featName: sl.featName,
      });
    });

    // Skill Expert grants 1 skill proficiency of your choice (all 18 skills)
    const skillExpertCount = await countSkillExpertProficiencyChoices(formData, allFeats);
    if (skillExpertCount > 0) {
      skillChoiceSources.push({
        source: 'feat',
        count: skillExpertCount,
        skills: ALL_SKILL_NAMES,
        featName: 'Skill Expert',
      });
    }

    // Count Skilled uses
    const skilledUsesAvailable = await countSkilledUses(formData, allFeats);

    // Build details string
    let details = `You get ${fromClass.count} skill choice(s)${fromClass.skills.length > 0 ? ' from ' + fromClass.skills.join(', ') : ''}, ${fromRace.count} from your race, and ${fromBackground.count} from your background (${totalAllowed} total)`;
    if (raceChoiceSources.length > 0 || raceFeatSources.length > 0 || featChoiceData.skillLists.length > 0) {
      const allSources = [...raceChoiceSources, ...raceFeatSources, ...featChoiceData.skillLists.map(sl => ({ featName: sl.featName, skills: sl.skills }))];
      const featDetails = allSources.map(s => {
        const label = s.featName ? s.featName : (s.source === 'race' ? 'Race trait' : 'Feat');
        return `${label}: choose 1 from ${s.skills.join(', ')}`;
      }).join('. ');
      if (featDetails) {
        details += `. + ${featProfs} from feats/traits: ${featDetails}`;
      }
    }

    // Compute total Skilled usage (skills + tools not covered by restrictive sources)
    const skilledUsesUsed = await computeTotalSkilledUsage(formData, skillChoiceSources);

    return {
      allowed: finalTotal + skilledUsesAvailable,
      fromClass,
      fromRace,
      fromBackground,
      skillChoiceSources,
      skilledUsesAvailable,
      skilledUsesUsed,
      details
     };
   }

    // 5e rules: Class gives choice, Race gives automatic or choice, Background gives 2 skills
    if (className) {
      const classData = await fetchClassData(className, '5e');
      fromClass = parseSkillProficiencies(classData, '5e');
    }

    if (raceName) {
      const raceData = await fetchRaceData(raceName, '5e');
      fromRace = parseSkillProficiencies(raceData, '5e');
    }

    // 5e backgrounds typically give 2 skills but data structure may differ
    // Load from rules-validation.json for background language count
    const backgroundLangCount = 2; // Default for 5e
    fromBackground = { count: backgroundLangCount, skills: [], isChoice: true };

    const totalAllowed = fromClass.count + fromRace.count + fromBackground.count;
    const featProfs = await countFeatProficiencyChoices(formData, allFeats);
    const finalTotal = totalAllowed + featProfs;

    // Build skillChoiceSources array with restricted pools
    const skillChoiceSources = [];
    if (fromClass.isChoice && fromClass.skills.length > 0) {
      skillChoiceSources.push({
        source: 'class',
        count: fromClass.count,
        skills: fromClass.skills,
      });
    }
    if (fromRace.isChoice && fromRace.skills.length > 0) {
      skillChoiceSources.push({
        source: 'race',
        count: fromRace.count,
        skills: fromRace.skills,
      });
    }
    // Character feats with restricted skill lists
    const featChoiceData = await getFeatProficiencyChoiceData(formData, allFeats);
    featChoiceData.skillLists.forEach(sl => {
      skillChoiceSources.push({
        source: 'feat',
        count: 1,
        skills: sl.skills,
        featName: sl.featName,
      });
    });

    // Skill Expert grants 1 skill proficiency of your choice (all 18 skills)
    const skillExpertCount = await countSkillExpertProficiencyChoices(formData, allFeats);
    if (skillExpertCount > 0) {
      skillChoiceSources.push({
        source: 'feat',
        count: skillExpertCount,
        skills: ALL_SKILL_NAMES,
        featName: 'Skill Expert',
      });
    }

    // Count Skilled uses
    const skilledUsesAvailable = await countSkilledUses(formData, allFeats);

    // Compute total Skilled usage (skills + tools not covered by restrictive sources)
    const skilledUsesUsed = await computeTotalSkilledUsage(formData, skillChoiceSources);

    let details = `In 5e rules, you get ${fromClass.count} skill choice(s)${fromClass.skills.length > 0 ? ' from ' + fromClass.skills.join(', ') : ''}, ${fromRace.count} from your race, and ${fromBackground.count} from your background (${totalAllowed} total)`;
    if (featChoiceData.skillLists.length > 0) {
      const featDetails = featChoiceData.skillLists.map(sl => `${sl.featName}: choose 1 from ${sl.skills.join(', ')}`).join('. ');
      if (featDetails) {
        details += `. + ${featProfs} from feats: ${featDetails}`;
      }
    }

    return {
      allowed: finalTotal + skilledUsesAvailable,
      fromClass,
      fromRace,
      fromBackground,
      skillChoiceSources,
      skilledUsesAvailable,
      skilledUsesUsed,
      details
     };
   }

/**
 * Determines which skills are pre-selected (automatically granted) from race/class/background
 * @param {object} formData - The character form data
 * @returns {Promise<string[]>} - Array of skill names that are automatically granted
 */
export async function getPreSelectedSkills(formData, allFeats) {
  const ruleset = formData.rules || '5e';
  const preSelected = new Set();

  const allSkillProfFeats = await findAllSkillProfFeats(formData, allFeats);
  if (allSkillProfFeats.length > 0) {
    return ALL_SKILL_NAMES;
  }

  // Race skills (automatic, not choices)
  if (formData.race?.name) {
    const raceData = await fetchRaceData(formData.race.name, ruleset);
    const raceSkills = parseSkillProficiencies(raceData, ruleset);
    if (!raceSkills.isChoice) {
      raceSkills.skills.forEach(skill => preSelected.add(skill));
  }
   }

  // Background skills (automatic, not choices)
  if (formData.background) {
    if (ruleset === '2024') {
      const backgroundData = await fetchBackgroundData(formData.background, '2024');
      const bgSkills = parseSkillProficiencies(backgroundData, '2024');
      if (!bgSkills.isChoice) {
        bgSkills.skills.forEach(skill => preSelected.add(skill));
  }
     }
     // 5e backgrounds typically let you choose, so no pre-selection
   }

  // Class skills that are automatic (not choices)
  if (formData.class?.name) {
    const classData = await fetchClassData(formData.class.name, ruleset);
    const classSkills = parseSkillProficiencies(classData, ruleset);
    if (!classSkills.isChoice) {
      classSkills.skills.forEach(skill => preSelected.add(skill));
  }
   }

  return Array.from(preSelected);
}

/**
 * Determines if expertise is allowed and how many expertise slots are available
 * Reads from class JSON data instead of hardcoded rules
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { allowed: boolean, count: number, details: string }
 */
export async function getExpertiseLimits(formData, allFeats) {
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const level = formData.level || 1;

  if (!className) {
    const featSlots = await countFeatExpertiseSlots(formData, allFeats);
    const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);
    if (featSlots > 0) {
      let details = `Feats grant ${featSlots} expertise slot(s)`;
      if (featExpertiseSkillLists) {
        const featDetails = formData.feats
          .map(featName => {
            const feat = (allFeats && allFeats.length > 0)
              ? allFeats.find(f => f.name === featName || f.index === featName.toLowerCase())
              : null;
            if (!feat || !feat.benefits) return null;
            const loreBenefit = feat.benefits.find(b =>
              b.type === 'proficiency' &&
              b.description &&
              b.description.includes('Expertise') &&
              /(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i.test(b.description)
            );
            if (!loreBenefit) return null;
            const listMatch = loreBenefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
            if (!listMatch) return null;
            const skillList = listMatch[1]
              .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
              .map(s => s.trim())
              .filter(s => s.length > 0);
            return `${featName}: choose 1 from ${skillList.join(', ')} (proficiency or expertise)`;
          })
          .filter(Boolean)
          .join('. ');
        if (featDetails) {
          details += `. ${featDetails}`;
        }
      }
      return {
        allowed: true,
        count: featSlots,
        classCount: 0,
        featCount: featSlots,
        featExpertiseSkillLists,
        details,
      };
    }
    return {
      allowed: false,
      count: 0,
      classCount: 0,
      featCount: 0,
      featExpertiseSkillLists: null,
      details: 'No class selected'
     };
   }

   // Load class data from JSON
   const classData = await fetchClassData(className, ruleset);
   if (!classData || !classData.class_levels) {
     const featSlots = await countFeatExpertiseSlots(formData, allFeats);
     const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);
     if (featSlots > 0) {
       let details = `Feats grant ${featSlots} expertise slot(s)`;
       if (featExpertiseSkillLists) {
         const featDetails = formData.feats
           .map(featName => {
             const feat = (allFeats && allFeats.length > 0)
               ? allFeats.find(f => f.name === featName || f.index === featName.toLowerCase())
               : null;
             if (!feat || !feat.benefits) return null;
             const loreBenefit = feat.benefits.find(b =>
               b.type === 'proficiency' &&
               b.description &&
               b.description.includes('Expertise') &&
               /(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i.test(b.description)
             );
             if (!loreBenefit) return null;
             const listMatch = loreBenefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
             if (!listMatch) return null;
             const skillList = listMatch[1]
               .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
               .map(s => s.trim())
               .filter(s => s.length > 0);
             return `${featName}: choose 1 from ${skillList.join(', ')} (proficiency or expertise)`;
           })
           .filter(Boolean)
           .join('. ');
         if (featDetails) {
           details += `. ${featDetails}`;
         }
       }
       return {
         allowed: true,
         count: featSlots,
         classCount: 0,
         featCount: featSlots,
         featExpertiseSkillLists,
         details,
       };
     }
     return {
       allowed: false,
       count: 0,
       classCount: 0,
       featCount: 0,
       featExpertiseSkillLists: null,
       details: `Expertise is not available for ${className}`
      };
    }

    // Search through class levels for expertise features
   let totalCount = 0;
   for (const classLevel of classData.class_levels) {
     if (classLevel.level > level) {
       break;
      }
     
     // Check features in this level
    const features = classLevel.features || [];
    for (const feature of features) {
       // Check for expertise in feature_specific
       if (feature.feature_specific?.expertise) {
         totalCount += feature.feature_specific.expertise.count || 0;
        }
         // Also check if the feature name contains "Expertise"
        else if (feature.name && feature.name.includes('Expertise')) {
           // Parse the description for count
          const match = feature.description?.match(/choose\s+(\d+)/i);
          if (match) {
            totalCount += parseInt(match[1], 10);
           } else {
            // Default to 2 if not specified
            totalCount += 2;
           }
         }
         // Check for Scholar feature (Wizard 2024) which grants 1 expertise
        else if (feature.name === 'Scholar' && feature.description?.includes('Expertise')) {
          totalCount += 1;
         }
         // Also check feature descriptions for expertise grants (e.g., Ranger "Deft Explorer")
        else if (feature.description?.match(/\bexpertise\b/i)) {
           // Check for "choose X" pattern
          const chooseMatch = feature.description.match(/choose\s+(\d+)/i);
          if (chooseMatch) {
            totalCount += parseInt(chooseMatch[1], 10);
           }
           // Check for "gain expertise" pattern (1 expertise)
          else if (feature.description.match(/\bgain\s+expertise\b/i)) {
            totalCount += 1;
           }
           // Default to 1 if description mentions expertise but no count
           else {
            totalCount += 1;
           }
         }
      }
   }

    // Also check subclass/majors features for 2024
   if (ruleset === '2024' && classData.majors) {
     const subclass = formData.class?.subclass?.name;
     if (subclass) {
       const subclassData = classData.majors.find(m => m.name === subclass);
       if (subclassData?.features) {
         for (const feature of subclassData.features) {
           if (feature.level <= level) {
             if (feature.name?.includes('Expertise')) {
               const match = feature.description?.match(/choose\s+(\d+)/i);
               if (match) {
                 totalCount += parseInt(match[1], 10);
                }
              } else if (feature.name === 'Scholar' && feature.description?.includes('Expertise')) {
               totalCount += 1;
              }
              // Also check feature descriptions for expertise grants
              else if (feature.description?.match(/\bexpertise\b/i)) {
                const chooseMatch = feature.description.match(/choose\s+(\d+)/i);
                if (chooseMatch) {
                  totalCount += parseInt(chooseMatch[1], 10);
                 }
                else if (feature.description.match(/\bgain\s+expertise\b/i)) {
                  totalCount += 1;
                 }
                else {
                  totalCount += 1;
                 }
              }
            }
          }
        }
      }
    }

    // For 5e, also check subclasses
   if (ruleset === '5e' && classData.subclasses) {
     const subclass = formData.class?.subclass?.name;
     if (subclass) {
       const subclassData = classData.subclasses.find(s => s.name === subclass);
       if (subclassData?.class_levels) {
         for (const classLevel of subclassData.class_levels) {
           if (classLevel.level <= level) {
             const features = classLevel.features || [];
             for (const feature of features) {
               if (feature.name?.includes('Expertise')) {
                 const match = feature.description?.match(/choose\s+(\d+)/i);
                 if (match) {
                   totalCount += parseInt(match[1], 10);
                  }
                } else if (feature.name === 'Scholar' && feature.description?.includes('Expertise')) {
                 totalCount += 1;
                }
                // Also check feature descriptions for expertise grants
                else if (feature.description?.match(/\bexpertise\b/i)) {
                  const chooseMatch = feature.description.match(/choose\s+(\d+)/i);
                  if (chooseMatch) {
                    totalCount += parseInt(chooseMatch[1], 10);
                   }
                  else if (feature.description.match(/\bgain\s+expertise\b/i)) {
                    totalCount += 1;
                   }
                  else {
                    totalCount += 1;
                   }
                }
              }
            }
          }
       }
     }
    }

    const featSlots = await countFeatExpertiseSlots(formData, allFeats);
    const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);

    // Build details string with feat-specific skill lists
    let details = `${className} can have expertise in ${totalCount} skill(s) at level ${level}`;
    if (featSlots > 0) {
      details += ` + ${featSlots} from feats`;
    }
    if (featExpertiseSkillLists) {
      const featDetails = formData.feats
        .map(featName => {
          const feat = (allFeats && allFeats.length > 0)
            ? allFeats.find(f => f.name === featName || f.index === featName.toLowerCase())
            : null;
          if (!feat || !feat.benefits) return null;
          const loreBenefit = feat.benefits.find(b =>
            b.type === 'proficiency' &&
            b.description &&
            b.description.includes('Expertise') &&
            /(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i.test(b.description)
          );
          if (!loreBenefit) return null;
          const listMatch = loreBenefit.description.match(/(?:Choose one of the following skills:\s*|Choose one skill:\s*)(.+?)\.\s*(?:If|You|This|When)/i);
          if (!listMatch) return null;
          const skillList = listMatch[1]
            .split(/,\s*|,\s*(?:and\s+|\bor\s+)|(?:and\s+|\bor\s+)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
          return `${featName}: choose 1 from ${skillList.join(', ')} (proficiency or expertise)`;
        })
        .filter(Boolean)
        .join('. ');
      if (featDetails) {
        details += `. ${featDetails}`;
      }
    }

    return {
      allowed: totalCount > 0 || featSlots > 0,
      count: totalCount + featSlots,
      classCount: totalCount,
      featCount: featSlots,
      featExpertiseSkillLists: featExpertiseSkillLists,
      details
     };
}

/**
 * Validates skill selections and returns warnings (not blocking errors)
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - Array of warning objects { message: string, type: 'warning'|'info' }
 */
export async function validateSkills(formData, allFeats) {
  const warnings = [];
  const selectedSkills = formData.skillProficiencies || [];
  const expertSkills = formData.expertSkills || [];
  const _ruleset = formData.rules || '5e';
  void _ruleset;

  // Get skill limits
  const limits = await getSkillLimits(formData, allFeats);
  const expertiseLimits = await getExpertiseLimits(formData, allFeats);

  // Validate skill selections against allowed pools
  if (limits.skillChoiceSources && limits.skillChoiceSources.length > 0) {
    // Build a map of which sources each skill belongs to
    const skillSourceMap = new Map();
    limits.skillChoiceSources.forEach(source => {
      source.skills.forEach(skill => {
        if (!skillSourceMap.has(skill)) {
          skillSourceMap.set(skill, []);
        }
        skillSourceMap.get(skill).push(source);
      });
    });

    // Check each selected skill belongs to at least one allowed pool
    // Skills outside pools are OK if Skilled can cover them
    const skilledUsesForOutsideCheck = limits.skilledUsesAvailable || 0;
    const skillsOutsidePools = selectedSkills.filter(skill => {
      const sources = skillSourceMap.get(skill);
      return !sources || sources.length === 0;
    });
    if (skillsOutsidePools.length > skilledUsesForOutsideCheck) {
      const excess = skillsOutsidePools.length - skilledUsesForOutsideCheck;
      const outsideMsg = skillsOutsidePools.length === excess
        ? `The following skills are not available from your class/race/feat choices: ${skillsOutsidePools.join(', ')}. Only select from allowed skill pools.`
        : `The following skills are not available from your class/race/feat choices and exceed Skilled uses: ${skillsOutsidePools.join(', ')}.`;
      warnings.push({
        message: outsideMsg,
        type: 'warning'
      });
    }

    // Count how many selected skills come from each source
    // For overlapping skills, assign them to the source that needs them most
    const sourceCounts = {};
    limits.skillChoiceSources.forEach(source => {
      sourceCounts[source.source + '_' + (source.featName || '0')] = {
        source: source,
        count: 0,
      };
    });

    // Track which selected skills have been assigned
    const assignedSkills = new Set();

    // First pass: assign skills that only belong to one source
    limits.skillChoiceSources.forEach(source => {
      const key = source.source + '_' + (source.featName || '0');
      const sourceSkillSet = new Set(source.skills);
      selectedSkills.forEach(skill => {
        if (assignedSkills.has(skill)) return;
        const sourcesForSkill = skillSourceMap.get(skill) || [];
        const isOnlySource = sourcesForSkill.length === 1 && sourcesForSkill[0].source === source.source && sourcesForSkill[0].featName === source.featName;
        if (sourceSkillSet.has(skill) && isOnlySource) {
          sourceCounts[key].count++;
          assignedSkills.add(skill);
        }
      });
    });

    // Second pass: assign remaining skills to any source that contains them
    selectedSkills.forEach(skill => {
      if (assignedSkills.has(skill)) return;
      const sourcesForSkill = skillSourceMap.get(skill) || [];
      sourcesForSkill.forEach(source => {
        const key = source.source + '_' + (source.featName || '0');
        if (sourceCounts[key] && sourceCounts[key].count < source.count) {
          sourceCounts[key].count++;
          assignedSkills.add(skill);
        }
      });
    });

    // Calculate how many skills are covered by Skilled
    const skilledUsesAvailable = limits.skilledUsesAvailable || 0;
    const unassignedCount = selectedSkills.length - assignedSkills.size;
    let skilledCanCover = Math.min(unassignedCount, skilledUsesAvailable);

    // Check for over-selection from any source, but allow Skilled to cover overflow
    const overSelectionWarnings = [];
    Object.values(sourceCounts).forEach(({ source, count }) => {
      if (count > source.count) {
        const excess = count - source.count;
        if (skilledCanCover >= excess) {
          skilledCanCover -= excess;
        } else {
          const label = source.featName || source.source;
          overSelectionWarnings.push(`Too many from ${label}: ${count} selected, only ${source.count} allowed`);
        }
      }
    });
    if (overSelectionWarnings.length > 0) {
      warnings.push({
        message: overSelectionWarnings.join('. '),
        type: 'warning'
      });
    }
  }

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

    // Check that feat-restricted expertise skills are from the allowed lists
    if (expertiseLimits?.featExpertiseSkillLists) {
      const allFeatSkills = new Set(expertiseLimits.featExpertiseSkillLists.flat().map(s => s.trim()));
      const featExpertSkills = expertSkills.filter(skill => allFeatSkills.has(skill));
      const classExpertSkills = expertSkills.filter(skill => !allFeatSkills.has(skill));
      const featSlotsUsed = Math.min(featExpertSkills.length, expertiseLimits.featCount || 0);
      const classSlotsUsed = classExpertSkills.length;
      const totalExpertiseUsed = featSlotsUsed + classSlotsUsed;
      if (totalExpertiseUsed > expertiseLimits.count) {
        warnings.push({
          message: `You have selected ${expertSkills.length} skill(s) for expertise but only have ${expertiseLimits.count} slot(s) available. (${expertiseLimits.details})`,
          type: 'warning'
         });
       }
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
    const classSkills = parseSkillProficiencies(classData, ruleset);
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
    const raceSkills = parseSkillProficiencies(raceData, ruleset);
    if (raceSkills.skills.includes(skillName)) {
      sources.push('Race');
      if (!raceSkills.isChoice) {
        isPreSelected = true;
       }
     }
   }

   // Check if skill comes from background (2024 only)
  if (formData.background && ruleset === '2024') {
    const backgroundData = await fetchBackgroundData(formData.background, '2024');
    const bgSkills = parseSkillProficiencies(backgroundData, '2024');
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

