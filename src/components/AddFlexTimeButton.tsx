'use client';

import { useState } from 'react';
import { addFlexTime, FLEX_TIME_INCREMENT, MAX_FLEX_TIME_PER_WEEK } from '@/lib/flex-time';
import { useAuth } from '@/lib/auth-context';

interface AddFlexTimeButtonProps {
    currentBalance: number;
    onFlexTimeAdded: () => void;
}

export default function AddFlexTimeButton({ currentBalance, onFlexTimeAdded }: AddFlexTimeButtonProps) {
    const { user, userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const isMaxed = currentBalance >= MAX_FLEX_TIME_PER_WEEK;

    const handleAddFlexTime = async () => {
        if (!user || !userProfile) return;

        setLoading(true);
        setMessage('');

        try {
            const result = await addFlexTime(user.uid, userProfile.name, note || undefined);
            setMessage(result.message);

            if (result.success) {
                setNote('');
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

    return (
        <div className="add-flex-time">
            {!isOpen ? (
                <button
                    className={`add-button ${isMaxed ? 'disabled' : ''}`}
                    onClick={() => !isMaxed && setIsOpen(true)}
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

                        {message && <p className="message">{message}</p>}

                        <div className="modal-buttons">
                            <button
                                className="cancel-button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setNote('');
                                    setMessage('');
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
