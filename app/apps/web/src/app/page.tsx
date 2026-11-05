import Link from 'next/link';
import { MarketingShell } from '@/components/brain/MarketingShell';

export const metadata = {
  title: 'Outside-In Brain',
  description:
    'Save anything while you browse. Once or twice a week, get five takeaways and a two-voice podcast.',
};

const STEPS = [
  {
    lead: 'Click save on anything.',
    line: 'The extension button works on the page you are on.',
    heading: 'Articles, videos, PDFs, posts, highlights',
    body: 'Save an article, a YouTube video, a podcast page, a PDF, a social post, or just the text you highlighted. For videos, captions are pulled from the page, so the brain has the words, not only the link. You can pick a folder like "AI tooling" or leave it in the main brain.',
  },
  {
    lead: 'Or paste it.',
    line: 'No extension needed on your phone or a work laptop.',
    heading: 'A link or raw text, on the site',
    body: 'Open your brain on the website and paste a link, or paste any text: meeting notes, a newsletter, a thread someone sent you. It is saved the same way as a click from the extension.',
  },
  {
    lead: 'It waits in your brain.',
    line: 'Nothing pings you after each save.',
    heading: 'Saves pile up quietly',
    body: 'Items are not processed one by one. They collect until your next issue is due, so the digest can see everything together and connect what belongs together.',
  },
  {
    lead: 'Your issue arrives once or twice a week.',
    line: 'You choose the day and time.',
    heading: 'Five takeaways and a two-voice podcast',
    body: 'An agent groups related saves into five takeaways. Each one unfolds into about a page of detail, with "What to do with this" and links back to what you saved. It also writes a conversation for two voices: an interviewer asks, an analyst answers. You get it by email, in the app, or both.',
  },
] as const;

const HeroVisual = () => (
  <div aria-hidden="true" style={{ flex: '1 1 20rem', minWidth: 0, position: 'relative', padding: '2.25rem 0 1rem' }}>
    <div
      style={{
        border: '1px solid var(--box-line)',
        borderRadius: 10,
        background: 'var(--bg)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.6rem',
          padding: '.6rem .75rem',
          background: 'var(--box)',
          borderBottom: '1px solid var(--box-line)',
        }}
      >
        <div style={{ display: 'flex', gap: '.35rem' }}>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--box-line)', display: 'block' }}
            />
          ))}
        </div>
        <div
          className="oib-meta"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'var(--bg)',
            border: '1px solid var(--rule)',
            borderRadius: 999,
            padding: '.3rem .75rem',
            letterSpacing: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          youtube.com/watch?v=…
        </div>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 28 28">
            <path d="M8 11h12M8 15h8M8 19h5" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div style={{ padding: '1rem' }}>
        <div
          style={{
            aspectRatio: '16/9',
            borderRadius: 6,
            background: 'var(--hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M10 8l6 4-6 4z" />
          </svg>
        </div>
        <div style={{ height: 14, width: '80%', borderRadius: 4, background: 'var(--box)', margin: '1rem 0 .55rem' }} />
        <div style={{ height: 10, width: '45%', borderRadius: 4, background: 'var(--hover)', marginBottom: '.4rem' }} />
        <div style={{ height: 10, width: '60%', borderRadius: 4, background: 'var(--hover)' }} />
      </div>
    </div>
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 'min(15rem, 78%)',
        background: 'var(--bg)',
        border: '1px solid var(--box-line)',
        borderRadius: 10,
        padding: '.9rem 1rem',
        boxShadow: '0 6px 18px rgba(0,0,0,.10)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.7rem' }}>
        <svg width="20" height="20" viewBox="0 0 28 28">
          <rect x="2" y="2" width="24" height="24" rx="7" fill="var(--fg)" />
          <path d="M8 11h12M8 15h8M8 19h5" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '.85rem' }}>Outside-In Brain</span>
      </div>
      <div className="oib-ok" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
        Saved to AI tooling
      </div>
      <div className="oib-eyebrow" style={{ marginTop: '.6rem', fontSize: '.68rem' }}>
        Video · captions pulled
      </div>
    </div>
  </div>
);

