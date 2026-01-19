'use client';

import { useEffect, useState } from 'react';

interface StreakCelebrationProps {
    streakCount: number;
    show: boolean;
}

export default function StreakCelebration({ streakCount, show }: StreakCelebrationProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (show) {
            setIsAnimating(true);
        }
    }, [show]);

    if (!show) return null;

    return (
        <div className={`streak-celebration ${isAnimating ? 'animate' : ''}`}>
            <div className="celebration-content">
                <div className="trophy">🏆</div>
                <h2 className="celebration-title">AMAZING STREAK!</h2>
                <p className="streak-count">
                    {streakCount} weeks of maxed flex time!
                </p>
                <p className="celebration-message">
                    You&apos;ve earned <strong>EXTRA PERMISSIONS!</strong>
                </p>
                <div className="confetti">
                    {[...Array(20)].map((_, i) => (
                        <span key={i} className="confetti-piece" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][i % 5]
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
