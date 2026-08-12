import { loadFeatData } from '../../ui/dataLoader.js';

/**
 * Checks if a feat grants proficiency in all skills (e.g., Boon of Skill)
 * @param {object} feat - The feat data object
 * @returns {boolean}
 */
export function featGrantsAllSkillProficiencies(feat) {
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
export function featGrantsExpertise(feat) {
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
export async function findAllSkillProfFeats(formData, allFeats) {
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
export async function countFeatProficiencyChoices(formData, allFeats) {
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
export async function countFeatExpertiseSlots(formData, allFeats) {
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
export async function getFeatExpertiseSkillLists(formData, allFeats) {
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
export async function countSkilledUses(formData, allFeats) {
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
export async function countSkillExpertProficiencyChoices(formData, allFeats) {
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
 * Formats feat expertise skill list details for display in details strings.
 * @param {Array} featNames - Array of feat names
 * @param {Array} allFeats - Array of all feat data objects
 * @returns {string} Formatted detail string
 */
export function formatFeatExpertiseDetails(featNames, allFeats) {
  const featData = (allFeats && allFeats.length > 0) ? allFeats : [];
  return featNames
    .map(featName => {
      const feat = featData.find(f => f.name === featName || f.index === featName.toLowerCase());
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
}
