const CANONICAL_CASTING_TIMES = {
    'action': '1 action',
    '1 action': '1 action',
    'bonus action': '1 bonus action',
    '1 bonus action': '1 bonus action',
    'reaction': '1 reaction',
    '1 reaction': '1 reaction',
    'passive': 'passive',
};

/**
 * Normalize a casting_time string to its canonical form:
 * '1 action', '1 bonus action', '1 reaction', or 'passive'.
 * Tolerates case, underscores ('1 bonus_action'), and bare forms ('bonus action').
 * Anything else (durations, compound triggers like '1 reaction, after attack',
 * ritual variants like '1 minute or Ritual') is returned unchanged.
 */
export function normalizeCastingTime(castingTime) {
    if (typeof castingTime !== 'string') return castingTime;
    const key = castingTime.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    return CANONICAL_CASTING_TIMES[key] || castingTime;
}
