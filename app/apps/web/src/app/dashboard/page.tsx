'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrainDto, CreateSaveInput, DigestFrequency } from '@app-starter/shared';
import { BrainSidebar } from '@/components/brain/BrainSidebar';
import { KindIcon } from '@/components/brain/KindIcon';
import { BrandLink } from '@/components/brain/BrandMark';
import { useCurrentOrganization } from '@/hooks/use-current-organization';
import { brainApi, DigestPreferencesDto, UpdateBrainInput } from '@/lib/brain-api';
import {
  deliveryLine,
  formatIssueSlot,
  formatListenMinutes,
  formatNextIssueDay,
  formatShortDate,
  isUrlOnly,
  saveMeta,
} from '@/lib/brain-format';
import type { ApiError } from '@/lib/api-client';

const PODCAST_LENGTHS = [5, 10, 15] as const;
const DEFAULT_TWICE_DAYS = [2, 6];

const errorMessage = (error: unknown): string =>
  (error as ApiError | undefined)?.message ?? 'Something went wrong. Please try again.';

/** When switching frequency keep the user's days where possible (ONCE uses deliveryDays[0]). */
const daysForFrequency = (brain: BrainDto, frequency: DigestFrequency): number[] => {
  if (frequency === 'ONCE') {
    return [brain.deliveryDays.includes(6) ? 6 : (brain.deliveryDays[0] ?? 6)];
  }
  if (brain.deliveryDays.length >= 2) return brain.deliveryDays;
  const first = brain.deliveryDays[0];
  return first !== undefined && !DEFAULT_TWICE_DAYS.includes(first)
    ? [first, first === 2 ? 6 : 2].sort((a, b) => a - b)
    : DEFAULT_TWICE_DAYS;
};

const browserTimezone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

