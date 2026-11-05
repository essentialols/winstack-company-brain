import { Fragment } from 'react';
import Link from 'next/link';
import { MarketingShell } from '@/components/brain/MarketingShell';

export const metadata = {
  title: 'How it works · Outside-In Brain',
  description: 'From one click to a Saturday brief: each stage of the pipeline and what it runs on.',
};

const STAGES = [
  { n: '01', title: 'Capture', body: 'You click save in the Chrome extension, or paste a link or text on the site.' },
  {
    n: '02',
    title: 'Store',
    body: 'The app API saves the item and its raw text: the article body, video captions or what you pasted.',
  },
  {
    n: '03',
    title: 'Wait',
    body: 'Saves collect in Triggerware tables, one set per brain. Nothing is processed one by one.',
  },
  {
    n: '04',
    title: 'Digest',
    body: 'A scheduled Triggerware trigger fires. An agent on Claude groups the saves and writes the issue and a two-host script. Text-to-speech renders the two voices.',
  },
  {
    n: '05',
    title: 'Deliver',
    body: "The issue goes out by email and in the app, following each member's own settings.",
  },
] as const;

const LAYERS = [
  ['Browser extension', 'Chrome, Manifest V3', 'your browser'],
  ['Web app', 'app-starter · Next.js', 'Vercel'],
  ['API, sign-in, workspaces, notifications', 'app-starter · NestJS + Prisma', 'Railway'],
  ['Database', 'Postgres', 'Supabase'],
  ['Cache and queues', 'Redis', 'Railway'],
  ['Pipeline: tables, triggers, agent', 'Triggerware server + SDK', 'Railway'],
  ['Writing', 'Claude API', 'Anthropic'],
  ['Voices', 'text-to-speech, two voices', '[TTS PROVIDER]'],
  ['Email', 'app-starter mailer', '[EMAIL PROVIDER]'],
] as const;

const cellStyle = { padding: '.75rem 1rem', borderBottom: '1px solid var(--rule)', textAlign: 'left' as const };

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <section className="oib-col" style={{ paddingTop: '4rem', paddingBottom: '2.5rem' }}>
        <p className="oib-eyebrow" style={{ marginBottom: '1rem' }}>
          How it works
        </p>
        <h1 className="oib-hero" style={{ marginBottom: '1.25rem' }}>
          From one click to a Saturday brief
        </h1>
        <p className="oib-lead">
          You save things whenever you find them. Nothing happens to them right away. When your issue is due, one
          scheduled run reads the whole pile, groups what belongs together, and writes your five takeaways and a
          two-host podcast. Here is each stage and what it runs on.
        </p>
      </section>

      <section aria-labelledby="pipe-h" className="oib-wide" style={{ paddingBottom: '3.5rem' }}>
        <h2 id="pipe-h" className="oib-h2s" style={{ marginBottom: '1rem' }}>
          The pipeline, in five stages
        </h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '.75rem' }}>
          {STAGES.map((stage, index) => (
            <Fragment key={stage.n}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--muted)' }}
                >
                  →
                </li>
              )}
              <li style={{ flex: '1 1 10rem', minWidth: 0, border: '1px solid var(--rule)', borderRadius: 8, padding: '1.1rem 1rem' }}>
                <span className="oib-num" style={{ display: 'block', fontSize: '1rem' }}>
                  {stage.n}
                </span>
                <h3 style={{ fontSize: '1.15rem', margin: '.35rem 0 .4rem' }}>{stage.title}</h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.5 }}>{stage.body}</p>
              </li>
            </Fragment>
          ))}
        </ol>
      </section>

      <section aria-labelledby="where-h" className="oib-wide" style={{ paddingBottom: '3.5rem' }}>
        <h2 id="where-h" className="oib-h2s" style={{ marginBottom: '1rem' }}>
          What runs where
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '32rem', borderCollapse: 'collapse', fontSize: '1rem', lineHeight: 1.5 }}>
            <thead>
              <tr>
                {['Layer', 'Built with', 'Runs on'].map((heading) => (
                  <th key={heading} scope="col" className="oib-eyebrow" style={{ ...cellStyle, fontFamily: 'var(--f-display)', fontWeight: 700 }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAYERS.map(([layer, builtWith, runsOn]) => (
                <tr key={layer} className="oib-row">
                  <th scope="row" style={{ ...cellStyle, fontFamily: 'var(--f-display)', fontWeight: 600 }}>
                    {layer}
                  </th>
                  <td style={cellStyle}>{builtWith}</td>
                  <td style={{ ...cellStyle, fontFamily: 'var(--f-mono)', fontSize: '.85rem', color: 'var(--muted)' }}>{runsOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="built-h" className="oib-wide" style={{ paddingBottom: '3.5rem' }}>
        <h2 id="built-h" className="oib-h2s" style={{ marginBottom: '1rem' }}>
          Built on
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ flex: '1 1 18rem', minWidth: 0, borderTop: '2px solid var(--fg)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Digo app-starter</h3>
            <p className="oib-meta" style={{ margin: '.35rem 0 .75rem' }}>
              <a href="https://github.com/digohq/app-starter" target="_blank" rel="noopener noreferrer">
                github.com/digohq/app-starter
              </a>
            </p>
            <p>
              The app around the brain. It gives us the Next.js web app, the NestJS and Prisma API, sign-in by email
              code or Google, workspaces with Owner, Admin and Member roles, and email plus in-app notifications.
              That left our time for the part that is new: saving and the digest.
            </p>
          </div>
          <div style={{ flex: '1 1 18rem', minWidth: 0, borderTop: '2px solid var(--fg)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Triggerware SDKs</h3>
            <p className="oib-meta" style={{ margin: '.35rem 0 .75rem' }}>
              <a href="https://github.com/triggerware/tw2-sdks" target="_blank" rel="noopener noreferrer">
                github.com/triggerware/tw2-sdks
              </a>
            </p>
            <p>
              The pipeline. Saves land in Triggerware tables, and a scheduled trigger fires at each brain&apos;s
              delivery time. That run hands the pile to the agent, which writes the issue and the podcast script. No
              item is processed on its own.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="priv-h" className="oib-col" style={{ paddingBottom: '3.5rem' }}>
        <div style={{ background: 'var(--chip)', borderRadius: 10, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <h2 id="priv-h" className="oib-h2s">
              Privacy
            </h2>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>Saves happen only when you click. Nothing is captured automatically.</li>
            <li>The extension never reads pages you do not save.</li>
            <li>Workspaces are private to their members.</li>
          </ul>
        </div>
      </section>

      <section className="oib-ink">
        <div
          className="oib-wide"
          style={{ paddingTop: '3rem', paddingBottom: '3rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem' }}
        >
          <p style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '1.5rem' }}>
            See what a finished issue looks like.
          </p>
          <Link href="/sample-issue" className="oib-btn oib-primary-ink">
            Open the sample issue
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
