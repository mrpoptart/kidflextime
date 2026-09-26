import { describe, it, expect } from 'vitest';
import {
    getWeekStart,
    getWeekEnd,
    getWeekId,
    getPreviousWeekId,
    isWeekend,
    shouldResetFlexTime,
    calculateWinningDay,
    formatMinutes
} from '@/lib/flex-time';

/**
 * The flex time week runs Saturday 00:00 to the following Saturday 00:00, and
 * the week is identified by the date of the Saturday that opens it.
 *
 * Sat 2026-09-19 .. Fri 2026-09-25 is the week "2026-09-19".
 */
const WEEK_SEP_19 = [
    new Date(2026, 8, 19, 0, 0, 0, 0),      // Sat, the instant the week opens
    new Date(2026, 8, 19, 23, 59, 59, 999), // Sat, late
    new Date(2026, 8, 20, 10, 30),          // Sun
    new Date(2026, 8, 21, 10, 30),          // Mon
    new Date(2026, 8, 22, 10, 30),          // Tue
    new Date(2026, 8, 23, 10, 30),          // Wed
    new Date(2026, 8, 24, 10, 30),          // Thu
    new Date(2026, 8, 25, 23, 59, 59, 999)  // Fri, the last instant of the week
];

function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

describe('getWeekStart', () => {
    it('returns the Saturday that opens the week, at local midnight', () => {
        for (const date of WEEK_SEP_19) {
            const start = getWeekStart(date);
            expect(start.getFullYear()).toBe(2026);
            expect(start.getMonth()).toBe(8);
            expect(start.getDate()).toBe(19);
            expect(start.getDay()).toBe(6);
            expect([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()])
                .toEqual([0, 0, 0, 0]);
        }
    });

    it('treats a Saturday as the first day of its own week, not the last', () => {
        const saturday = new Date(2026, 8, 26, 10, 30);
        expect(getWeekStart(saturday).getDate()).toBe(26);
    });

    it('does not mutate the date it is given', () => {
        const input = new Date(2026, 8, 23, 10, 30);
        const copy = new Date(input.getTime());
        getWeekStart(input);
        expect(input.getTime()).toBe(copy.getTime());
    });

    it('works across a year boundary', () => {
        // Fri 2027-01-01 belongs to the week opened Sat 2026-12-26
        const start = getWeekStart(new Date(2027, 0, 1, 12, 0));
        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(11);
        expect(start.getDate()).toBe(26);
    });
});

describe('getWeekEnd', () => {
    it('is the next Saturday at local midnight', () => {
        const end = getWeekEnd(new Date(2026, 8, 23, 10, 30));
        expect(end.getDay()).toBe(6);
        expect(end.getDate()).toBe(26);
        expect(end.getHours()).toBe(0);
    });

    it('is exactly 7 calendar days after the week start, even across DST', () => {
        // US spring forward: Sun 2026-03-08. Fall back: Sun 2026-11-01.
        for (const date of [new Date(2026, 2, 9, 12), new Date(2026, 10, 2, 12), new Date(2026, 8, 23, 12)]) {
            const start = getWeekStart(date);
            const end = getWeekEnd(date);
            expect(daysBetween(start, end)).toBe(7);
            expect(end.getHours()).toBe(0);
            expect(end.getDay()).toBe(6);
        }
    });

    it('brackets every instant of the week it describes', () => {
        const start = getWeekStart(WEEK_SEP_19[0]);
        const end = getWeekEnd(WEEK_SEP_19[0]);
        for (const date of WEEK_SEP_19) {
            expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
            expect(date.getTime()).toBeLessThan(end.getTime());
        }
    });
});

describe('getWeekId', () => {
    it('is the same for every day of one week', () => {
        for (const date of WEEK_SEP_19) {
            expect(getWeekId(date)).toBe('2026-09-19');
        }
    });

    it('rolls over exactly at Saturday midnight', () => {
        expect(getWeekId(new Date(2026, 8, 25, 23, 59, 59, 999))).toBe('2026-09-19');
        expect(getWeekId(new Date(2026, 8, 26, 0, 0, 0, 0))).toBe('2026-09-26');
    });

    it('zero-pads month and day', () => {
        // Sat 2026-01-03
        expect(getWeekId(new Date(2026, 0, 5, 12))).toBe('2026-01-03');
    });
});

describe('getPreviousWeekId', () => {
    it('is the week id of exactly seven days earlier', () => {
        expect(getPreviousWeekId(new Date(2026, 8, 23, 10, 30))).toBe('2026-09-12');
        expect(getPreviousWeekId(new Date(2026, 8, 26, 10, 30))).toBe('2026-09-19');
    });

    it('matches getWeekId of a week earlier, across month and year boundaries', () => {
        for (const date of [new Date(2026, 0, 2, 12), new Date(2026, 2, 9, 12), new Date(2027, 0, 1, 12)]) {
            const aWeekEarlier = new Date(date.getTime());
            aWeekEarlier.setDate(aWeekEarlier.getDate() - 7);
            expect(getPreviousWeekId(date)).toBe(getWeekId(aWeekEarlier));
        }
    });
});

describe('isWeekend', () => {
    it('is true on Saturday and Sunday only', () => {
        expect(isWeekend(new Date(2026, 8, 19))).toBe(true);  // Sat
        expect(isWeekend(new Date(2026, 8, 20))).toBe(true);  // Sun
        for (let d = 21; d <= 25; d++) {
            expect(isWeekend(new Date(2026, 8, d))).toBe(false);
        }
    });
});

describe('shouldResetFlexTime', () => {
    it('is true once a new week has opened', () => {
        const lastWeekStart = getWeekStart(new Date(2026, 8, 19));
        expect(shouldResetFlexTime(lastWeekStart, new Date(2026, 8, 25, 23, 59))).toBe(false);
        expect(shouldResetFlexTime(lastWeekStart, new Date(2026, 8, 26, 0, 0))).toBe(true);
    });
});

describe('calculateWinningDay', () => {
    it('follows the majority', () => {
        expect(calculateWinningDay({ charlie: 'sunday', malcolm: 'sunday', henry: 'saturday' })).toBe('sunday');
        expect(calculateWinningDay({ charlie: 'saturday', malcolm: 'saturday', henry: 'sunday' })).toBe('saturday');
        expect(calculateWinningDay({ charlie: 'sunday', malcolm: 'sunday', henry: 'sunday' })).toBe('sunday');
        expect(calculateWinningDay({ charlie: 'saturday', malcolm: 'saturday', henry: 'saturday' })).toBe('saturday');
    });
});

describe('formatMinutes', () => {
    it('formats minutes, whole hours and mixed durations', () => {
        expect(formatMinutes(0)).toBe('0 min');
        expect(formatMinutes(10)).toBe('10 min');
        expect(formatMinutes(59)).toBe('59 min');
        expect(formatMinutes(60)).toBe('1 hour');
        expect(formatMinutes(120)).toBe('2 hours');
        expect(formatMinutes(90)).toBe('1h 30m');
    });
});
