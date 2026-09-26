import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    arrayUnion,
    onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
    FlexTimeEntry,
    WeeklyFlexTime,
    WeeklyStats,
    MAX_FLEX_TIME_PER_WEEK,
    FLEX_TIME_INCREMENT,
    WEEKS_FOR_STREAK
} from '@/types';

// Re-export constants and config flag for convenience
export { MAX_FLEX_TIME_PER_WEEK, FLEX_TIME_INCREMENT, WEEKS_FOR_STREAK } from '@/types';
export { isFirebaseConfigured } from './firebase';

// Get the start of the current flex time week (Saturday 12:00 AM)
export function getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    // Week starts on Saturday. Calculate days since last Saturday.
    // Sat(6)->0, Sun(0)->1, Mon(1)->2, Tue(2)->3, Wed(3)->4, Thu(4)->5, Fri(5)->6
    const daysSinceSaturday = (day - 6 + 7) % 7;
    d.setDate(d.getDate() - daysSinceSaturday);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get the end of the current flex time week (next Saturday 12:00 AM)
export function getWeekEnd(date: Date = new Date()): Date {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7); // Next Saturday
    return weekEnd;
}

// Get the week ID for Firestore based on the Saturday start date (e.g., "2026-01-24")
export function getWeekId(date: Date = new Date()): string {
    const weekStart = getWeekStart(date);
    const year = weekStart.getFullYear();
    const month = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const day = weekStart.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ===== Earning weeks vs. payout weekends =====
//
// A flex time week runs Saturday 00:00 to the following Saturday 00:00, and is
// identified by the Saturday that opens it. Flex time is EARNED across that
// week and SPENT on the weekend that opens the NEXT week:
//
//   Sat 9/19 .. Fri 9/25   earning week "2026-09-19"
//   Sat 9/26 / Sun 9/27    that week's payout weekend
//                          (and the start of earning week "2026-09-26")
//
// So on any Saturday or Sunday, three different things are true at once, and
// the app has to keep them apart:
//   - last week's total is what can be spent this weekend
//   - the day it lands on was decided by LAST week's vote, now final
//   - anything earned today counts toward NEXT weekend, on a live vote

// The week currently accruing flex time. Same as getWeekId; named for intent.
export function getEarningWeekId(date: Date = new Date()): string {
    return getWeekId(date);
}

// The week whose earnings this weekend spends, or null on a weekday.
export function getPayoutWeekId(date: Date = new Date()): string | null {
    return isWeekend(date) ? getPreviousWeekId(date) : null;
}

// The week that pays out on the next weekend to come. The week you are earning
// now always pays out on the weekend that opens the following week, so on a
// weekday this is the coming weekend and on a payout weekend it is the one after.
export function getNextPayoutWeekId(date: Date = new Date()): string {
    return getWeekId(date);
}

// The Saturday that opens the payout weekend for a given earning week.
export function getPayoutWeekendStart(weekId: string): Date {
    const [year, month, day] = weekId.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    start.setDate(start.getDate() + 7);
    return start;
}

// Where the payout day sits relative to now.
export type PayoutTiming = 'today' | 'tomorrow' | 'passed' | 'upcoming';

export function getPayoutTiming(payoutDay: DayPreference, date: Date = new Date()): PayoutTiming {
    const day = date.getDay();

    if (day === 6) {
        // Saturday: either today, or tomorrow if Sunday won
        return payoutDay === 'saturday' ? 'today' : 'tomorrow';
    }

    if (day === 0) {
        // Sunday: either today, or the Saturday window is already gone
        return payoutDay === 'sunday' ? 'today' : 'passed';
    }

    // Monday to Friday: this week's earnings pay out on the coming weekend
    return 'upcoming';
}

// Is the 10:00 AM - 12:00 PM window open on the day the vote actually chose?
export function isInPayoutWindow(payoutDay: DayPreference, date: Date = new Date()): boolean {
    const wantedDay = payoutDay === 'saturday' ? 6 : 0;
    if (date.getDay() !== wantedDay) return false;

    const hours = date.getHours();
    return hours >= 10 && hours < 12;
}

// Check if it's a weekend (Saturday or Sunday)
export function isWeekend(date: Date = new Date()): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday (0) or Saturday (6)
}

