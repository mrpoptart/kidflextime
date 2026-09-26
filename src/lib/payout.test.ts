import { describe, it, expect } from 'vitest';
import {
    getEarningWeekId,
    getPayoutWeekId,
    getNextPayoutWeekId,
    getPayoutWeekendStart,
    getPayoutTiming,
    isInPayoutWindow,
    formatWeekLabel,
    getNextPayoutWeekendLabel,
    getWeekId
} from '@/lib/flex-time';

/**
 * Earning week "2026-09-19" runs Sat 9/19 .. Fri 9/25.
 * Its payout weekend is Sat 9/26 and Sun 9/27, which is also the first
 * two days of earning week "2026-09-26".
 */
const MID_EARNING_WEEK = new Date(2026, 8, 23, 10, 30);  // Wed 9/23
const LAST_INSTANT = new Date(2026, 8, 25, 23, 59, 59, 999); // Fri 9/25
const PAYOUT_SATURDAY = new Date(2026, 8, 26, 10, 30);   // Sat 9/26
const PAYOUT_SUNDAY = new Date(2026, 8, 27, 10, 30);     // Sun 9/27

describe('which week is earning and which is paying out', () => {
    it('earns into the current week on every day, weekend included', () => {
        expect(getEarningWeekId(MID_EARNING_WEEK)).toBe('2026-09-19');
        expect(getEarningWeekId(LAST_INSTANT)).toBe('2026-09-19');
        // The payout weekend is also the start of a brand new earning week
        expect(getEarningWeekId(PAYOUT_SATURDAY)).toBe('2026-09-26');
        expect(getEarningWeekId(PAYOUT_SUNDAY)).toBe('2026-09-26');
    });

    it('spends the week that just closed, on both days of the payout weekend', () => {
        expect(getPayoutWeekId(PAYOUT_SATURDAY)).toBe('2026-09-19');
        expect(getPayoutWeekId(PAYOUT_SUNDAY)).toBe('2026-09-19');
    });

    it('has no payout week in progress on a weekday', () => {
        for (let d = 21; d <= 25; d++) {
            expect(getPayoutWeekId(new Date(2026, 8, d, 10, 30))).toBeNull();
        }
    });

    it('never spends the week it is currently earning', () => {
        for (let d = 19; d <= 27; d++) {
            const now = new Date(2026, 8, d, 10, 30);
            const payout = getPayoutWeekId(now);
            if (payout !== null) {
                expect(payout).not.toBe(getEarningWeekId(now));
            }
        }
    });

    it('always points the current earning week at the next weekend to come', () => {
        expect(getNextPayoutWeekId(MID_EARNING_WEEK)).toBe('2026-09-19');
        // On the payout weekend, what you earn today pays out the weekend after
        expect(getNextPayoutWeekId(PAYOUT_SATURDAY)).toBe('2026-09-26');
        expect(getNextPayoutWeekId(PAYOUT_SUNDAY)).toBe('2026-09-26');
    });

    it('rolls the payout week over exactly at Saturday midnight', () => {
        expect(getPayoutWeekId(new Date(2026, 8, 25, 23, 59, 59, 999))).toBeNull();
        expect(getPayoutWeekId(new Date(2026, 8, 26, 0, 0, 0, 0))).toBe('2026-09-19');
    });
});

describe('getPayoutWeekendStart', () => {
    it('is the Saturday seven days after the week it pays out', () => {
        const start = getPayoutWeekendStart('2026-09-19');
        expect(start.getDay()).toBe(6);
        expect(start.getDate()).toBe(26);
        expect(start.getMonth()).toBe(8);
        expect(getWeekId(start)).toBe('2026-09-26');
    });

    it('crosses month and year boundaries', () => {
        expect(getPayoutWeekendStart('2026-12-26').getFullYear()).toBe(2027);
        expect(getPayoutWeekendStart('2026-12-26').getMonth()).toBe(0);
        expect(getPayoutWeekendStart('2026-12-26').getDate()).toBe(2);
    });
});

