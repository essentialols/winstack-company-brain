import Link from 'next/link';
import { MarketingShell } from '@/components/brain/MarketingShell';

export const metadata = {
  title: 'Pricing · Outside-In Brain',
  description: 'Start free, upgrade when your brain gets busy.',
};

const FAQ = [
  {
    q: 'What counts as a save?',
    a: 'One click in the extension, or one paste on the site. A save can be a page, a video, a PDF, a post or a bit of highlighted text.',
  },
  { q: 'Does it read my browsing?', a: 'No. It only sees what you click save on. Nothing is collected in the background.' },
  {
    q: 'What is a brain?',
    a: 'A folder of saves with its own schedule. Keep one for "AI tooling" on Mondays and another for "Design" on Thursdays, for example.',
  },
  {
    q: 'Can I just listen?',
    a: 'Yes. On Pro, set your format to podcast only and each issue arrives as the two-voice episode.',
  },
] as const;

const Check = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: '.35rem' }}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const Features = ({ items, color }: { items: readonly string[]; color: string }) => (
  <ul style={{ listStyle: 'none', margin: '1.25rem 0 1.5rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '.5rem', flex: 1 }}>
    {items.map((item) => (
      <li key={item} style={{ display: 'flex', gap: '.6rem', fontSize: '1rem', lineHeight: 1.5 }}>
        <Check color={color} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const priceStyle = { margin: '.5rem 0 0', fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '2.4rem', lineHeight: 1 };

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="oib-col" style={{ paddingTop: '4rem', paddingBottom: '2.5rem' }}>
        <p className="oib-eyebrow" style={{ marginBottom: '1rem' }}>
          Pricing
        </p>
        <h1 className="oib-hero" style={{ marginBottom: '1.25rem' }}>
          Pay for the hours you get back
        </h1>
        <p className="oib-lead">
          Save what you find with one click. Once or twice a week, get five takeaways and a short two-voice podcast
          instead of a pile of open tabs. Start free, upgrade when your brain gets busy.
        </p>
      </section>

      <section aria-label="Plans" className="oib-wide" style={{ paddingBottom: '4rem', display: 'flex', flexWrap: 'wrap', gap: '1.75rem', alignItems: 'stretch' }}>
        <article style={{ flex: '1 1 16rem', display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--fg)', padding: '1.25rem .25rem 0' }}>
          <h2 className="oib-h2s">Free</h2>
          <p style={priceStyle}>$0</p>
          <p className="oib-muted" style={{ marginTop: '.5rem' }}>
            For trying it out
          </p>
          <Features color="var(--accent)" items={['1 brain', 'Up to [N] saves a week', 'Weekly issue', 'Read only', 'Delivered by email']} />
          <Link href="/login?tab=signup" className="oib-pill" style={{ alignSelf: 'flex-start' }}>
            Start free
          </Link>
        </article>

        <article className="oib-ink" style={{ flex: '1 1 16rem', display: 'flex', flexDirection: 'column', borderRadius: 8, padding: '1.4rem 1.4rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
            <h2 className="oib-h2s">Pro</h2>
            <span className="oib-eyebrow" style={{ color: 'var(--accent-on-ink)' }}>
              Most picked
            </span>
          </div>
          <p style={priceStyle}>
            [PRICE]
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--on-ink-muted)' }}> /month</span>
          </p>
          <p style={{ marginTop: '.5rem', color: 'var(--on-ink-muted)' }}>For one busy reader</p>
          <Features
            color="var(--accent-on-ink)"
            items={['Unlimited saves and brains', 'Issues once or twice a week', 'Two-voice podcast with chapters', 'Email and in-app delivery']}
          />
          <Link href="/login?tab=signup" className="oib-btn oib-primary-ink" style={{ alignSelf: 'flex-start' }}>
            Get Pro
          </Link>
        </article>

        <article style={{ flex: '1 1 16rem', display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--fg)', padding: '1.25rem .25rem 0' }}>
          <h2 className="oib-h2s">Household &amp; Team</h2>
          <p style={priceStyle}>
            [PRICE]
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--muted)' }}> /seat/month</span>
          </p>
          <p className="oib-muted" style={{ marginTop: '.5rem' }}>
            For partners and teams
          </p>
          <Features
            color="var(--accent)"
            items={[
              'Everything in Pro',
              'Shared workspace with Owner, Admin and Member roles',
              'Each member picks format and delivery',
              'Your own domain and branding',
            ]}
          />
          <Link href="/login?tab=signup" className="oib-pill" style={{ alignSelf: 'flex-start' }}>
            Set up a workspace
          </Link>
        </article>
      </section>

      <section aria-labelledby="faq-h" className="oib-col" style={{ paddingBottom: '4rem' }}>
        <p className="oib-eyebrow" style={{ marginBottom: '.5rem' }}>
          Questions
        </p>
        <h2 id="faq-h" className="oib-h2" style={{ marginBottom: '1.25rem' }}>
          Before you sign up
        </h2>
        <div className="oib-rows">
          {FAQ.map((item, index) => (
            <details key={item.q}>
              <summary className="oib-sum">
                <span className="oib-num">{String(index + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--f-display)', fontWeight: 700 }}>{item.q}</span>
              </summary>
              <div className="oib-detail">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
