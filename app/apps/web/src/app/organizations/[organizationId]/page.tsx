'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Brain, Loader2, Settings, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { InviteOrganizationMembersDialog } from '@/components/organizations/InviteOrganizationMembersDialog';
import { organizationsApi } from '@/lib/organizations-api';
import { rememberOrganization } from '@/hooks/use-current-organization';

interface PageProps {
  params: Promise<{ organizationId: string }>;
}

export default function OrganizationPage({ params }: PageProps) {
  const { organizationId } = use(params);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationsApi.getOrganization(organizationId),
  });

  const { data: roleInfo } = useQuery({
    queryKey: ['organization-role', organizationId],
    queryFn: () => organizationsApi.getUserRoleInOrganization(organizationId),
  });

  const canManage = roleInfo?.role === 'OWNER' || roleInfo?.role === 'ADMIN';

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
          Organization not found, or you no longer have access to it.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <PageHeader title={organization.name} description={organization.description || undefined}>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/organizations/${organizationId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </PageHeader>

        {/* Brains replace the starter's Projects example; Projects code stays but is no longer linked. */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Brains</h2>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Brain inbox</CardTitle>
              <CardDescription>
                Saves, schedule and issues for this workspace&apos;s brains.
              </CardDescription>
              <div className="pt-2">
                <Button asChild size="sm" onClick={() => rememberOrganization(organizationId)}>
                  <Link href="/dashboard">
                    <Brain className="mr-2 h-4 w-4" />
                    Open brain inbox
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </section>

        {organization.location && (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              {organization.location}
            </CardContent>
          </Card>
        )}
      </div>

      <InviteOrganizationMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        defaultOrganizationId={organizationId}
      />
    </PageContainer>
  );
}