describe('getPayoutTiming', () => {
    it('says today when the chosen day is today', () => {
        expect(getPayoutTiming('saturday', PAYOUT_SATURDAY)).toBe('today');
        expect(getPayoutTiming('sunday', PAYOUT_SUNDAY)).toBe('today');
    });

    it('says tomorrow on Saturday when Sunday won', () => {
        expect(getPayoutTiming('sunday', PAYOUT_SATURDAY)).toBe('tomorrow');
    });

    it('says passed on Sunday when Saturday won', () => {
        expect(getPayoutTiming('saturday', PAYOUT_SUNDAY)).toBe('passed');
    });

    it('says upcoming on every weekday, whichever day won', () => {
        for (let d = 21; d <= 25; d++) {
            const weekday = new Date(2026, 8, d, 10, 30);
            expect(getPayoutTiming('saturday', weekday)).toBe('upcoming');
            expect(getPayoutTiming('sunday', weekday)).toBe('upcoming');
        }
    });
});

describe('isInPayoutWindow', () => {
    it('opens 10:00 to 12:00 on the day the vote chose', () => {
        expect(isInPayoutWindow('saturday', new Date(2026, 8, 26, 9, 59))).toBe(false);
        expect(isInPayoutWindow('saturday', new Date(2026, 8, 26, 10, 0))).toBe(true);
        expect(isInPayoutWindow('saturday', new Date(2026, 8, 26, 11, 59))).toBe(true);
        expect(isInPayoutWindow('saturday', new Date(2026, 8, 26, 12, 0))).toBe(false);
    });

    it('does not open on the day the vote did not choose', () => {
        // This is the old bug: the window used to fire on both weekend days
        expect(isInPayoutWindow('sunday', new Date(2026, 8, 26, 10, 30))).toBe(false);
        expect(isInPayoutWindow('saturday', new Date(2026, 8, 27, 10, 30))).toBe(false);
    });

    it('never opens on a weekday', () => {
        for (let d = 21; d <= 25; d++) {
            expect(isInPayoutWindow('saturday', new Date(2026, 8, d, 10, 30))).toBe(false);
            expect(isInPayoutWindow('sunday', new Date(2026, 8, d, 10, 30))).toBe(false);
        }
    });
});

describe('the three states the app has to keep apart', () => {
    it('earned last week, spendable today', () => {
        const now = PAYOUT_SATURDAY;
        expect(getPayoutWeekId(now)).toBe('2026-09-19');
        expect(getPayoutTiming('saturday', now)).toBe('today');
        expect(isInPayoutWindow('saturday', now)).toBe(true);
    });

    it('earned last week, spendable tomorrow', () => {
        const now = PAYOUT_SATURDAY;
        expect(getPayoutWeekId(now)).toBe('2026-09-19');
        expect(getPayoutTiming('sunday', now)).toBe('tomorrow');
        expect(isInPayoutWindow('sunday', now)).toBe(false);
    });

    it('earned today, counts toward next weekend', () => {
        const now = PAYOUT_SATURDAY;
        expect(getEarningWeekId(now)).toBe('2026-09-26');
        expect(getNextPayoutWeekId(now)).toBe('2026-09-26');
        expect(getPayoutWeekendStart(getNextPayoutWeekId(now)).getDate()).toBe(3); // Sat 10/3
    });
});

describe('formatWeekLabel', () => {
    it('names the week by its opening Saturday, without a weekday', () => {
        expect(formatWeekLabel('2026-09-19')).toBe('Sep 19');
        expect(formatWeekLabel('2026-01-03')).toBe('Jan 3');
        expect(formatWeekLabel('2027-01-02')).toBe('Jan 2');
    });

});

describe('getNextPayoutWeekendLabel', () => {
    it('names the weekend being earned toward, not the week doing the earning', () => {
        // Wed 9/23 is inside earning week 2026-09-19, which pays out Sat 9/26
        expect(getNextPayoutWeekendLabel(new Date(2026, 8, 23))).toBe('Sep 26');
        expect(formatWeekLabel(getWeekId(new Date(2026, 8, 23)))).toBe('Sep 19');
    });

    it('rolls forward on the payout weekend itself', () => {
        // On Sat 9/26 you are spending week 9/19 and earning toward Sat 10/3
        expect(getNextPayoutWeekendLabel(new Date(2026, 8, 26, 10, 30))).toBe('Oct 3');
        expect(getNextPayoutWeekendLabel(new Date(2026, 8, 27, 10, 30))).toBe('Oct 3');
    });

    it('is always a week later than the week being earned', () => {
        for (let d = 19; d <= 27; d++) {
            const now = new Date(2026, 8, d, 12);
            const earning = getPayoutWeekendStart(getWeekId(now));
            expect(getNextPayoutWeekendLabel(now)).toBe(
                earning.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
        }
    });
});
