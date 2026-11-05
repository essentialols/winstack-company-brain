'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import type { BrainDto, UserOrganization } from '@app-starter/shared';
import { BrandLink } from './BrandMark';
import { logout } from '@/lib/auth-utils';

interface BrainSidebarProps {
  organization: UserOrganization;
  organizations: UserOrganization[];
  onSelectOrganization: (id: string) => void;
  brains: BrainDto[];
  currentBrainId: string | null;
  onSelectBrain: (id: string) => void;
  onCreateBrain: (name: string) => Promise<void>;
  isCreatingBrain: boolean;
}

const ROLE_LABEL: Record<string, string> = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member' };

/** Left rail of the brain inbox (Dashboard.dc.html). */
export const BrainSidebar = ({
  organization,
  organizations,
  onSelectOrganization,
  brains,
  currentBrainId,
  onSelectBrain,
  onCreateBrain,
  isCreatingBrain,
}: BrainSidebarProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await onCreateBrain(name);
    setNewName('');
    setIsAdding(false);
  };

  return (
    <aside className="oib-side" aria-label="Workspace navigation">
      <BrandLink />

      <div style={{ padding: '.75rem .5rem', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
        <div className="oib-meta">WORKSPACE</div>
        {organizations.length > 1 ? (
          <>
            <label htmlFor="workspace-select" className="oib-sr">
              Workspace
            </label>
            <select
              id="workspace-select"
              className="oib-select"
              style={{ margin: '.35rem 0', width: '100%' }}
              value={organization.id}
              onChange={(event) => onSelectOrganization(event.target.value)}
            >
              {organizations.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.05rem', margin: '.25rem 0' }}>
            {organization.name}
          </div>
        )}
        <div className="oib-meta">you&apos;re {ROLE_LABEL[organization.role] ?? organization.role}</div>
      </div>

      <nav aria-label="Brains and workspace" className="oib-sidenav">
        <div className="oib-meta" style={{ padding: '0 .5rem .35rem' }}>
          BRAINS
        </div>
        {brains.map((brain) => (
          <button
            key={brain.id}
            type="button"
            className="oib-sidelink"
            aria-current={brain.id === currentBrainId ? 'page' : undefined}
            onClick={() => onSelectBrain(brain.id)}
          >
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brain.name}</span>
            {brain.pendingSaveCount > 0 && (
              <span className="oib-meta" aria-label={`${brain.pendingSaveCount} waiting`}>
                {brain.pendingSaveCount}
              </span>
            )}
          </button>
        ))}
        {isAdding ? (
          <form onSubmit={handleCreate} style={{ padding: '.35rem .25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <label htmlFor="new-brain-name" className="oib-label" style={{ marginBottom: 0 }}>
              New brain name
            </label>
            <input
              id="new-brain-name"
              className="oib-input"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Design"
              maxLength={80}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button type="submit" className="oib-primary" disabled={isCreatingBrain || !newName.trim()}>
                {isCreatingBrain ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="oib-pill" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="oib-sidelink" style={{ color: 'var(--muted)' }} onClick={() => setIsAdding(true)}>
            + New brain
          </button>
        )}

        <div className="oib-meta" style={{ padding: '1rem .5rem .35rem' }}>
          WORKSPACE
        </div>
        <a href="#issues" className="oib-sidelink">
          All issues
        </a>
        <Link href={`/organizations/${organization.id}/settings`} className="oib-sidelink">
          Members
        </Link>
        <Link href="/settings/notifications" className="oib-sidelink">
          Notifications
        </Link>
        <Link href="/settings" className="oib-sidelink">
          Settings
        </Link>
        <button type="button" className="oib-sidelink" style={{ color: 'var(--muted)' }} onClick={() => void logout()}>
          Sign out
        </button>
      </nav>

      <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: '1rem' }}>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '.95rem', marginBottom: '.35rem' }}>
          Get the extension
        </div>
        <p className="oib-muted" style={{ margin: '0 0 .5rem', fontSize: '.95rem', lineHeight: 1.5 }}>
          Save any page with one click. Nothing is saved unless you click.
        </p>
        <Link href="/extension" className="oib-btn" style={{ fontWeight: 600, fontSize: '.9rem' }}>
          Connect the extension
        </Link>
      </div>
    </aside>
  );
};