// Get the previous week's ID (the Saturday before the current week start)
export function getPreviousWeekId(date: Date = new Date()): string {
    const weekStart = getWeekStart(date);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const year = prevWeekStart.getFullYear();
    const month = (prevWeekStart.getMonth() + 1).toString().padStart(2, '0');
    const day = prevWeekStart.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if flex time should be reset (new week starts Saturday)
export function shouldResetFlexTime(lastWeekStart: Date, now: Date = new Date()): boolean {
    const currentWeekStart = getWeekStart(now);
    return lastWeekStart.getTime() < currentWeekStart.getTime();
}

// Get current weekly flex time data
export async function getWeeklyFlexTime(): Promise<WeeklyFlexTime> {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Return empty state if Firebase not configured
    if (!db) {
        return {
            weekStart,
            weekEnd,
            balance: 0,
            entries: [],
            lastUpdated: new Date()
        };
    }

    try {
        const weekId = getWeekId();
        const docRef = doc(db, 'flexTime', weekId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const allEntries = data.entries.map((e: FlexTimeEntry & { timestamp: { toDate: () => Date } }) => ({
                ...e,
                timestamp: e.timestamp.toDate()
            }));

            // Filter entries to only include those within the current week boundaries
            const entries = allEntries.filter(
                (e: FlexTimeEntry) => e.timestamp >= weekStart && e.timestamp < weekEnd
            );

            // Recalculate balance from filtered entries
            const balance = entries.reduce((sum: number, e: FlexTimeEntry) => sum + e.minutes, 0);

            return {
                weekStart,
                weekEnd,
                balance,
                entries,
                lastUpdated: data.lastUpdated.toDate()
            };
        }

        // No data for this week yet, return empty state
        return {
            weekStart,
            weekEnd,
            balance: 0,
            entries: [],
            lastUpdated: new Date()
        };
    } catch (error) {
        // Handle permission errors (e.g., when user is not logged in)
        // Return empty state so kids view can still display
        console.warn('Could not fetch flex time data:', error);
        return {
            weekStart,
            weekEnd,
            balance: 0,
            entries: [],
            lastUpdated: new Date()
        };
    }
}

// Get flex time data for a specific week by weekId
export async function getWeeklyFlexTimeForWeek(weekId: string): Promise<WeeklyFlexTime> {
    // Parse the weekId to get the week start date
    const [year, month, day] = weekId.split('-').map(Number);
    const weekStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (!db) {
        return { weekStart, weekEnd, balance: 0, entries: [], lastUpdated: new Date() };
    }

    try {
        const docRef = doc(db, 'flexTime', weekId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const allEntries = data.entries.map((e: FlexTimeEntry & { timestamp: { toDate: () => Date } }) => ({
                ...e,
                timestamp: e.timestamp.toDate()
            }));

            const entries = allEntries.filter(
                (e: FlexTimeEntry) => e.timestamp >= weekStart && e.timestamp < weekEnd
            );

            const balance = entries.reduce((sum: number, e: FlexTimeEntry) => sum + e.minutes, 0);

            return { weekStart, weekEnd, balance, entries, lastUpdated: data.lastUpdated.toDate() };
        }

        return { weekStart, weekEnd, balance: 0, entries: [], lastUpdated: new Date() };
    } catch (error) {
        console.warn('Could not fetch flex time data for week:', error);
        return { weekStart, weekEnd, balance: 0, entries: [], lastUpdated: new Date() };
    }
}

// Get day preferences for a specific week by weekId
export async function getDayPreferencesForWeek(weekId: string): Promise<DayPreferenceData> {
    const defaultData: DayPreferenceData = {
        weekId,
        preferences: { charlie: 'saturday', malcolm: 'saturday', henry: 'saturday' },
        lastUpdated: new Date()
    };

    if (!db) return defaultData;

    try {
        const docRef = doc(db, 'dayPreferences', weekId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                weekId: data.weekId,
                preferences: data.preferences,
                lastUpdated: data.lastUpdated.toDate()
            };
        }

        return defaultData;
    } catch (error) {
        console.warn('Could not fetch day preferences for week:', error);
        return defaultData;
    }
}

