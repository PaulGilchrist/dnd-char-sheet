import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeCastingTime } from './castingTimeUtils.js';

describe('normalizeCastingTime', () => {
    it('normalizes bare and underscore forms to canonical casting times', () => {
        expect(normalizeCastingTime('action')).toBe('1 action');
        expect(normalizeCastingTime('bonus action')).toBe('1 bonus action');
        expect(normalizeCastingTime('reaction')).toBe('1 reaction');
        expect(normalizeCastingTime('bonus_action')).toBe('1 bonus action');
        expect(normalizeCastingTime('1 bonus_action')).toBe('1 bonus action');
        expect(normalizeCastingTime('Bonus Action')).toBe('1 bonus action');
        expect(normalizeCastingTime('  1 ACTION  ')).toBe('1 action');
    });

    it('passes canonical values through unchanged', () => {
        expect(normalizeCastingTime('1 action')).toBe('1 action');
        expect(normalizeCastingTime('1 bonus action')).toBe('1 bonus action');
        expect(normalizeCastingTime('1 reaction')).toBe('1 reaction');
        expect(normalizeCastingTime('passive')).toBe('passive');
    });

    it('leaves non-casting-time strings unchanged', () => {
        expect(normalizeCastingTime('1 minute')).toBe('1 minute');
        expect(normalizeCastingTime('1 reaction, after attack')).toBe('1 reaction, after attack');
        expect(normalizeCastingTime('1 minute or Ritual')).toBe('1 minute or Ritual');
        expect(normalizeCastingTime('')).toBe('');
    });

    it('returns non-string values unchanged', () => {
        expect(normalizeCastingTime(undefined)).toBeUndefined();
        expect(normalizeCastingTime(null)).toBeNull();
    });
});

describe('casting_time data guard', () => {
    const collectAutomationCastingTimes = (node, found) => {
        if (Array.isArray(node)) {
            node.forEach(item => collectAutomationCastingTimes(item, found));
            return;
        }
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
            if (key === 'automation') {
                const entries = Array.isArray(value) ? value : [value];
                entries.forEach(auto => {
                    if (auto && typeof auto === 'object' && typeof auto.casting_time === 'string') {
                        found.push(auto.casting_time);
                    }
                });
            } else {
                collectAutomationCastingTimes(value, found);
            }
        }
    };

    const listJsonFiles = (dir) => {
        const files = [];
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) {
                files.push(...listJsonFiles(full));
            } else if (entry.endsWith('.json')) {
                files.push(full);
            }
        }
        return files;
    };

    it('every automation casting_time in public/data is in canonical form', () => {
        const offenders = [];
        for (const file of listJsonFiles('public/data')) {
            const data = JSON.parse(readFileSync(file, 'utf8'));
            const found = [];
            collectAutomationCastingTimes(data, found);
            for (const castingTime of found) {
                if (castingTime !== normalizeCastingTime(castingTime) || castingTime.includes('_')) {
                    offenders.push(`${file}: ${JSON.stringify(castingTime)}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
