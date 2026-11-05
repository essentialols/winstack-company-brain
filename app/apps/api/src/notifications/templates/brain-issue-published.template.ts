import { NotificationChannel } from '../types/notification.types';
import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../interfaces/notification-template.interface';
import { emailTemplateComponents } from './components/email-base.template';
import { htmlToText } from '../utils/html-to-text.util';
import { escapeHtml } from '../utils/escape-html.util';

/**
 * Sent to every member of a brain's organization when the pipeline publishes
 * a new issue. One definition covers EMAIL and IN_APP so the existing
 * per-channel notification preferences decide where it lands.
 */
export class BrainIssuePublishedTemplate implements NotificationTemplate {
  readonly variables = {
    brainName: { type: 'string', required: true } as const,
    issueTitle: { type: 'string', required: true } as const,
    issueNumber: { type: 'number', required: true } as const,
    issueId: { type: 'string', required: true } as const,
    issueUrl: { type: 'url', required: true } as const,
    organizationId: { type: 'string', required: true } as const,
    organizationName: { type: 'string', required: true } as const,
    takeawayCount: { type: 'number', required: false } as const,
    hasAudio: { type: 'boolean', required: false } as const,
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    const { brainName, issueTitle, issueNumber, issueId, issueUrl, organizationId } = variables;
    const summary = `Issue #${issueNumber} of ${brainName}: ${issueTitle}`;

    if (channel === NotificationChannel.IN_APP) {
      return {
        title: `New issue of ${brainName}`,
        body: summary,
        textContent: summary,
        data: {
          kind: 'brain-issue',
          organizationId,
          issueId,
          entityName: brainName,
          actionUrl: `/issues/${issueId}`,
        },
      };
    }

    if (channel !== NotificationChannel.EMAIL) {
      throw new Error(`Channel ${channel} not supported`);
    }

    const takeaways = Number(variables.takeawayCount) || 0;
    const formats = [
      takeaways > 0 ? `${takeaways} takeaway${takeaways === 1 ? '' : 's'}` : null,
      variables.hasAudio ? 'a podcast to listen to' : null,
    ].filter(Boolean);

    const subject = `${brainName} · #${issueNumber}: ${issueTitle}`;
    const content = `
      <p>A new issue of <strong>${escapeHtml(String(brainName))}</strong> is out,
      built from what your team saved in ${escapeHtml(String(variables.organizationName))}.</p>
      <p style="font-size: 18px; font-weight: 600;">${escapeHtml(String(issueTitle))}</p>
      ${formats.length > 0 ? `<p>Inside: ${escapeHtml(formats.join(' and '))}.</p>` : ''}
    `;
    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: `New issue #${issueNumber}`,
      content,
      ctaUrl: String(issueUrl),
      ctaText: 'Read the issue',
    });

    return { subject, htmlContent: html, textContent: htmlToText(html) };
  }
}
