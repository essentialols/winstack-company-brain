'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { IssueDto } from '@app-starter/shared';
import { IssueView } from '@/components/brain/IssueView';
import { BrandLink } from '@/components/brain/BrandMark';
import { rememberOrganization, useCurrentOrganization } from '@/hooks/use-current-organization';
import { brainApi } from '@/lib/brain-api';
import type { ApiError } from '@/lib/api-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Issue links (e.g. from the notification email) carry only the issue id, while the
 * API route is organization-scoped. Try the `?org=` hint and the current workspace
 * first, then the caller's other workspaces; other tenants answer 404.
 */
const findIssue = async (issueId: string, orgIds: string[]): Promise<IssueDto | null> => {
  for (const orgId of orgIds) {
    try {
      return await brainApi.getIssue(orgId, issueId);
    } catch (error) {
      const status = (error as ApiError).statusCode;
      if (status !== 404 && status !== 403) throw error;
    }
  }
  return null;
};

const StatusShell = ({ children }: { children: React.ReactNode }) => (
  <div className="oib">
    <div className="oib-col" style={{ paddingTop: '1.25rem' }}>
      <BrandLink />
    </div>
    <main className="oib-col" style={{ paddingTop: '3rem' }}>
      {children}
    </main>
  </div>
);

export default function IssuePage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const orgHint = searchParams.get('org');
  const { organization, organizations, isLoading: isLoadingOrgs } = useCurrentOrganization();

  const orderedOrgIds = Array.from(
    new Set([orgHint, organization?.id, ...organizations.map((candidate) => candidate.id)].filter(Boolean) as string[]),
  );

  const issueQuery = useQuery({
    queryKey: ['issue', id, orderedOrgIds.join(',')],
    queryFn: async () => {
      const issue = await findIssue(id, orderedOrgIds);
      if (issue) rememberOrganization(issue.organizationId);
      return issue;
    },
    enabled: !isLoadingOrgs,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoadingOrgs || issueQuery.isLoading) {
    return (
      <StatusShell>
        <p className="oib-eyebrow" role="status">
          Loading issue…
        </p>
      </StatusShell>
    );
  }

  if (issueQuery.isError || !issueQuery.data) {
    return (
      <StatusShell>
        <h1 className="oib-h1" style={{ marginBottom: '1rem' }}>
          Issue not found
        </h1>
        <p className="oib-lead" style={{ marginBottom: '1.5rem' }}>
          {issueQuery.isError
            ? ((issueQuery.error as unknown as ApiError).message ?? 'The issue could not be loaded.')
            : 'This issue does not exist, or it belongs to a workspace you are not a member of.'}
        </p>
        <Link href="/dashboard" className="oib-primary">
          Back to dashboard
        </Link>
      </StatusShell>
    );
  }

  const issue = issueQuery.data;
  return <IssueView issue={issue} backHref={`/dashboard?brain=${issue.brainId}`} />;
}
