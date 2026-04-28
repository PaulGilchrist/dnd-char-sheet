"src/services/languages-fightingstyles-validation.js"
/**
 * Languages and Fighting Styles validation service for character creation wizard
 * Provides non-blocking warnings about language and fighting style selections
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
              const response = await fetch(path);
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
              const response = await fetch(path);
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
              const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load 2024 backgrounds.json from ${fullPath}`);
           }
        const data = await response.json();
        backgroundDataCache['2024'] = data;
        return data;
       } catch (error) {
        console.error('Error loading 2024 backgrounds.json:', error);
        return [];
       }
   }

/**
 * Fetches feat data from JSON files (with caching) - for fighting style feats
 * @param {string} version - '5e' or '2024'
 * @returns {Promise<object[]>} - Array of feat data
 */
async function loadFeatData(version = '5e') {
    try {
        const path = version === '2024' ? 'data/2024/feats.json' : 'data/feats.json';
      
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${version} feats.json from ${fullPath}`);
           }
        return await response.json();
       } catch (error) {
        console.error(`Error loading ${version} feats.json:`, error);
        return [];
       }
   }

/**
 * Gets the class data for a specific class name
 * @param {string} className - The name of the class
 * @param {string} version - '5e' or '2024'
 * @returns {Promise<object|null>} - The class data or null
 */
async function getClassByName(className, version = '5e') {
    if (!className) return null;
    const classes = await loadClassData(version);
    return classes.find(c => c.name === className || c.index === className.toLowerCase()) || null;
   }

/**
 * Gets the race data for a specific race name
 * @param {string} raceName - The name of the race
 * @param {string} version - '5e' or '2024'
 * @returns {Promise<object|null>} - The race data or null
 */
async function getRaceByName(raceName, version = '5e') {
    if (!raceName) return null;
    const races = await loadRaceData(version);
    return races.find(r => r.name === raceName || r.index === raceName.toLowerCase()) || null;
   }

async function getSubraceByName(subraceName, version = '5e') {
    if (!subraceName) return null;
    const races = await loadRaceData(version);
      
    // For 2024, subraces are nested under the parent race
    if (version === '2024') {
        for (const race of races) {
            if (race.subraces) {
                const subrace = race.subraces.find(s => s.name === subraceName);
                if (subrace) return subrace;
                }
            }
        return null;
        }
      
    // For 5e, subraces are top-level entries
    return races.find(r => r.name === subraceName || r.index === subraceName.toLowerCase()) || null;
    }

/**
 * Gets the background data for a specific background name (2024 only)
 * @param {string} backgroundName - The name of the background
 * @returns {Promise<object|null>} - The background data or null
 */
async function getBackgroundByName(backgroundName) {
    if (!backgroundName) return null;
    const backgrounds = await loadBackgroundData();
    return backgrounds.find(b => b.name === backgroundName || b.index === backgroundName.toLowerCase()) || null;
   }

/**
 * Determines fighting styles allowed based on class features
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { allowed: number, preSelected: string[], details: string }
 */
export async function getFightingStyleLimits(formData) {
    const ruleset = formData.rules || '5e';
    const className = formData.class?.name || '';
    const level = formData.level || 1;
    const subclass = formData.class?.subclass?.name || '';
    
    const classData = await getClassByName(className, ruleset);
    
    let allowed = 0;
    let preSelected = [];
    let details = '';
    
    if (ruleset === '2024') {
         // 2024 rules: Fighting styles can be chosen as feats
          // Check if class grants fighting style from class_levels
        if (classData && classData.class_levels) {
            for (const classLevel of classData.class_levels) {
                if (classLevel.level <= level && classLevel.features) {
                    const fightingStyleFeature = classLevel.features.find(f =>
                        f.name === 'Fighting Style'
                );
            if (fightingStyleFeature) {
                allowed += 1;
                }
          
                     // Check for additional fighting styles at higher levels in class_levels
                    const additionalFeatures = classLevel.features.filter(f =>
                        f.name.includes('Fighting Style') && f.name !== 'Fighting Style'
            );
        allowed += additionalFeatures.length;
        }
             }
         }
  
          // Also check top-level class features (in case some classes have them)
        if (classData && classData.features) {
            const fightingStyleFeature = classData.features.find(f =>
                f.name === 'Fighting Style' && f.level <= level
            );
            if (fightingStyleFeature) {
                allowed += 1;
           }

            const additionalFeatures = classData.features.filter(f =>
                                f.name.includes('Fighting Style') && f.name !== 'Fighting Style' && f.level <= level
                              );
            allowed += additionalFeatures.length;
                         }

          // Check subclass/major features for additional fighting styles
        if (classData && subclass) {
            const majors = classData.majors || classData.subclasses || [];
            const subclassData = majors.find(s => s.name === subclass);
            if (subclassData && subclassData.features) {
                const subclassAdditionalFeatures = subclassData.features.filter(f =>
                    f.name.includes('Fighting Style') && f.level <= level
            );
                allowed += subclassAdditionalFeatures.length;
             }
         }
      
          // Check for fighting style feats already selected
        const selectedFeats = formData.feats || [];
        if (selectedFeats.length > 0) {
            const feats = await loadFeatData(ruleset);
            const fightingStyleFeats = feats.filter(f =>
                f.prerequisites && f.prerequisites.feature === 'Fighting Style'
              );

            selectedFeats.forEach(featName => {
                const feat = fightingStyleFeats.find(f => f.name === featName);
                if (feat && !preSelected.includes(featName)) {
                    preSelected.push(featName);
                 }
             });
         }
  
        details = `In 2024 rules, ${className}${className ? ' ' : ''}characters may get fighting styles from class features or feats.`;
            } else {
         // 5e rules
        switch (className) {
                    case 'Fighter':
                        allowed = 1;
                 // Check subclass features for additional fighting styles
                if (subclass && classData) {
                    const subclasses = classData.subclasses || [];
                    const subclassData = subclasses.find(s => s.name === subclass);
                    if (subclassData) {
                         // Check class_levels for Additional Fighting Style feature
                        if (subclassData.class_levels) {
                            for (const classLevel of subclassData.class_levels) {
                                if (classLevel.level <= level) {
                                    const additionalStyleFeature = classLevel.features?.find(f =>
                                        f.name === 'Additional Fighting Style'
                                      );
                                    if (additionalStyleFeature) {
                allowed += 1;
            }
                                  }
                              }
                          }
                          // Also check top-level subclass features
                        if (subclassData.features) {
                            const subclassAdditionalFeatures = subclassData.features.filter(f =>
                                f.name.includes('Fighting Style') && f.name !== 'Fighting Style' && f.level <= level
                              );
                            allowed += subclassAdditionalFeatures.length;
                 }
                      }
                  }
                details = `Fighters get 1 Fighting Style at level 1. ${subclass ? `${subclass} ` : ''}may grant additional styles at higher levels.`;
                    break;
            case 'Paladin':
                if (level >= 2) {
                    allowed = 1;
               }
                details = `Paladins get 1 Fighting Style at level 2.`;
                break;
            case 'Ranger':
                if (level >= 2) {
                    allowed = 1;
                  }
                details = `Rangers get 1 Fighting Style at level 2.`;
                break;
            default:
                details = `Fighting styles are typically reserved for Fighters, Paladins, and Rangers in 5e rules.`;
                break;
            }
      }

    return { allowed, preSelected, details };
   }

/**
 * Determines languages allowed based on race, class, and background
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - { allowed: number, preSelected: string[], details: string }
 */
export async function getLanguageLimits(formData) {
    const ruleset = formData.rules || '5e';
    const className = formData.class?.name || '';
    const raceName = formData.race?.name || '';
    const subraceName = formData.race?.subrace?.name || '';
    const backgroundName = formData.background || '';
    const level = formData.level || 1;
    
    let allowed = 0;
    let preSelected = [];
    let details = '';
    
    if (ruleset === '2024') {
        // 2024 rules: Languages come from race, class, and background
        const raceData = await getRaceByName(raceName, '2024');
        const classData = await getClassByName(className, '2024');
        const backgroundData = await getBackgroundByName(backgroundName);
        // Race languages
        if (raceData) {
            const raceLangs = raceData.languages || [];
            preSelected.push(...raceLangs);
            allowed += raceLangs.length;
            }

         // Class languages
        if (classData) {
            const classLangs = classData.languages || [];
            preSelected.push(...classLangs);
            allowed += classLangs.length;
            }

         // Background languages (2024: typically 2)
        if (backgroundData) {
            const bgLangs = backgroundData.languages || [];
            preSelected.push(...bgLangs);
            allowed += bgLangs.length;
             } else {
              // Default background languages for 2024
            allowed += 2;
            }

        details = `In 2024 rules, languages come from your race, class, and background.`;
         } else {
          // 5e rules
        const raceData = await getRaceByName(raceName, '5e');

         // Race languages
        if (raceData) {
            const raceLangs = raceData.languages || [];
            preSelected.push(...raceLangs);
            allowed += raceLangs.length;
            }

         // Racial language bonuses
        switch (raceName) {
            case 'Half-Elf':
            case 'Human':
                allowed += 1;
                break;
            }

         // Subrace languages
  if (subraceName) {
           const subraceData = await getSubraceByName(subraceName, ruleset);
            if (subraceData && subraceData.languages) {
                const subraceLangs = subraceData.languages || [];
                preSelected.push(...subraceLangs);
                  // Don't add to allowed count if already counted in race
                 }

            switch (subraceName) {
                case 'High Elf':
                    allowed += 1;
                    break;
            }
             }

         // Class languages
        switch (className) {
            case 'Druid':
                preSelected.push('Druidic');
                allowed += 1;
                break;
            case 'Ranger':
                allowed += 1;
                if (level > 5) allowed += 1;
                if (level > 13) allowed += 1;
                break;
            case 'Rogue':
                preSelected.push("Thieves' Cant");
                allowed += 1;
                break;
            }

         // Background languages (5e: typically 2 from backstory)
        allowed += 2;
        
        details = `In 5e rules, languages come from your race, class, and background (2 additional from backstory).`;
        }

     // Remove duplicates from preSelected
    preSelected = [...new Set(preSelected)];
    
    return { allowed, preSelected, details };
   }

/**
 * Validates language and fighting style selections and returns warnings
 * @param {object} formData - The character form data
 * @returns {Promise<object>} - Array of warning objects { message: string, type: 'warning'|'info' }
 */
export async function validateLanguagesAndFightingStyles(formData) {
    const warnings = [];
    const selectedLanguages = formData.languages || [];
    const selectedFightingStyles = formData.class?.fightingStyles || [];
    
    try {
        // Validate languages
        const langLimits = await getLanguageLimits(formData);
        
        if (selectedLanguages.length > langLimits.allowed) {
            warnings.push({
                message: `Rules allow ${langLimits.allowed} language(s). You have selected ${selectedLanguages.length}. (${langLimits.details})`,
                type: 'warning'
               });
           }
        
        if (selectedLanguages.length === 0 && langLimits.preSelected.length > 0) {
            warnings.push({
                message: `Your race, class, and background grant you these languages: ${langLimits.preSelected.join(', ')}. Consider selecting them.`,
                type: 'info'
               });
           }
        
        // Validate fighting styles
        const styleLimits = await getFightingStyleLimits(formData);
        
        if (selectedFightingStyles.length > styleLimits.allowed) {
            warnings.push({
                message: `Rules allow ${styleLimits.allowed} fighting style(s). You have selected ${selectedFightingStyles.length}. (${styleLimits.details})`,
                type: 'warning'
               });
           }
        
        if (selectedFightingStyles.length === 0 && styleLimits.allowed > 0) {
            warnings.push({
                message: `Your class allows ${styleLimits.allowed} fighting style(s). Consider selecting one.`,
                type: 'info'
               });
           }
        
        // Check for fighting style feats in 2024 rules
        if (formData.rules === '2024' && styleLimits.preSelected.length > 0) {
            const missingStyles = styleLimits.preSelected.filter(s => !selectedFightingStyles.includes(s));
            if (missingStyles.length > 0) {
                warnings.push({
                    message: `You have selected fighting style feats: ${missingStyles.join(', ')}. These should be pre-selected.`,
                    type: 'info'
                   });
               }
           }
        
       } catch (error) {
        console.error('Error validating languages and fighting styles:', error);
       }
    
    return warnings;
   }
   

