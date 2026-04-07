import Link from 'next/link';

export default function ContractPage() {
    return (
        <div className="contract-page">
            <Link href="/" className="back-link">← Home</Link>

            <div className="contract-header">
                <div className="contract-icon">📜</div>
                <h1>The Screen Time Contract</h1>
                <p className="contract-subtitle">The agreement between kids and parents</p>
            </div>

            <section className="contract-section">
                <h2><span className="section-emoji">📅</span> Screen Time Schedule</h2>
                <ul>
                    <li><strong>Daily Screen Time:</strong> 7:30 PM &ndash; 9:30 PM, every day of the week</li>
                    <li><strong>Flex Time:</strong> 10:00 AM &ndash; 12:00 PM on either Saturday or Sunday, decided by a popular vote the Friday before</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">✅</span> Required Tasks Before Screen Time</h2>
                <p>All of the following must be completed <strong>by everyone</strong> before any screens are touched. If one person hasn&apos;t finished, nobody gets screen time:</p>
                <ul>
                    <li>Teeth must be brushed and flossed</li>
                    <li>The projector room must be clean</li>
                    <li>All bedrooms must be clean</li>
                    <li>The living room must be clean</li>
                    <li>The dining room must be clean</li>
                    <li>The downstairs bathrooms must be tidy</li>
                    <li><strong>On Tuesday, Thursday, and Sunday:</strong> showers must be taken</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">📏</span> Screen Time Rules</h2>
                <ul>
                    <li>All chores must be done before the screens are touched</li>
                    <li><strong>All kids must complete their chores before anyone gets screen time.</strong> You succeed together or you fail together &mdash; no one plays until everyone is done.</li>
                    <li>Everyone goes on a walk</li>
                    <li>Parents are required to be helpful and not adversarial (no devil&apos;s bargains)</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">⭐</span> Flex Time Rules</h2>
                <ul>
                    <li><strong>10 minutes</strong> of flex time for each bonus</li>
                    <li>All flex time is <strong>shared</strong> between all children</li>
                    <li>Flex time is capped at <strong>2 hours</strong> per week</li>
                    <li>If you earn 2 hours of flex time for <strong>2 weeks in a row</strong>, you can negotiate flexibility in this contract</li>
                    <li>All flexibility requests must be made at least <strong>12 hours in advance</strong></li>
                </ul>
            </section>
        </div>
    );
}
