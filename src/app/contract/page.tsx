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
                <h2><span className="section-emoji">🎮</span> How Screen Time Works</h2>
                <ol>
                    <li>A kid <strong>asks a parent for screen time</strong>.</li>
                    <li>The parent <strong>verifies the chores as soon as they are able</strong>.</li>
                    <li>If every chore is done, the <strong>2-hour timer starts</strong> and games can be played.</li>
                    <li>If a chore is not done, the parent <strong>recommends the correction</strong>. The kid finishes that chore as quickly as possible and <strong>asks for a re-evaluation</strong>.</li>
                </ol>
                <p>The timer starts <strong>when the chores are verified</strong> &mdash; not when you asked, and not while a chore is still being fixed.</p>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">⏰</span> When Screen Time Ends</h2>
                <ul>
                    <li><strong>School nights</strong> (a night before a school day): screens off at <strong>8:30 PM</strong></li>
                    <li><strong>Non-school nights</strong> (a night before a day off): screens off at <strong>9:30 PM</strong></li>
                </ul>
                <p>The 2 hours never runs past the cutoff, so <strong>a late start means less screen time</strong>:</p>
                <ul>
                    <li>Verified after <strong>6:30 PM on a school night</strong> &rarr; less than 2 hours</li>
                    <li>Verified after <strong>7:30 PM on a non-school night</strong> &rarr; less than 2 hours</li>
                </ul>
                <p>Getting chores done early is the only way to get the full two hours.</p>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">✅</span> Chores Checked Before Screen Time</h2>
                <p>All of the following must be completed <strong>by everyone</strong> before any screens are touched. If one person hasn&apos;t finished, nobody gets screen time:</p>
                <p><strong>Every day:</strong></p>
                <ul>
                    <li>The projector room must be clean</li>
                    <li>All bedrooms must be clean</li>
                    <li>The living room must be clean</li>
                    <li>The dining room must be clean</li>
                    <li>The downstairs bathrooms must be tidy</li>
                </ul>
                <p><strong>On certain days:</strong></p>
                <ul>
                    <li><strong>Tuesday, Thursday, and Sunday:</strong> showers must be taken</li>
                    <li><strong>Thursday night:</strong> the trash goes out &mdash; every trash can in the house gets emptied and the cans go out to the curb</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">🦷</span> Teeth by 8:00 PM</h2>
                <ul>
                    <li>Teeth must be <strong>brushed and flossed at or before 8:00 PM</strong>, every night</li>
                    <li>This is its own deadline &mdash; it applies whether or not there is any screen time that night</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">📏</span> House Rules</h2>
                <ul>
                    <li><strong>All kids must complete their chores before anyone gets screen time.</strong> You succeed together or you fail together &mdash; no one plays until everyone is done.</li>
                    <li>Everyone goes on a walk</li>
                    <li>Parents are required to be helpful and not adversarial (no devil&apos;s bargains)</li>
                    <li>Parents check chores &mdash; and re-checks after a correction &mdash; as soon as they are able, so no one loses time waiting</li>
                </ul>
            </section>

            <section className="contract-section">
                <h2><span className="section-emoji">⭐</span> Flex Time Rules</h2>
                <ul>
                    <li><strong>10 minutes</strong> of flex time for each bonus</li>
                    <li>All flex time is <strong>shared</strong> between all children</li>
                    <li>Flex time is capped at <strong>2 hours</strong> per week</li>
                    <li>Flex time is used <strong>10:00 AM &ndash; 12:00 PM</strong> on either Saturday or Sunday, decided by a popular vote of the kids</li>
                    <li>If you earn 2 hours of flex time for <strong>2 weeks in a row</strong>, you can negotiate flexibility in this contract</li>
                    <li>All flexibility requests must be made at least <strong>12 hours in advance</strong></li>
                </ul>
            </section>
        </div>
    );
}
