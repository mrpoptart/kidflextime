'use client';

import { MAX_FLEX_TIME_PER_WEEK, formatMinutes } from '@/lib/flex-time';

interface FlexTimeBalanceProps {
    balance: number;
    showMax?: boolean;
    /** What this balance IS — the pages use it to say which weekend it pays out on */
    label?: string;
    caption?: string;
}

export default function FlexTimeBalance({
    balance,
    showMax = true,
    label = 'Flex Time Available',
    caption
}: FlexTimeBalanceProps) {
    const percentage = (balance / MAX_FLEX_TIME_PER_WEEK) * 100;
    const isMaxed = balance >= MAX_FLEX_TIME_PER_WEEK;

    return (
        <div className="flex-time-balance">
            <div className="balance-header">
                <span className="balance-label">{label}</span>
                <span className="balance-value">
                    {formatMinutes(balance)}
                    {showMax && <span className="balance-max"> / {formatMinutes(MAX_FLEX_TIME_PER_WEEK)}</span>}
                </span>
            </div>

            <div className="progress-container">
                <div
                    className={`progress-bar ${isMaxed ? 'maxed' : ''}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {caption && <p className="balance-caption">{caption}</p>}

            {isMaxed && (
                <div className="maxed-badge">
                    ⭐ MAX ACHIEVED! ⭐
                </div>
            )}
        </div>
    );
}