const EditorialStatus = ({ children }: { children: React.ReactNode }) => (
  <div className="oib">
    <div className="oib-col" style={{ paddingTop: '1.25rem' }}>
      <BrandLink />
    </div>
    <main className="oib-col" style={{ paddingTop: '3rem' }}>
      {children}
    </main>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { organization, organizations, isLoading: isLoadingOrgs, selectOrganization } = useCurrentOrganization();
  const orgId = organization?.id ?? null;

  const [draft, setDraft] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const brainsQuery = useQuery({
    queryKey: ['brains', orgId],
    queryFn: () => brainApi.listBrains(orgId as string),
    enabled: !!orgId,
  });
  const brains = brainsQuery.data ?? [];
  const requestedBrainId = searchParams.get('brain');
  const brain = brains.find((candidate) => candidate.id === requestedBrainId) ?? brains[0] ?? null;
  const brainId = brain?.id ?? null;

  const savesQuery = useQuery({
    queryKey: ['saves', orgId, brainId, 'pending'],
    queryFn: () => brainApi.listSaves(orgId as string, brainId as string, { pending: true }),
    enabled: !!orgId && !!brainId,
  });
  const issuesQuery = useQuery({
    queryKey: ['issues', orgId, brainId],
    queryFn: () => brainApi.listIssues(orgId as string, brainId as string),
    enabled: !!orgId && !!brainId,
  });
  const prefsQuery = useQuery({
    queryKey: ['digest-preferences'],
    queryFn: () => brainApi.getDigestPreferences(),
  });

  const invalidateBrain = () => {
    void queryClient.invalidateQueries({ queryKey: ['brains', orgId] });
    void queryClient.invalidateQueries({ queryKey: ['saves', orgId, brainId] });
  };

  const createSave = useMutation({
    mutationFn: (input: CreateSaveInput) => brainApi.createSave(orgId as string, brainId as string, input),
    onSuccess: () => {
      setDraft('');
      setPasteError(null);
      setAnnouncement(`Saved to ${brain?.name ?? 'brain'}.`);
      invalidateBrain();
    },
    onError: (error) => setPasteError(errorMessage(error)),
  });

  const deleteSave = useMutation({
    mutationFn: (saveId: string) => brainApi.deleteSave(orgId as string, brainId as string, saveId),
    onSuccess: () => {
      setAnnouncement('Removed from brain.');
      invalidateBrain();
    },
    onError: (error) => setPasteError(errorMessage(error)),
  });

  const updateBrain = useMutation({
    mutationFn: (input: UpdateBrainInput) => brainApi.updateBrain(orgId as string, brainId as string, input),
    onSuccess: (updated) => {
      setSettingsError(null);
      queryClient.setQueryData<BrainDto[]>(['brains', orgId], (current) =>
        current?.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
    },
    onError: (error) => setSettingsError(errorMessage(error)),
  });

  const createBrain = useMutation({
    mutationFn: (name: string) => brainApi.createBrain(orgId as string, { name }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['brains', orgId] });
      router.replace(`/dashboard?brain=${created.id}`);
    },
    onError: (error) => setSettingsError(errorMessage(error)),
  });

  const updatePrefs = useMutation({
    mutationFn: (input: Partial<DigestPreferencesDto>) => brainApi.updateDigestPreferences(input),
    onMutate: (input) => {
      const previous = queryClient.getQueryData<DigestPreferencesDto>(['digest-preferences']);
      if (previous) queryClient.setQueryData(['digest-preferences'], { ...previous, ...input });
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['digest-preferences'], context.previous);
      setSettingsError(errorMessage(error));
    },
    onSuccess: (prefs) => queryClient.setQueryData(['digest-preferences'], prefs),
  });

  // Clear the screen-reader announcement so repeated actions are announced again.
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), 4000);
    return () => clearTimeout(timer);
  }, [announcement]);

  const handleSelectBrain = (id: string) => router.replace(`/dashboard?brain=${id}`);

  const handleSelectOrganization = (id: string) => {
    selectOrganization(id);
    router.replace('/dashboard');
  };

  const handlePaste = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) {
      setPasteError('Paste a link or some text first.');
      return;
    }
    createSave.mutate(isUrlOnly(value) ? { url: value } : { text: value });
  };

  const handleCreateBrain = async (name: string) => {
    await createBrain.mutateAsync(name);
  };

  if (isLoadingOrgs) {
    return (
      <EditorialStatus>
        <p className="oib-eyebrow" role="status">
          Loading your workspace…
        </p>
      </EditorialStatus>
    );
  }

  if (!organization) {
    return (
      <EditorialStatus>
        <p className="oib-eyebrow" style={{ marginBottom: '.75rem' }}>
          Welcome
        </p>
        <h1 className="oib-h1" style={{ marginBottom: '1rem' }}>
          Create a workspace to start your brain
        </h1>
        <p className="oib-lead" style={{ marginBottom: '1.5rem' }}>
          A workspace holds your brains and the people you share them with: just you, your household or your team.
        </p>
        <Link href="/organizations/create" className="oib-primary">
          Create a workspace
        </Link>
      </EditorialStatus>
    );
  }

  const saves = savesQuery.data ?? [];
  const issues = issuesQuery.data ?? [];
  const prefs = prefsQuery.data;
  const nextSlot = brain ? formatIssueSlot(brain.nextIssueAt) : null;
  const nextDay = brain ? formatNextIssueDay(brain.nextIssueAt) : null;
  const tz = browserTimezone();
  const latestIssue = issues[0];

  return (
    <div className="oib">
      <div className="oib-app">
        <BrainSidebar
          organization={organization}
          organizations={organizations}
          onSelectOrganization={handleSelectOrganization}
          brains={brains}
          currentBrainId={brainId}
          onSelectBrain={handleSelectBrain}
          onCreateBrain={handleCreateBrain}
          isCreatingBrain={createBrain.isPending}
        />

        <main className="oib-main">
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <p className="oib-sr" role="status" aria-live="polite">
              {announcement}
            </p>

            {brainsQuery.isLoading && (
              <p className="oib-eyebrow" role="status">
                Loading brains…
              </p>
            )}
            {brainsQuery.isError && (
              <p className="oib-error" role="alert">
                {errorMessage(brainsQuery.error)}
              </p>
            )}
            {!brainsQuery.isLoading && !brain && !brainsQuery.isError && (
              <p className="oib-lead">No brain yet. Use “+ New brain” to create one.</p>
            )}

            {brain && (
              <>
                <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="oib-eyebrow">Brain</div>
                    <h1 className="oib-h1" style={{ margin: '.3rem 0 .5rem' }}>
                      {brain.name}
                    </h1>
                    <div className="oib-eyebrow">
                      {brain.pendingSaveCount} saved since last issue
                      {nextSlot ? ` · next issue ${nextSlot}` : ''}
                    </div>
                  </div>
                  {latestIssue && (
                    <Link href={`/issues/${latestIssue.id}`} className="oib-primary">
                      Read latest issue
                    </Link>
                  )}
                </header>

                <section aria-labelledby="add-h" style={{ marginBottom: '3rem' }}>
                  <h2 id="add-h" className="oib-h2s" style={{ marginBottom: '.75rem' }}>
                    Add something
                  </h2>
                  <form onSubmit={handlePaste}>
                    <label htmlFor="add-text" className="oib-label">
                      Paste a link or any text
                    </label>
                    <textarea
                      id="add-text"
                      className="oib-textarea"
                      rows={3}
                      placeholder="https://… or paste notes, a quote, an article"
                      value={draft}
                      maxLength={200_000}
                      onChange={(event) => setDraft(event.target.value)}
                      aria-describedby={pasteError ? 'add-error' : undefined}
                      aria-invalid={pasteError ? true : undefined}
                    />
                    {pasteError && (
                      <p id="add-error" className="oib-error" role="alert" style={{ marginTop: '.5rem' }}>
                        {pasteError}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '.75rem' }}>
                      <button type="submit" className="oib-primary" disabled={createSave.isPending}>
                        {createSave.isPending ? 'Adding…' : 'Add to brain'}
                      </button>
                      <span className="oib-meta">Or click the extension on any page</span>
                    </div>
                  </form>
                </section>

                <section aria-labelledby="saved-h" style={{ marginBottom: '3rem' }}>
                  <h2 id="saved-h" className="oib-h2s" style={{ marginBottom: '.75rem' }}>
                    Waiting for the next issue
                  </h2>
                  {savesQuery.isLoading && (
                    <p className="oib-eyebrow" role="status">
                      Loading saves…
                    </p>
                  )}
                  {!savesQuery.isLoading && saves.length === 0 && (
                    <p className="oib-muted">Nothing saved since the last issue. Paste something above or use the extension.</p>
                  )}
                  {saves.length > 0 && (
                    <ul className="oib-rows">
                      {saves.map((save) => (
                        <li key={save.id} className="oib-row" style={{ display: 'flex', gap: '.9rem', alignItems: 'flex-start', padding: '.9rem .6rem' }}>
                          <span style={{ flex: '0 0 auto', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginTop: '.1rem' }}>
                            <KindIcon kind={save.kind} />
                          </span>
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                              {save.url ? (
                                <a href={save.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
                                  {save.title}
                                </a>
                              ) : (
                                save.title
                              )}
                            </div>
                            {(save.note || save.excerpt) && (
                              <div className="oib-muted" style={{ fontSize: '1rem', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {save.note || save.excerpt}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem', marginTop: '.35rem' }}>
                              <span className="oib-meta">{saveMeta(save)}</span>
                              {nextDay && <span className="oib-tag">Waiting for {nextDay}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="oib-iconbtn"
                            aria-label={`Remove “${save.title}” from brain`}
                            disabled={deleteSave.isPending && deleteSave.variables === save.id}
                            onClick={() => deleteSave.mutate(save.id)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label="Delivery settings" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '3rem' }}>
                  <div style={{ flex: '1 1 15rem', minWidth: 0 }}>
                    <h2 className="oib-h2s" style={{ marginBottom: '.75rem' }}>
                      Schedule
                    </h2>
                    <div role="group" aria-label="How often" className="oib-seg">
                      {(['ONCE', 'TWICE'] as const).map((frequency) => (
                        <button
                          key={frequency}
                          type="button"
                          aria-pressed={brain.frequency === frequency}
                          disabled={updateBrain.isPending}
                          onClick={() =>
                            brain.frequency !== frequency &&
                            updateBrain.mutate({ frequency, deliveryDays: daysForFrequency(brain, frequency) })
                          }
                        >
                          {frequency === 'ONCE' ? 'Once a week' : 'Twice a week'}
                        </button>
                      ))}
                    </div>
                    <p className="oib-muted" style={{ marginTop: '.75rem' }}>
                      {deliveryLine(brain)}
                    </p>
                    {tz && tz !== brain.timezone && (
                      <button type="button" className="oib-textbtn" onClick={() => updateBrain.mutate({ timezone: tz })}>
                        Use my timezone ({tz})
                      </button>
                    )}
                  </div>

                  <div style={{ flex: '1 1 15rem', minWidth: 0 }}>
                    <h2 className="oib-h2s" style={{ marginBottom: '.5rem' }}>
                      Format &amp; delivery
                    </h2>
                    {(
                      [
                        ['wantsRead', 'Written issue'],
                        ['wantsListen', 'Podcast (two voices)'],
                      ] as const
                    ).map(([key, label]) => {
                      const isOn = prefs ? prefs[key] : true;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          disabled={!prefs}
                          onClick={() =>
                            updatePrefs.mutate(key === 'wantsRead' ? { wantsRead: !isOn } : { wantsListen: !isOn })
                          }
                          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', minHeight: 48, padding: '0 .25rem', border: 'none', borderBottom: '1px solid var(--rule)', background: 'transparent', color: 'var(--fg)', textAlign: 'left' }}
                        >
                          <span style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '.95rem' }}>{label}</span>
                          <span className="oib-switch" aria-hidden="true" />
                        </button>
                      );
                    })}
                    <Link href="/settings/notifications" className="oib-btn" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                      Email and in-app delivery
                    </Link>
                    <div style={{ marginTop: '1rem' }}>
                      <div className="oib-meta" style={{ marginBottom: '.5rem' }} id="podcast-length-label">
                        PODCAST LENGTH
                      </div>
                      <div role="group" aria-labelledby="podcast-length-label" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                        {PODCAST_LENGTHS.map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            className="oib-pill"
                            aria-pressed={brain.podcastMinutes === minutes}
                            disabled={updateBrain.isPending}
                            onClick={() => updateBrain.mutate({ podcastMinutes: minutes })}
                          >
                            {minutes} min
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
                {settingsError && (
                  <p className="oib-error" role="alert" style={{ marginTop: '-2rem', marginBottom: '2rem' }}>
                    {settingsError}
                  </p>
                )}

                <section aria-labelledby="recent-h" id="issues">
                  <h2 id="recent-h" className="oib-h2s" style={{ marginBottom: '.75rem' }}>
                    Issues
                  </h2>
                  {issuesQuery.isLoading && (
                    <p className="oib-eyebrow" role="status">
                      Loading issues…
                    </p>
                  )}
                  {!issuesQuery.isLoading && issues.length === 0 && (
                    <p className="oib-muted">
                      No issues yet. The first one arrives {nextSlot ? `on ${nextSlot}` : 'on the next scheduled day'} if
                      there is something in the brain.
                    </p>
                  )}
                  {issues.length > 0 && (
                    <ul className="oib-rows">
                      {issues.map((issue) => (
                        <li key={issue.id}>
                          <Link
                            href={`/issues/${issue.id}`}
                            className="oib-row"
                            style={{ display: 'block', padding: '.9rem .6rem', textDecoration: 'none', color: 'var(--fg)' }}
                          >
                            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>
                              Issue {issue.number} · {issue.title}
                            </div>
                            <div className="oib-meta" style={{ marginTop: '.35rem' }}>
                              {[
                                formatShortDate(issue.publishedAt),
                                `${issue.takeawayCount} takeaway${issue.takeawayCount === 1 ? '' : 's'}`,
                                formatListenMinutes(issue.audioDurationSec),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