// Add flex time (10 minutes)
// targetDate allows backdating entries to a specific date/time (e.g., for a previous week)
export async function addFlexTime(
    userId: string,
    userName: string,
    note?: string,
    targetDate?: Date
): Promise<{ success: boolean; message: string; newBalance: number }> {
    if (!db) {
        return {
            success: false,
            message: 'Firebase not configured',
            newBalance: 0
        };
    }

    const entryTimestamp = targetDate || new Date();
    const weekId = getWeekId(entryTimestamp);
    const weekStart = getWeekStart(entryTimestamp);
    const weekEnd = getWeekEnd(entryTimestamp);

    const docRef = doc(db, 'flexTime', weekId);
    const docSnap = await getDoc(docRef);

    let currentBalance = 0;

    if (docSnap.exists()) {
        currentBalance = docSnap.data().balance;
    }

    // Check if at max
    if (currentBalance >= MAX_FLEX_TIME_PER_WEEK) {
        return {
            success: false,
            message: `Already at maximum flex time (${MAX_FLEX_TIME_PER_WEEK} minutes) for this week!`,
            newBalance: currentBalance
        };
    }

    const newBalance = Math.min(currentBalance + FLEX_TIME_INCREMENT, MAX_FLEX_TIME_PER_WEEK);

    const newEntry: FlexTimeEntry = {
        minutes: FLEX_TIME_INCREMENT,
        addedBy: userId,
        addedByName: userName,
        timestamp: entryTimestamp,
        ...(note && { note })  // Only include note if it has a value
    };

    if (docSnap.exists()) {
        await updateDoc(docRef, {
            balance: newBalance,
            entries: arrayUnion(newEntry),
            lastUpdated: new Date()
        });
    } else {
        await setDoc(docRef, {
            weekStart,
            weekEnd,
            balance: newBalance,
            entries: [newEntry],
            lastUpdated: new Date()
        });
    }

    // Update weekly stats for streak tracking
    await updateWeeklyStats(weekId, weekStart, newBalance);

    return {
        success: true,
        message: `Added ${FLEX_TIME_INCREMENT} minutes! New balance: ${newBalance} minutes`,
        newBalance
    };
}

// Update weekly stats for streak tracking
async function updateWeeklyStats(weekId: string, weekStart: Date, totalEarned: number): Promise<void> {
    if (!db) return;

    const statsRef = doc(db, 'weeklyStats', weekId);
    await setDoc(statsRef, {
        weekId,
        weekStart,
        totalEarned,
        maxedOut: totalEarned >= MAX_FLEX_TIME_PER_WEEK
    }, { merge: true });
}

// Check if there's a streak (consecutive weeks of maxed flex time)
export async function checkStreak(): Promise<{ hasStreak: boolean; streakCount: number }> {
    if (!db) {
        return { hasStreak: false, streakCount: 0 };
    }

    try {
        const statsRef = collection(db, 'weeklyStats');
        const q = query(statsRef, orderBy('weekStart', 'desc'), limit(WEEKS_FOR_STREAK + 1));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
            return { hasStreak: false, streakCount: 0 };
        }

        const stats: WeeklyStats[] = [];
        querySnap.forEach((docSnap) => {
            const data = docSnap.data();
            stats.push({
                weekId: data.weekId,
                weekStart: data.weekStart.toDate(),
                totalEarned: data.totalEarned,
                maxedOut: data.maxedOut
            });
        });

        // Count consecutive maxed-out weeks (excluding current incomplete week)
        let streakCount = 0;
        const currentWeekId = getWeekId();

        for (const stat of stats) {
            // Skip current week if it's not maxed out yet
            if (stat.weekId === currentWeekId && !stat.maxedOut) {
                continue;
            }
            if (stat.maxedOut) {
                streakCount++;
            } else {
                break;
            }
        }

        return {
            hasStreak: streakCount >= WEEKS_FOR_STREAK,
            streakCount
        };
    } catch (error) {
        // Handle permission errors (e.g., when user is not logged in)
        // Return no streak so kids view can still display
        console.warn('Could not fetch streak data:', error);
        return { hasStreak: false, streakCount: 0 };
    }
}

