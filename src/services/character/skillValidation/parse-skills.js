/**
 * Parses skill proficiencies from a class/race/background data object
 * Handles both "Choose X from..." format and direct skill lists
 * @param {object} data - The class/race/background data object
 * @param {string} ruleset - The ruleset ('5e' or '2024')
 * @returns {object} - { count: number, skills: string[], isChoice: boolean }
 */
export function parseSkillProficiencies(data, ruleset = '5e') {
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
