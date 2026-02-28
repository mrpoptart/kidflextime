'use client';

import { useRef, useState } from 'react';
import { addFlexTime, getWeekId, FLEX_TIME_INCREMENT, MAX_FLEX_TIME_PER_WEEK } from '@/lib/flex-time';
import { useAuth } from '@/lib/auth-context';

interface AddFlexTimeButtonProps {
    currentBalance: number;
    onFlexTimeAdded: () => void;
}

function formatDisplayDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function AddFlexTimeButton({ currentBalance, onFlexTimeAdded }: AddFlexTimeButtonProps) {
    const { user, userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [customDateTime, setCustomDateTime] = useState('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    const isMaxed = currentBalance >= MAX_FLEX_TIME_PER_WEEK;

    const handleOpen = () => {
        if (isMaxed) return;
        setIsOpen(true);
        setCustomDateTime('');
    };

    const handleAddFlexTime = async () => {
        if (!user || !userProfile) return;

        setLoading(true);
        setMessage('');

        try {
            const targetDate = customDateTime ? new Date(customDateTime) : undefined;
            const result = await addFlexTime(user.uid, userProfile.name, note || undefined, targetDate);
            setMessage(result.message);

            if (result.success) {
                setNote('');
                setCustomDateTime('');
                setIsOpen(false);
                onFlexTimeAdded();
            }
        } catch (error) {
            setMessage('Failed to add flex time. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateButtonClick = () => {
        dateInputRef.current?.showPicker();
    };

    const handleClearDate = () => {
        setCustomDateTime('');
    };

    const customDate = customDateTime ? new Date(customDateTime) : null;
    const isBackdated = customDate ? getWeekId(customDate) !== getWeekId() : false;

    return (
        <div className="add-flex-time">
            {!isOpen ? (
                <button
                    className={`add-button ${isMaxed ? 'disabled' : ''}`}
                    onClick={handleOpen}
                    disabled={isMaxed}
                >
                    {isMaxed ? '🎉 Max Reached!' : `+ Add ${FLEX_TIME_INCREMENT} Minutes`}
                </button>
            ) : (
                <div className="add-modal">
                    <div className="modal-content">
                        <h3>Add Flex Time</h3>
                        <p className="modal-subtitle">
                            Adding {FLEX_TIME_INCREMENT} minutes of flex time
                        </p>

                        <label className="note-label">
                            <span>Why are they earning this?</span>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g., Great job on homework!"
                                rows={2}
                                required
                            />
                        </label>

                        <div className="datetime-picker-section">
                            <div className="datetime-row">
                                {customDateTime ? (
                                    <span className="datetime-display">
                                        {formatDisplayDateTime(customDateTime)}
                                    </span>
                                ) : (
                                    <span className="datetime-placeholder">Specify a date</span>
                                )}
                                <div className="datetime-actions">
                                    {customDateTime && (
                                        <button
                                            type="button"
                                            className="datetime-clear-btn"
                                            onClick={handleClearDate}
                                            title="Clear date"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="datetime-picker-btn"
                                        onClick={handleDateButtonClick}
                                        title="Pick date and time"
                                    >
                                        ⌚
                                    </button>
                                </div>
                                <input
                                    ref={dateInputRef}
                                    type="datetime-local"
                                    value={customDateTime}
                                    onChange={(e) => setCustomDateTime(e.target.value)}
                                    className="datetime-input-hidden"
                                />
                            </div>
                            {isBackdated && (
                                <p className="datetime-week-info">
                                    This will be added to week of {getWeekId(customDate!)}
                                </p>
                            )}
                        </div>

                        {message && <p className="message">{message}</p>}

                        <div className="modal-buttons">
                            <button
                                className="cancel-button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setNote('');
                                    setMessage('');
                                    setCustomDateTime('');
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-button"
                                onClick={handleAddFlexTime}
                                disabled={loading || !note.trim()}
                            >
                                {loading ? 'Adding...' : 'Add Flex Time'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