export default function HomePage() {
  return (
    <MarketingShell>
      <section
        className="oib-wide"
        style={{ paddingTop: '4rem', paddingBottom: '3.5rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center' }}
      >
        <div style={{ flex: '1 1 22rem', minWidth: 0 }}>
          <p className="oib-eyebrow" style={{ marginBottom: '1rem' }}>
            Save anything · hear it later
          </p>
          <h1 className="oib-hero" style={{ marginBottom: '1.25rem' }}>
            Save it while you browse. Get the brief on Saturday.
          </h1>
          <p className="oib-lead" style={{ marginBottom: '2rem', maxWidth: '34rem' }}>
            One click in the Chrome extension saves the article, video or post you are looking at. Or paste a
            link or any text on the site. On your schedule, everything you saved comes back as one issue: five
            takeaways you can unfold, plus a podcast with two hosts talking it through.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.75rem 1rem' }}>
            <Link href="/extension" className="oib-primary oib-primary-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add to Chrome
            </Link>
            <Link href="/dashboard" className="oib-pill">
              Paste a link instead
            </Link>
            <Link href="/sample-issue" className="oib-btn" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              See a sample issue
            </Link>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section aria-labelledby="steps-h" className="oib-col" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <p className="oib-eyebrow" style={{ marginBottom: '.5rem' }}>
          How it works
        </p>
        <h2 id="steps-h" className="oib-h2" style={{ marginBottom: '1.5rem' }}>
          How it works, in four steps
        </h2>
        <div className="oib-rows">
          {STEPS.map((step, index) => (
            <details key={step.lead}>
              <summary className="oib-sum">
                <span className="oib-num">{index + 1}</span>
                <span style={{ flex: 1, minWidth: 0, lineHeight: 1.55 }}>
                  <strong style={{ fontWeight: 600 }}>{step.lead}</strong> {step.line}
                </span>
                <span className="oib-eyebrow" style={{ flex: '0 0 auto', fontSize: '.72rem' }}>
                  Details
                </span>
              </summary>
              <div className="oib-detail">
                <h3>{step.heading}</h3>
                <p>{step.body}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="Two ways to take in an issue" className="oib-wide" style={{ paddingTop: '1rem', paddingBottom: '3.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ flex: '1 1 18rem', minWidth: 0, background: 'var(--chip)', borderRadius: 10, padding: '1.75rem 1.5rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
              <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
            </svg>
            <h2 style={{ margin: '.75rem 0 .5rem', fontSize: '1.5rem' }}>Read it</h2>
            <p>
              Five TL;DR lines you can scan in a minute. Open the ones that matter for about a page of detail, a
              chart where it helps, and the saved sources it came from.
            </p>
          </div>
          <div className="oib-ink" style={{ flex: '1 1 18rem', minWidth: 0, borderRadius: 10, padding: '1.75rem 1.5rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-on-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
              <path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
            </svg>
            <h2 style={{ margin: '.75rem 0 .5rem', fontSize: '1.5rem' }}>Listen to it</h2>
            <p>
              About ten minutes of two hosts: an interviewer who asks the questions you would ask, and an analyst
              who has read everything you saved. Good for a walk or the commute.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-h" className="oib-col" style={{ paddingTop: '1rem', paddingBottom: '4rem' }}>
        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: '.2rem' }}>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <div>
            <h2 id="why-h" className="oib-h2s" style={{ marginBottom: '.5rem' }}>
              Why click, not automatic
            </h2>
            <p>
              The extension does not watch your browsing. Only what you choose to save leaves your browser, one
              click at a time. Everything else stays where it is.
            </p>
          </div>
        </div>
      </section>

      <section className="oib-ink">
        <div
          className="oib-wide"
          style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}
        >
          <h2 className="oib-h2" style={{ flex: '1 1 20rem' }}>
            Start a brain before your next tab spiral.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center' }}>
            <Link href="/extension" className="oib-btn oib-primary-ink">
              Add to Chrome
            </Link>
            <Link href="/sample-issue" className="oib-btn oib-pill-ink">
              See a sample issue
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
