import { KidName } from './flex-time';

// Column order for the checklist grid
export const CHECKLIST_KIDS = ['malcolm', 'henry', 'charlie'] as const satisfies readonly KidName[];

export const KID_LABELS: Record<KidName, string> = {
    malcolm: 'Malcolm',
    henry: 'Henry',
    charlie: 'Charlie'
};

export const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

// Day indices match Date.getDay(): Sunday 0 ... Saturday 6
const SUNDAY = 0;
const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;

// Shower nights, per kid
const SHOWER_NIGHTS: Record<KidName, number[]> = {
    charlie: [MONDAY, WEDNESDAY, SUNDAY],
    malcolm: [TUESDAY, THURSDAY, SUNDAY],
    henry: [TUESDAY, THURSDAY, SUNDAY]
};

export interface ChecklistRow {
    id: string;
    emoji: string;
    label: string;
    detail?: string;
    /** True for rows that only show up on certain days (showers, trash) */
    scheduled: boolean;
    /** One check for the whole house: whoever does it, does it */
    shared: boolean;
    /** Kids who owe this task today. Empty for shared rows. */
    owedBy: KidName[];
    /** Per-kid icon and label, for rows where each kid owes something different */
    kidTasks?: Partial<Record<KidName, KidTask>>;
}

export interface KidTask {
    icon: string;
    label: string;
}

const EVERYONE: KidName[] = [...CHECKLIST_KIDS];

function sharedRow(id: string, emoji: string, label: string, detail?: string): ChecklistRow {
    return { id, emoji, label, detail, scheduled: false, shared: true, owedBy: [] };
}

// Build today's checklist. Every task on this list has to be done before a
// parent starts verifying, or it comes out of the 2-hour timer.
export function getChecklistForDay(day: number): ChecklistRow[] {
    const rows: ChecklistRow[] = [
        // Shared house chores: one check each, whoever gets to it
        sharedRow('projector-room', '📽️', 'Projector room clean'),
        sharedRow('living-room', '🛋️', 'Living room clean'),
        sharedRow('dining-room', '🍽️', 'Dining room clean'),
        sharedRow('bathroom-black', '🚽', 'Black downstairs bathroom tidy'),
        sharedRow('bathroom-other', '🚽', 'Other downstairs bathroom tidy'),
        sharedRow('sweep-dining', '🧹', 'Sweep the dining room'),
        sharedRow('sweep-living', '🧹', 'Sweep the living room'),
        sharedRow('sweep-projector', '🧹', 'Sweep the projector room'),
        sharedRow('sweep-hallway', '🧹', 'Sweep the hallway'),
        sharedRow('sweep-bedrooms', '🧹', 'Sweep the bedrooms'),

        // Everyone owes their own
        {
            id: 'bedroom',
            emoji: '🛏️',
            label: 'Bedroom clean',
            detail: 'Your own room',
            scheduled: false,
            shared: false,
            owedBy: EVERYONE
        },
        {
            id: 'practice',
            emoji: '⏱️',
            label: '15 minutes of practice',
            detail: 'Music for Charlie and Henry, ASL for Malcolm',
            scheduled: false,
            shared: false,
            owedBy: EVERYONE,
            kidTasks: {
                malcolm: { icon: '🤟', label: '15 minutes of ASL practice' },
                henry: { icon: '🎹', label: '15 minutes of music practice' },
                charlie: { icon: '🎹', label: '15 minutes of music practice' }
            }
        }
    ];

    const showerKids = CHECKLIST_KIDS.filter((kid) => SHOWER_NIGHTS[kid].includes(day));
    if (showerKids.length > 0) {
        rows.push({
            id: 'shower',
            emoji: '🚿',
            label: 'Shower',
            detail: 'Tonight is a shower night',
            scheduled: true,
            shared: false,
            owedBy: [...showerKids]
        });
    }

    if (day === THURSDAY) {
        rows.push({
            id: 'trash',
            emoji: '🗑️',
            label: 'Take the trash out',
            detail: 'Every can in the house emptied, cans out to the curb',
            scheduled: true,
            shared: true,
            owedBy: []
        });
    }

    return rows;
}

// Storage key for a shared row: the house owes it, not any one kid.
export function sharedCellId(taskId: string): string {
    return `${taskId}:house`;
}

export function cellId(taskId: string, kid: KidName): string {
    return `${taskId}:${kid}`;
}

// Local calendar date, e.g. "2026-09-18". Used to throw the list out at midnight.
export function getDayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function msUntilMidnight(date: Date = new Date()): number {
    const midnight = new Date(date);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - date.getTime();
}

const STORAGE_KEY = 'kidflextime.checklist.v1';

export type ChecklistState = Record<string, boolean>;

// Checklist state never leaves the device, and anything from an earlier day is
// dropped on read so the list is always empty again after midnight.
export function loadChecklist(date: Date = new Date()): ChecklistState {
    if (typeof window === 'undefined') return {};

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as { day?: string; checked?: ChecklistState };
        if (parsed?.day !== getDayKey(date) || !parsed.checked) {
            window.localStorage.removeItem(STORAGE_KEY);
            return {};
        }

        return parsed.checked;
    } catch {
        return {};
    }
}

export function saveChecklist(checked: ChecklistState, date: Date = new Date()): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ day: getDayKey(date), checked })
        );
    } catch {
        // Private browsing or a full quota: the list still works for this session.
    }
}
