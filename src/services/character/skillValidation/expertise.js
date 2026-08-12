import { fetchClassData } from '../../ui/dataLoader.js';
import { countFeatExpertiseSlots, getFeatExpertiseSkillLists, formatFeatExpertiseDetails } from './feat-helpers.js';

/**
 * Determines if expertise is allowed and how many expertise slots are available
 * Reads from class JSON data instead of hardcoded rules
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Promise<object>} - { allowed: boolean, count: number, details: string }
 */
export async function getExpertiseLimits(formData, allFeats) {
  const ruleset = formData.rules || '5e';
  const className = formData.class?.name || '';
  const level = formData.level || 1;

  if (!className) {
    return getExpertiseLimitsNoClass(formData, allFeats);
  }

  // Load class data from JSON
  const classData = await fetchClassData(className, ruleset);
  if (!classData || !classData.class_levels) {
    return getExpertiseLimitsNoClassData(formData, allFeats, className);
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
      totalCount += countExpertiseFromFeature(feature);
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
            totalCount += countExpertiseFromFeature(feature);
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
              totalCount += countExpertiseFromFeature(feature);
            }
          }
        }
      }
    }
  }

  return buildExpertiseResult(formData, allFeats, className, totalCount, level);
}

/**
 * Counts expertise from a single feature object
 * @param {object} feature - The feature data object
 * @returns {number} Expertise count from this feature
 */
function countExpertiseFromFeature(feature) {
  // Check for expertise in feature_specific
  if (feature.feature_specific?.expertise) {
    return feature.feature_specific.expertise.count || 0;
  }

  // Also check if the feature name contains "Expertise"
  if (feature.name && feature.name.includes('Expertise')) {
    // Parse the description for count
    const match = feature.description?.match(/choose\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Default to 2 if not specified
    return 2;
  }

  // Check for Scholar feature (Wizard 2024) which grants 1 expertise
  if (feature.name === 'Scholar' && feature.description?.includes('Expertise')) {
    return 1;
  }

  // Also check feature descriptions for expertise grants (e.g., Ranger "Deft Explorer")
  if (feature.description?.match(/\bexpertise\b/i)) {
    // Check for "choose X" pattern
    const chooseMatch = feature.description.match(/choose\s+(\d+)/i);
    if (chooseMatch) {
      return parseInt(chooseMatch[1], 10);
    }
    // Check for "gain expertise" pattern (1 expertise)
    if (feature.description.match(/\bgain\s+expertise\b/i)) {
      return 1;
    }
    // Default to 1 if description mentions expertise but no count
    return 1;
  }

  return 0;
}

/**
 * Handles expertise limits when no class is selected
 */
async function getExpertiseLimitsNoClass(formData, allFeats) {
  const featSlots = await countFeatExpertiseSlots(formData, allFeats);
  const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);
  if (featSlots > 0) {
    let details = `Feats grant ${featSlots} expertise slot(s)`;
    if (featExpertiseSkillLists) {
      const featDetails = formatFeatExpertiseDetails(formData.feats || [], allFeats);
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

/**
 * Handles expertise limits when class data has no class_levels
 */
async function getExpertiseLimitsNoClassData(formData, allFeats, className) {
  const featSlots = await countFeatExpertiseSlots(formData, allFeats);
  const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);
  if (featSlots > 0) {
    let details = `Feats grant ${featSlots} expertise slot(s)`;
    if (featExpertiseSkillLists) {
      const featDetails = formatFeatExpertiseDetails(formData.feats || [], allFeats);
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

/**
 * Builds the final expertise result object
 */
async function buildExpertiseResult(formData, allFeats, className, totalCount, level) {
  const featSlots = await countFeatExpertiseSlots(formData, allFeats);
  const featExpertiseSkillLists = await getFeatExpertiseSkillLists(formData, allFeats);

  // Build details string with feat-specific skill lists
  let details = `${className} can have expertise in ${totalCount} skill(s) at level ${level}`;
  if (featSlots > 0) {
    details += ` + ${featSlots} from feats`;
  }
  if (featExpertiseSkillLists) {
    const featDetails = formatFeatExpertiseDetails(formData.feats || [], allFeats);
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
