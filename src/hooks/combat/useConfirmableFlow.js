import { useState, useCallback, useRef } from 'react'
import { addEntry } from '../../services/ui/logService.js'
import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js'

const ROLLBACK_SPELLS = [
  'bane', 'bless', 'haste', 'aid', "heroes' feast", 'greater restoration', 'lesser restoration',
  'remove curse', 'mage armor', 'protection from energy', 'resistance',
  'shield of faith', 'magic missile'
];

function rollbackSpellSlot(playerName, spellName, spellLevel, playerStats, campaignName) {
  const isWarlock = playerStats.class?.name === 'Warlock';
  const isFreeCast = spellName && ROLLBACK_SPELLS.some(name => (spellName || '').toLowerCase() === name);

  if (isFreeCast) {
    return;
  }

  if (isWarlock) {
    for (let lv = spellLevel; lv <= 9; lv++) {
      const slotKey = `spell_slots_level_${lv}`;
      const current = getRuntimeValue(playerName, slotKey);
      const max = (playerStats.spellAbilities && playerStats.spellAbilities[slotKey]) || 0;
      const available = current != null ? current : max;
      if (available > 0) {
        setRuntimeValue(playerName, slotKey, available + 1, campaignName);
        return;
      }
    }
  } else {
    const baseKey = `spell_slots_level_${spellLevel}`;
    const current = getRuntimeValue(playerName, baseKey);
    const max = (playerStats.spellAbilities && playerStats.spellAbilities[baseKey]) || 0;
    const available = current != null ? current : max;
    if (available >= 0) {
      setRuntimeValue(playerName, baseKey, available + 1, campaignName);
    }
  }
}

export function useConfirmableFlow(playerStats, campaignName) {
  const [pendingOps, setPendingOps] = useState({});
  const pendingOpsRef = useRef(pendingOps);
  pendingOpsRef.current = pendingOps;

  const setPending = useCallback((type, data) => {
    setPendingOps(prev => ({ ...prev, [type]: data }));
  }, []);

  const getPending = useCallback((type) => pendingOps[type] || null, [pendingOps]);

  const createConfirmHandler = useCallback((type, applyFn, getTargets) => {
    return async (result) => {
      const pending = pendingOpsRef.current[type];
      if (!pending) return;

      setPendingOps(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });

      const targets = getTargets ? getTargets(pending, result) : null;
      addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName: targets?.[0] || null,
        targets: targets,
        spellName: pending.spellName,
        spellLevel: pending.spellLevel || 0,
        castingTime: pending.castingTime,
        timestamp: Date.now(),
      }).catch(() => {});

      if (applyFn) {
        await applyFn(pending, result);
      }
    };
  }, [playerStats, campaignName]);

  const createSkipHandler = useCallback((type, getTargets) => {
    return () => {
      const pending = pendingOpsRef.current[type];
      if (!pending) return;

      setPendingOps(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });

      const targets = getTargets ? getTargets(pending, {}) : null;
      addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName: targets?.[0] || null,
        targets: targets,
        spellName: pending.spellName,
        spellLevel: pending.spellLevel || 0,
        castingTime: pending.castingTime,
        timestamp: Date.now(),
      }).catch(() => {});

      rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);
    };
  }, [playerStats, campaignName]);

  const clearPending = useCallback((type) => {
    setPendingOps(prev => {
      if (!(type in prev)) return prev;
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }, []);

  return {
    setPending,
    getPending,
    createConfirmHandler,
    createSkipHandler,
    clearPending,
    hasPending: Object.keys(pendingOps).length > 0,
  };
}
