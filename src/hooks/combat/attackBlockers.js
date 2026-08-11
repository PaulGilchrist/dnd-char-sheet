import { isForcecageBlocked } from '../../services/automation/handlers/spells/forcecageHandler.js';
import { isMazeBlocked } from '../../services/automation/handlers/spells/mazeHandler.js';
import { isBanishmentBlocked } from '../../services/automation/handlers/spells/banishmentHandler.js';
import { isImprisonmentBlocked } from '../../services/automation/handlers/spells/imprisonmentHandler.js';
import { isPrismaticSprayBlocked } from '../../services/automation/handlers/spells/prismaticSprayHandler.js';

const BLOCKERS = [
    { check: isForcecageBlocked, name: 'Forcecage', logMsg: 'Forcecage' },
    { check: isMazeBlocked, name: 'Maze', logMsg: 'Maze' },
    { check: isBanishmentBlocked, name: 'Banishment', logMsg: 'Banishment' },
    { check: isImprisonmentBlocked, name: 'Imprisonment', logMsg: 'Imprisonment' },
    { check: isPrismaticSprayBlocked, name: 'Prismatic Spray', logMsg: 'Prismatic Spray' },
];

const BLOCK_DESCRIPTIONS = {
    Forcecage: (a, t) => `${a}'s attack on ${t} is blocked by Forcecage. No attack, spell, or effect can pass between inside and outside the prison.`,
    Maze: (a, t) => `${a}'s attack on ${t} is blocked by Maze. No attack, spell, or effect can pass between inside and outside the demiplane.`,
    Banishment: (a, t) => `${a}'s attack on ${t} is blocked by Banishment. No attack, spell, or effect can pass between inside and outside the demiplane.`,
    Imprisonment: (a, t) => `${a}'s attack on ${t} is blocked by Imprisonment. No attack, spell, or effect can pass between inside and outside the prison.`,
    'Prismatic Spray': (a, t) => `${a}'s attack on ${t} is blocked by Prismatic Spray. No attack, spell, or effect can pass between inside and outside the demiplane.`,
};

const BLOCK_LOG_MESSAGES = {
    Forcecage: (a, t) => `${a}'s attack on ${t} was blocked by Forcecage.`,
    Maze: (a, t) => `${a}'s attack on ${t} was blocked by Maze.`,
    Banishment: (a, t) => `${a}'s attack on ${t} was blocked by Banishment.`,
    Imprisonment: (a, t) => `${a}'s attack on ${t} was blocked by Imprisonment.`,
    'Prismatic Spray': (a, t) => `${a}'s attack on ${t} was blocked by Prismatic Spray.`,
};

export function checkAttackBlockers(attackerName, targetName, campaignName, setPopupHtml, addEntry) {
    for (const blocker of BLOCKERS) {
        if (blocker.check(attackerName, targetName, campaignName)) {
            const description = BLOCK_DESCRIPTIONS[blocker.name](attackerName, targetName);
            setPopupHtml({ type: 'automation_info', name: blocker.name, description });
            addEntry(campaignName, { type: 'info', text: BLOCK_LOG_MESSAGES[blocker.name](attackerName, targetName) });
            return true;
        }
    }
    return false;
}
