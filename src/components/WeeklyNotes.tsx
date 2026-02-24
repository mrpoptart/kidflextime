'use client';

import { FlexTimeEntry } from '@/types';

interface WeeklyNotesProps {
    entries: FlexTimeEntry[];
}

function formatEntryTime(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMin = minutes.toString().padStart(2, '0');
    return `${day} ${displayHour}:${displayMin} ${ampm}`;
}

export default function WeeklyNotes({ entries }: WeeklyNotesProps) {
    const notesWithContent = entries.filter(e => e.note && e.note.trim());

    if (notesWithContent.length === 0) {
        return null;
    }

    return (
        <div className="weekly-notes">
            <h3>🌟 Why We Earned It</h3>
            <ul className="notes-list">
                {notesWithContent.map((entry, index) => (
                    <li key={index} className="note-item">
                        <span className="note-text">{entry.note}</span>
                        <span className="note-meta">
                            +{entry.minutes} min
                            {entry.addedByName && ` by ${entry.addedByName}`}
                            {' · '}{formatEntryTime(entry.timestamp)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
