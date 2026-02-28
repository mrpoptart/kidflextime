'use client';

import { useState } from 'react';
import { addFlexTime, getWeekId, FLEX_TIME_INCREMENT, MAX_FLEX_TIME_PER_WEEK } from '@/lib/flex-time';
import { useAuth } from '@/lib/auth-context';

interface AddFlexTimeButtonProps {
    currentBalance: number;
    onFlexTimeAdded: () => void;
}

function formatLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AddFlexTimeButton({ currentBalance, onFlexTimeAdded }: AddFlexTimeButtonProps) {
    const { user, userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [useCustomDate, setUseCustomDate] = useState(false);
    const [customDateTime, setCustomDateTime] = useState('');

    const isMaxed = currentBalance >= MAX_FLEX_TIME_PER_WEEK;

    const handleOpen = () => {
        if (isMaxed) return;
        setIsOpen(true);
        setUseCustomDate(false);
        setCustomDateTime(formatLocalDateTime(new Date()));
    };

    const handleAddFlexTime = async () => {
        if (!user || !userProfile) return;

        setLoading(true);
        setMessage('');

        try {
            const targetDate = useCustomDate ? new Date(customDateTime) : undefined;
            const result = await addFlexTime(user.uid, userProfile.name, note || undefined, targetDate);
            setMessage(result.message);

            if (result.success) {
                setNote('');
                setUseCustomDate(false);
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

    const customDate = useCustomDate && customDateTime ? new Date(customDateTime) : null;
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
                            <span>Why are they earning this? (optional)</span>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g., Great job on homework!"
                                rows={2}
                            />
                        </label>

                        <div className="datetime-picker-section">
                            <label className="datetime-toggle">
                                <input
                                    type="checkbox"
                                    checked={useCustomDate}
                                    onChange={(e) => setUseCustomDate(e.target.checked)}
                                />
                                <span>Change date & time</span>
                            </label>

                            {useCustomDate && (
                                <div className="datetime-input-wrapper">
                                    <input
                                        type="datetime-local"
                                        value={customDateTime}
                                        onChange={(e) => setCustomDateTime(e.target.value)}
                                        className="datetime-input"
                                    />
                                    {isBackdated && (
                                        <p className="datetime-week-info">
                                            This will be added to week of {getWeekId(customDate!)}
                                        </p>
                                    )}
                                </div>
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
                                    setUseCustomDate(false);
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-button"
                                onClick={handleAddFlexTime}
                                disabled={loading}
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
