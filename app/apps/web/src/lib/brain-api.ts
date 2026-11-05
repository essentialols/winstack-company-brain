import type {
  ApiTokenDto,
  BrainDto,
  CreateSaveInput,
  DigestFrequency,
  IssueDto,
  IssueSummaryDto,
  MeBrainsDto,
  SaveDto,
} from '@app-starter/shared';
import { apiClient, API_BASE_URL } from './api-client';
import { authStorage } from './auth-storage';

/** Body of PATCH /organizations/:orgId/brains/:brainId (SPEC.md). */
export interface UpdateBrainInput {
  name?: string;
  frequency?: DigestFrequency;
  deliveryDays?: number[];
  deliveryHour?: number;
  timezone?: string;
  podcastMinutes?: number;
}

/** GET/PATCH /me/digest-preferences. Not in packages/shared; shape taken from SPEC.md. */
export interface DigestPreferencesDto {
  wantsRead: boolean;
  wantsListen: boolean;
}

export interface CreateApiTokenResponse {
  token: string;
  apiToken: ApiTokenDto;
}

const orgPath = (organizationId: string) => `/api/organizations/${organizationId}`;
const brainPath = (organizationId: string, brainId: string) =>
  `${orgPath(organizationId)}/brains/${brainId}`;

export const brainApi = {
  listBrains: (organizationId: string) =>
    apiClient.get<BrainDto[]>(`${orgPath(organizationId)}/brains`),

  createBrain: (organizationId: string, data: { name: string }) =>
    apiClient.post<BrainDto>(`${orgPath(organizationId)}/brains`, data),

  updateBrain: (organizationId: string, brainId: string, data: UpdateBrainInput) =>
    apiClient.patch<BrainDto>(brainPath(organizationId, brainId), data),

  listSaves: (organizationId: string, brainId: string, options: { pending?: boolean } = {}) =>
    apiClient.get<SaveDto[]>(
      `${brainPath(organizationId, brainId)}/saves${options.pending ? '?pending=true' : ''}`,
    ),

  createSave: (organizationId: string, brainId: string, data: CreateSaveInput) =>
    apiClient.post<SaveDto>(`${brainPath(organizationId, brainId)}/saves`, data),

  deleteSave: (organizationId: string, brainId: string, saveId: string) =>
    apiClient.delete<void>(`${brainPath(organizationId, brainId)}/saves/${saveId}`),

  listIssues: (organizationId: string, brainId: string) =>
    apiClient.get<IssueSummaryDto[]>(`${brainPath(organizationId, brainId)}/issues`),

  getIssue: (organizationId: string, issueId: string) =>
    apiClient.get<IssueDto>(`${orgPath(organizationId)}/issues/${issueId}`),

  getMeBrains: () => apiClient.get<MeBrainsDto>('/api/me/brains'),

  getDigestPreferences: () => apiClient.get<DigestPreferencesDto>('/api/me/digest-preferences'),

  updateDigestPreferences: (data: Partial<DigestPreferencesDto>) =>
    apiClient.patch<DigestPreferencesDto>('/api/me/digest-preferences', data),

  listApiTokens: () => apiClient.get<ApiTokenDto[]>('/api/me/api-tokens'),

  createApiToken: (data: { name: string }) =>
    apiClient.post<CreateApiTokenResponse>('/api/me/api-tokens', data),

  revokeApiToken: (id: string) => apiClient.delete<void>(`/api/me/api-tokens/${id}`),
};

/** Base URL the extension should call (API global prefix included). */
export const EXTENSION_API_BASE_URL = `${API_BASE_URL.replace(/\/$/, '')}/api`;

/**
 * Resolve an issue's audioUrl to something an <audio> element can play.
 * The API may return a relative `/api/.../audio` streaming URL that needs the JWT; the
 * web app and API usually live on different domains, so the cookie is not sent there.
 * We fetch it with the Bearer token and hand back a blob URL. Absolute storage URLs
 * (public or signed) are returned unchanged.
 */
export const resolveAudioSrc = async (audioUrl: string): Promise<string> => {
  const apiBase = API_BASE_URL.replace(/\/$/, '');
  const isApiRelative = audioUrl.startsWith('/api/');
  const isApiAbsolute = audioUrl.startsWith(`${apiBase}/api/`);
  if (!isApiRelative && !isApiAbsolute) return audioUrl;

  const url = isApiRelative ? `${apiBase}${audioUrl}` : audioUrl;
  const accessToken = authStorage.getAccessToken();
  const response = await fetch(url, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!response.ok) throw new Error(`Audio request failed (${response.status})`);
  return URL.createObjectURL(await response.blob());
};
