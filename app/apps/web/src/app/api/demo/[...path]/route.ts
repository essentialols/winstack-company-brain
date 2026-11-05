import { NextRequest, NextResponse } from 'next/server';
import type { CreateSaveInput, MeBrainsDto } from '@app-starter/shared';
import {
  DEMO_BRAIN_ID,
  DEMO_ORG_ID,
  createSave,
  deleteSave,
  getGeneratedIssue,
  listSaves,
  setGeneratedIssue,
  toPublicSave,
} from '@/lib/demo-store';
import { buildDemoIssue } from '@/lib/demo-issue';

/**
 * No-login demo API. Routes mirror the real API's extension routes so the
 * extension works unchanged with its API base URL pointed at /api/demo:
 *   GET    /api/demo/me/brains
 *   GET    /api/demo/saves
 *   POST   /api/demo/saves
 *   DELETE /api/demo/saves/:id
 *   DELETE /api/demo/organizations/demo/brains/demo/saves/:id   (extension Undo)
 *   GET    /api/demo/issue          latest generated issue (404 if none)
 *   POST   /api/demo/issue          build an issue from current saves
 */

export const dynamic = 'force-dynamic';

const corsHeaders = (request: NextRequest): Record<string, string> => {
  const origin = request.headers.get('origin') ?? '';
  // Same-origin requests need nothing; the extension calls from chrome-extension://.
  if (!origin.startsWith('chrome-extension://')) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
};

const json = (request: NextRequest, body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: corsHeaders(request) });

const empty = (request: NextRequest, status = 204) => new NextResponse(null, { status, headers: corsHeaders(request) });

const nextSaturday = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7));
  d.setUTCHours(7, 0, 0, 0);
  return d.toISOString();
};

const segments = async (context: { params: Promise<{ path: string[] }> }) => (await context.params).path ?? [];

export const OPTIONS = (request: NextRequest) => empty(request);

export const GET = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => {
  const path = (await segments(context)).join('/');
  try {
    if (path === 'me/brains') {
      const saves = await listSaves();
      const body: MeBrainsDto = {
        user: { id: 'demo', name: 'Demo', email: 'demo@outside-in-brain.local' },
        defaultBrainId: DEMO_BRAIN_ID,
        organizations: [
          { id: DEMO_ORG_ID, name: 'Demo', brains: [{ id: DEMO_BRAIN_ID, name: 'Demo brain', pendingSaveCount: saves.length, nextIssueAt: nextSaturday() }] },
        ],
      };
      return json(request, body);
    }
    if (path === 'saves') return json(request, (await listSaves()).map(toPublicSave));
    if (path === 'issue') {
      const issue = getGeneratedIssue();
      return issue ? json(request, issue) : json(request, { message: 'No issue yet' }, 404);
    }
    return json(request, { message: 'Not found' }, 404);
  } catch (error) {
    return json(request, { message: (error as Error).message }, 500);
  }
};

export const POST = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => {
  const path = (await segments(context)).join('/');
  try {
    if (path === 'saves') {
      const input = (await request.json().catch(() => ({}))) as CreateSaveInput;
      const source = (request.headers.get('origin') ?? '').startsWith('chrome-extension://') ? 'EXTENSION' : 'PASTE';
      const save = await createSave(input, source);
      return json(request, toPublicSave(save), 201);
    }
    if (path === 'issue') {
      const saves = await listSaves();
      if (saves.length === 0) return json(request, { message: 'Save or paste something first.' }, 400);
      const previous = getGeneratedIssue();
      const issue = await buildDemoIssue(saves, previous?.number ?? 0);
      setGeneratedIssue(issue);
      return json(request, issue, 201);
    }
    return json(request, { message: 'Not found' }, 404);
  } catch (error) {
    const message = (error as Error).message;
    return json(request, { message }, message.startsWith('Add a link') ? 400 : 500);
  }
};

export const DELETE = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => {
  const parts = await segments(context);
  const id = parts[parts.length - 1];
  const isSaveRoute =
    (parts.length === 2 && parts[0] === 'saves') ||
    (parts.length === 6 && parts[0] === 'organizations' && parts[2] === 'brains' && parts[4] === 'saves');
  if (!isSaveRoute || !id) return json(request, { message: 'Not found' }, 404);
  try {
    return (await deleteSave(id)) ? empty(request) : json(request, { message: 'Not found' }, 404);
  } catch (error) {
    return json(request, { message: (error as Error).message }, 500);
  }
};