// Delete a flex time entry (for correcting mistakes)
export async function deleteFlexTimeEntry(
    entryTimestamp: Date
): Promise<{ success: boolean; message: string; newBalance: number }> {
    if (!db) {
        return {
            success: false,
            message: 'Firebase not configured',
            newBalance: 0
        };
    }

    // An entry lives in the week its own timestamp falls in, which is not
    // necessarily the current week: parents can backdate.
    const weekId = getWeekId(entryTimestamp);
    const docRef = doc(db, 'flexTime', weekId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return {
            success: false,
            message: 'No flex time data found for that week',
            newBalance: 0
        };
    }

    const data = docSnap.data();
    const entries = data.entries.map((e: FlexTimeEntry & { timestamp: { toDate: () => Date } }) => ({
        ...e,
        timestamp: e.timestamp.toDate()
    }));

    // Find and remove the entry with matching timestamp
    const entryIndex = entries.findIndex(
        (e: FlexTimeEntry) => e.timestamp.getTime() === entryTimestamp.getTime()
    );

    if (entryIndex === -1) {
        return {
            success: false,
            message: 'Entry not found',
            newBalance: data.balance
        };
    }

    const removedEntry = entries[entryIndex];
    const updatedEntries = entries.filter((_: FlexTimeEntry, i: number) => i !== entryIndex);
    const newBalance = Math.max(0, data.balance - removedEntry.minutes);

    // Convert timestamps back for Firestore
    const entriesForFirestore = updatedEntries.map((e: FlexTimeEntry) => ({
        ...e,
        timestamp: e.timestamp
    }));

    await updateDoc(docRef, {
        balance: newBalance,
        entries: entriesForFirestore,
        lastUpdated: new Date()
    });

    // Update weekly stats for the week the entry belonged to
    await updateWeeklyStats(weekId, getWeekStart(entryTimestamp), newBalance);

    return {
        success: true,
        message: `Removed ${removedEntry.minutes} minutes. New balance: ${newBalance} minutes`,
        newBalance
    };
}

// Everything the app needs to describe the payout weekend in progress:
// whose week is being spent, how much, which day it lands on, and whether that
// day is today, tomorrow or already gone. Null on a weekday.
export interface PayoutWeekend {
    /** The earning week whose total is being spent this weekend */
    weekId: string;
    flexTime: WeeklyFlexTime;
    /** Decided by that week's vote, and final now the week has closed */
    payoutDay: DayPreference;
    timing: PayoutTiming;
}

export async function getPayoutWeekend(date: Date = new Date()): Promise<PayoutWeekend | null> {
    const weekId = getPayoutWeekId(date);
    if (!weekId) return null;

    const [flexTime, preferences] = await Promise.all([
        getWeeklyFlexTimeForWeek(weekId),
        getDayPreferencesForWeek(weekId)
    ]);

    const payoutDay = calculateWinningDay(preferences.preferences);

    return { weekId, flexTime, payoutDay, timing: getPayoutTiming(payoutDay, date) };
}

