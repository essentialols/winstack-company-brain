'use client';

import Link from 'next/link';
import type { IssueDto } from '@app-starter/shared';
import { IssueView } from '@/components/brain/IssueView';

const SOURCE_KAI = { saveId: 'sample-1', title: 'How I AI · Stripe’s Kai', url: null };
const SOURCE_JEV = { saveId: 'sample-2', title: 'How I AI · Jev use cases with John Lindquist and Claire Vo', url: null };
const SOURCE_SLIDE = { saveId: 'sample-3', title: 'Photo of a talk slide, pasted', url: null };

/** Static sample (from design/Main.dc.html), clearly labelled "Sample". No audio, so no player. */
const SAMPLE_ISSUE: IssueDto = {
  id: 'sample',
  brainId: 'sample',
  organizationId: 'sample',
  number: 1,
  title: 'Governance is the product, and agents need memory',
  audioUrl: null,
  audioDurationSec: null,
  publishedAt: '2026-11-07T07:00:00.000Z',
  content: {
    eyebrow: 'Sample · AI tooling · built from 4 things you saved',
    title: 'Governance is the product, and agents need memory',
    lead: 'This week you saved two How I AI episodes, a photo of a talk slide and a Lenny’s Podcast episode. Here is what they add up to.',
    takeaways: [
      {
        title: 'Ship governance, not just access.',
        line: 'The hard part of company-wide AI is copying how the company works: permissions, costs and sensitive data. Build those guardrails so people can just use AI and trust it.',
        heading: 'Why Stripe built Kai',
        detail: [
          'Stripe built its company agent, Kai, because handing out AI was never the hard part. Giving 10,000+ employees AI that follows how Stripe already works was. The episode gives four reasons to build rather than buy: governance, context, security and dogfooding.',
        ],
        todo: 'List the rules your company already runs on: who sees what data, who can spend how much, and what needs sign-off. Then check whether an off-the-shelf tool can follow those rules.',
        sources: [SOURCE_KAI],
      },
      {
        title: 'Use projects as a governance layer.',
        line: 'A project is where a few experts set the default model, tools, skills and agent backend for everyone doing that job.',
        heading: 'Projects carry the defaults',
        detail: [
          'Projects range from 5 to 500 people. The project owner sets the default model, which skills are in scope (Stripe has about 2,000 skills to choose from) and the tool policies. Everyone else in the project starts from those defaults without setting anything up.',
        ],
        todo: 'Pick one team and write down the defaults its expert would set: model, tools, skills and agent backend.',
        sources: [SOURCE_KAI],
      },
      {
        title: 'Set tool rules per project, not per person.',
        line: 'Require human approval for risky tools only in sensitive projects, like HR. Asking for approval everywhere teaches people to click “yes” without reading.',
        heading: 'Approval where it matters',
        detail: [
          'Approval is a project setting, not a personal one. The same tool can run freely in an engineering project and need a human sign-off in HR. Asking everywhere backfires: the prompt turns into noise, and people stop reading it.',
        ],
        todo: 'Mark which of your tools are risky, and in which projects they should need a human to approve.',
        sources: [SOURCE_KAI],
      },
      {
        title: 'Reach for a decision model when the choices are countable.',
        line: 'Jev returns scores, yes/no answers and picks from a set; open-ended judgment stays with an LLM.',
        heading: 'Countable choices go to Jev',
        detail: [
          'John Lindquist and Claire Vo walk through where Jev fits. If the answer is a score, a yes or no, or one option from a fixed list, a decision model handles it. If the job is to critique, brainstorm or decide what the action should even be, keep an LLM on it.',
        ],
        visual: {
          type: 'table',
          caption: 'Jev vs LLM',
          columns: ['The job', 'Use'],
          rows: [
            ['Scores and yes/no answers', 'Jev'],
            ['Picking from a fixed set', 'Jev'],
            ['Critiquing a screen', 'LLM'],
            ['Brainstorming', 'LLM'],
            ['Deciding what the action should be', 'LLM'],
          ],
        },
        todo: 'Pick one feature and write down every action it can take. If the list fits on a page, prototype it on Jev first.',
        sources: [SOURCE_JEV],
      },
      {
        title: 'Memory is the missing layer for agents.',
        line: 'Tool protocols (MCP), agent-to-agent links (A2A) and retrieval (RAG) connect and fetch, but don’t remember, reason over change or adapt.',
        heading: 'Four kinds of memory',
        detail: [
          'The slide splits agent memory into four types. It claims memory matters most in high-stakes domains like wealth management, where an agent has to know what happened before and what has changed since.',
        ],
        quote: { text: 'Memory-Aware Agents: The Missing Layer for Real-World AI', cite: 'Talk slide' },
        visual: {
          type: 'grid',
          cells: [
            { title: 'Episodic', sub: 'Events' },
            { title: 'Semantic', sub: 'Knowledge' },
            { title: 'Procedural', sub: 'How-to' },
            { title: 'Temporal links', sub: 'What changed' },
          ],
        },
        todo: 'For your brain app, decide which of the four you store today (saves are episodic) and which you would add next.',
        sources: [SOURCE_SLIDE],
      },
    ],
    alsoSaved: [
      {
        saveId: 'sample-4',
        title: 'Building companies as loops',
        note: 'Lenny’s Podcast · Anish Acharya, a16z. Work as cascading loops of agents, with people choosing the next hill.',
      },
    ],
    podcast: {
      title: 'Two models, one week of saves',
      chapters: [
        { title: 'Ship governance, not just access', startSec: 0 },
        { title: 'Projects as a governance layer', startSec: 0 },
        { title: 'Tool rules per project', startSec: 0 },
        { title: 'Decision models for countable choices', startSec: 0 },
        { title: 'Memory is the missing layer', startSec: 0 },
      ],
      transcript: [
        { speaker: 'IN', chapter: 0, text: 'Four saves this week: two How I AI episodes, a talk slide and a Lenny’s Podcast episode. What do they add up to?' },
        { speaker: 'AN', chapter: 0, text: 'Mostly one idea. Giving people AI is easy. Making AI follow how the company actually works is the hard part.' },
        { speaker: 'IN', chapter: 0, text: 'That’s the Stripe story?' },
        { speaker: 'AN', chapter: 0, text: 'Yes. Stripe built its company agent, Kai, because the guardrails had to match its own rules on data, cost and sign-off.' },
        { speaker: 'IN', chapter: 1, text: 'How do they set those guardrails without asking everyone to configure things?' },
        { speaker: 'AN', chapter: 1, text: 'Projects. A few experts set the default model, skills and tools for everyone doing that job.' },
        { speaker: 'IN', chapter: 2, text: 'And approvals for risky tools?' },
        { speaker: 'AN', chapter: 2, text: 'Only in sensitive projects, like HR. Ask for approval everywhere and people learn to click yes without reading.' },
        { speaker: 'IN', chapter: 3, text: 'The Jev episode was about a different kind of model. When should a team use it?' },
        { speaker: 'AN', chapter: 3, text: 'When the choices are countable: scores, yes or no, picking from a set. Open-ended judgment stays with a language model.' },
        { speaker: 'IN', chapter: 4, text: 'Last one: the slide on memory-aware agents.' },
        { speaker: 'AN', chapter: 4, text: 'Its point is that connecting tools isn’t remembering. Agents need events, knowledge, how-tos and a record of what changed.' },
        { speaker: 'IN', chapter: 4, text: 'Which is what a company brain is for.' },
        { speaker: 'AN', chapter: 4, text: 'Exactly. That’s the issue. Every takeaway links back to what was saved.' },
      ],
    },
  },
};

export default function SampleIssuePage() {
  return (
    <IssueView
      issue={SAMPLE_ISSUE}
      badge="Sample"
      backHref="/"
      backLabel="Home"
      footer={
        <>
          <span className="oib-eyebrow" style={{ fontSize: '.74rem' }}>
            Sample issue · no account needed to try it
          </span>
          <Link href="/demo" className="oib-primary">
            Try the demo brain
          </Link>
        </>
      }
    />
  );
}
