export function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getRollIconType(rollType) {
  switch (rollType) {
    case 'attack': return 'fa-crosshairs';
    case 'spell_attack': return 'fa-wand-magic-sparkles';
    case 'save': return 'fa-shield-halved';
    case 'condition-save': return 'fa-shield-halved';
    case 'save-ottos-dance': return 'fa-shield-halved';
    case 'save-damage': return 'fa-shield-halved';
    case 'save-banishment': return 'fa-shield-halved';
    case 'save-polymorph': return 'fa-paw';
    case 'save-animal-shapes': return 'fa-paw';
    case 'save-prismatic-spray': return 'fa-wand-magic-sparkles';
    case 'save-prismatic-spray-indigo': return 'fa-eye';
    case 'save-prismatic-spray-violet': return 'fa-door-open';
    case 'save-imprisonment': return 'fa-shield-halved';
    case 'save-confusion': return 'fa-shield-halved';
    case 'save-forcecage': return 'fa-shield-halved';
    case 'save-forcecage-escape': return 'fa-shield-halved';
    case 'save-maze': return 'fa-shield-halved';
    case 'save-maze-escape': return 'fa-shield-halved';
    case 'aoe-damage': return 'fa-wand-magic-sparkles';
    case 'initiative': return 'fa-bolt';
    case 'damage': return 'fa-skull';
    default: return 'fa-dice-d20';
   }
}