// "Oct 3". Deliberately omits the weekday: a payout can land on either day of
// its weekend, so naming Saturday would be misleading.
function formatMonthDay(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Names an earning week by the Saturday that opens it.
export function formatWeekLabel(weekId: string): string {
    const [year, month, day] = weekId.split('-').map(Number);
    return formatMonthDay(new Date(year, month - 1, day));
}

// Names the WEEKEND that the week being earned right now pays out on, which is
// always a week after that week opens. This is the label for "what you are
// earning toward" — never the earning week's own label.
export function getNextPayoutWeekendLabel(date: Date = new Date()): string {
    return formatMonthDay(getPayoutWeekendStart(getNextPayoutWeekId(date)));
}

// Format minutes as human-readable string
export function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${mins}m`;
}

// ===== Day Preference Functions =====

export type DayPreference = 'saturday' | 'sunday';

export interface KidDayPreferences {
    charlie: DayPreference;
    malcolm: DayPreference;
    henry: DayPreference;
}

export interface DayPreferenceData {
    weekId: string;
    preferences: KidDayPreferences;
    lastUpdated: Date;
}

export const KIDS = ['charlie', 'malcolm', 'henry'] as const;
export type KidName = typeof KIDS[number];

// Calculate which day wins based on preferences
export function calculateWinningDay(preferences: KidDayPreferences): DayPreference {
    const saturdayVotes = Object.values(preferences).filter(p => p === 'saturday').length;
    const sundayVotes = Object.values(preferences).filter(p => p === 'sunday').length;

    // Majority wins - if tied, Saturday wins (2-1 or 1-2 scenarios)
    return saturdayVotes >= sundayVotes ? 'saturday' : 'sunday';
}

// Get the default preferences (all Saturday)
function getDefaultPreferences(): KidDayPreferences {
    return {
        charlie: 'saturday',
        malcolm: 'saturday',
        henry: 'saturday'
    };
}

// Get day preferences for current week
export async function getDayPreferences(): Promise<DayPreferenceData> {
    const weekId = getWeekId();
    const defaultData: DayPreferenceData = {
        weekId,
        preferences: getDefaultPreferences(),
        lastUpdated: new Date()
    };

    if (!db) {
        return defaultData;
    }

    try {
        const docRef = doc(db, 'dayPreferences', weekId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                weekId: data.weekId,
                preferences: data.preferences,
                lastUpdated: data.lastUpdated.toDate()
            };
        }

        return defaultData;
    } catch (error) {
        console.warn('Could not fetch day preferences:', error);
        return defaultData;
    }
}

// Update a kid's day preference
export async function updateDayPreference(
    kidName: KidName,
    preference: DayPreference
): Promise<{ success: boolean; message: string }> {
    if (!db) {
        return {
            success: false,
            message: 'Firebase not configured'
        };
    }

    const weekId = getWeekId();

    try {
        const docRef = doc(db, 'dayPreferences', weekId);
        const docSnap = await getDoc(docRef);

        let currentPreferences = getDefaultPreferences();

        if (docSnap.exists()) {
            currentPreferences = docSnap.data().preferences;
        }

        // Update the specific kid's preference
        const updatedPreferences = {
            ...currentPreferences,
            [kidName]: preference
        };

        await setDoc(docRef, {
            weekId,
            preferences: updatedPreferences,
            lastUpdated: new Date()
        });

        return {
            success: true,
            message: `${kidName.charAt(0).toUpperCase() + kidName.slice(1)}'s preference updated to ${preference}`
        };
    } catch (error) {
        console.error('Failed to update day preference:', error);
        return {
            success: false,
            message: 'Failed to update preference'
        };
    }
}

// Subscribe to day preferences (real-time updates)
export function subscribeToDayPreferences(
    callback: (data: DayPreferenceData) => void
): () => void {
    const weekId = getWeekId();

    if (!db) {
        callback({
            weekId,
            preferences: getDefaultPreferences(),
            lastUpdated: new Date()
        });
        return () => {};
    }

    const docRef = doc(db, 'dayPreferences', weekId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                weekId: data.weekId,
                preferences: data.preferences,
                lastUpdated: data.lastUpdated.toDate()
            });
        } else {
            callback({
                weekId,
                preferences: getDefaultPreferences(),
                lastUpdated: new Date()
            });
        }
    }, (error) => {
        console.warn('Day preferences subscription error:', error);
        callback({
            weekId,
            preferences: getDefaultPreferences(),
            lastUpdated: new Date()
        });
    });

    return unsubscribe;
}
