'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { IssueDto } from '@app-starter/shared';
import { IssueView } from '@/components/brain/IssueView';

const STORAGE_KEY = 'oib-demo-issue';

/** The issue built on /demo. Read from this tab first, then from the server. */
const DemoIssuePage = () => {
  const [issue, setIssue] = useState<IssueDto | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setIssue(JSON.parse(stored) as IssueDto);
        return;
      }
    } catch {
      /* fall through to the server copy */
    }
    fetch('/api/demo/issue', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<IssueDto>) : Promise.reject(new Error('missing'))))
      .then(setIssue)
      .catch(() => setIsMissing(true));
  }, []);

  if (isMissing) {
    return (
      <div className="oib">
        <main className="oib-col" style={{ paddingTop: '4rem' }}>
          <h1 className="oib-h1">No issue yet</h1>
          <p className="oib-lead" style={{ margin: '1rem 0 1.5rem' }}>
            Save a few things in the demo brain, then build the issue.
          </p>
          <Link href="/demo" className="oib-primary">
            Go to the demo brain
          </Link>
        </main>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="oib">
        <main className="oib-col" style={{ paddingTop: '4rem' }}>
          <p className="oib-muted">Loading the issue…</p>
        </main>
      </div>
    );
  }

  return (
    <IssueView
      issue={issue}
      badge="Demo"
      backHref="/demo"
      backLabel="Demo brain"
      footer={
        <>
          <span className="oib-eyebrow" style={{ fontSize: '.74rem' }}>
            Built from your demo saves
          </span>
          <Link href="/demo" className="oib-primary">
            Add more and rebuild
          </Link>
        </>
      }
    />
  );
};

export default DemoIssuePage;
