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

// Check if we're currently in the flex time viewing window (Sat/Sun 10am-12pm)
export function isInViewingWindow(date: Date = new Date()): boolean {
    const day = date.getDay();
    const hours = date.getHours();

    // Saturday (6) or Sunday (0), between 10:00 AM and 12:00 PM
    if (day === 0 || day === 6) {
        return hours >= 10 && hours < 12;
    }
    return false;
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

// Add flex time (10 minutes)
export async function addFlexTime(
    userId: string,
    userName: string,
    note?: string
): Promise<{ success: boolean; message: string; newBalance: number }> {
    if (!db) {
        return {
            success: false,
            message: 'Firebase not configured',
            newBalance: 0
        };
    }

    const weekId = getWeekId();
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

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
        timestamp: new Date(),
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

    const weekId = getWeekId();
    const docRef = doc(db, 'flexTime', weekId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return {
            success: false,
            message: 'No flex time data found for this week',
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

    // Update weekly stats
    const weekStart = getWeekStart();
    await updateWeeklyStats(weekId, weekStart, newBalance);

    return {
        success: true,
        message: `Removed ${removedEntry.minutes} minutes. New balance: ${newBalance} minutes`,
        newBalance
    };
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
