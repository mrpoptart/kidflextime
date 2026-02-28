'use client';

import { FlexTimeEntry } from '@/types';

interface WeeklyNotesProps {
    entries: FlexTimeEntry[];
    onDeleteEntry?: (entry: FlexTimeEntry) => void;
    emptyMessage?: string;
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

export default function WeeklyNotes({ entries, onDeleteEntry, emptyMessage }: WeeklyNotesProps) {
    if (entries.length === 0) {
        return (
            <div className="weekly-notes">
                <h3>🌟 Why We Earned It</h3>
                <p className="no-notes">{emptyMessage || 'No flex time added yet this week'}</p>
            </div>
        );
    }

    return (
        <div className="weekly-notes">
            <h3>🌟 Why We Earned It</h3>
            <ul className="notes-list">
                {entries.map((entry, index) => (
                    <li key={index} className="note-item">
                        <div className="note-content">
                            {entry.note && entry.note.trim() ? (
                                <span className="note-text">{entry.note}</span>
                            ) : (
                                <span className="note-text note-text-empty">No reason provided</span>
                            )}
                            <span className="note-meta">
                                +{entry.minutes} min
                                {entry.addedByName && ` by ${entry.addedByName}`}
                                {' · '}{formatEntryTime(entry.timestamp)}
                            </span>
                        </div>
                        {onDeleteEntry && (
                            <button
                                className="delete-entry-btn"
                                onClick={() => onDeleteEntry(entry)}
                                title="Delete entry"
                            >
                                &times;
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
