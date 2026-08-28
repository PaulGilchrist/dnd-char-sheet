import { useEffect, useState } from 'react';
import { getRuntimeValue, addStorageChangeListener } from '../runtime/useRuntimeState.js';

const SELECTION_KEY = 'BattleMasterManeuvers_selection';

export { SELECTION_KEY };

export function isBattleMaster(character) {
    return character?.class?.subclass?.name === 'Battle Master';
}

// Serial of all Battle Master maneuver selections — changes only when a selection changes
export function battleMasterSelectionSerial(characters, campaignName) {
    return (characters || [])
        .filter(isBattleMaster)
        .map(c => `${c.name}:${JSON.stringify(getRuntimeValue(c.name, SELECTION_KEY, campaignName) || [])}`)
        .join('|');
}

// Bumps a version counter whenever any Battle Master's maneuver selection changes in the runtime store
export function useBattleMasterSelectionVersion(characters, campaignName) {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (!campaignName || !characters || characters.length === 0) return undefined;
        const battleMasters = characters.filter(isBattleMaster);
        if (battleMasters.length === 0) return undefined;
        let serial = battleMasterSelectionSerial(characters, campaignName);
        const cleanups = battleMasters.map(c => addStorageChangeListener(c.name, () => {
            const nextSerial = battleMasterSelectionSerial(characters, campaignName);
            if (nextSerial !== serial) {
                serial = nextSerial;
                setVersion(v => v + 1);
            }
        }));
        return () => cleanups.forEach(fn => fn());
    }, [characters, campaignName]);
    return version;
}

export function getKnownManeuvers(characterName, campaignName) {
    const stored = getRuntimeValue(characterName, SELECTION_KEY, campaignName);
    return Array.isArray(stored) ? stored : [];
}

export function getSuperiorityDice(characterName, campaignName) {
    const usesKey = 'superiorityDice';
    const defaultMax = 4;
    return Number(getRuntimeValue(characterName, usesKey, campaignName) ?? defaultMax);
}
