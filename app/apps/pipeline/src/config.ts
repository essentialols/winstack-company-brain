export type TtsProvider = 'openai' | 'elevenlabs' | 'none';

function env(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? fallback : v.trim();
}

function int(name: string, fallback: number): number {
  const n = Number.parseInt(env(name), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  apiUrl: env('API_URL', 'http://localhost:3001/api').replace(/\/+$/, ''),
  pipelineSecret: env('PIPELINE_SECRET'),

  anthropicApiKey: env('ANTHROPIC_API_KEY'),
  anthropicModel: env('ANTHROPIC_MODEL', 'claude-sonnet-5-5'),
  anthropicMaxTokens: int('ANTHROPIC_MAX_TOKENS', 16000),

  ttsProvider: env('TTS_PROVIDER', 'openai').toLowerCase() as TtsProvider,
  ttsConcurrency: int('TTS_CONCURRENCY', 4),
  openaiApiKey: env('OPENAI_API_KEY'),
  openaiTtsModel: env('TTS_MODEL', 'gpt-4o-mini-tts'),
  openaiVoiceIn: env('TTS_VOICE_IN', 'alloy'),
  openaiVoiceAn: env('TTS_VOICE_AN', 'onyx'),
  elevenApiKey: env('ELEVENLABS_API_KEY'),
  elevenVoiceIn: env('ELEVENLABS_VOICE_IN', '21m00Tcm4TlvDq8ikWAM'),
  elevenVoiceAn: env('ELEVENLABS_VOICE_AN', 'pNInY2qX0ZeLKzXwGjkP'),
  elevenModel: env('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),

  triggerwareUrl: env('TRIGGERWARE_URL'),
  triggerwareApiKey: env('TRIGGERWARE_API_KEY'),
  triggerwareSchedule: env('TRIGGERWARE_SCHEDULE', '*/15 * * * *'),
  pipelineSelfUrl: env('PIPELINE_SELF_URL').replace(/\/+$/, ''),

  tickMinutes: int('TICK_MINUTES', 15),
  port: int('PORT', 8080),
  logLevel: env('LOG_LEVEL', 'info'),
};

export function assertConfig(): void {
  const missing: string[] = [];
  if (!config.pipelineSecret) missing.push('PIPELINE_SECRET');
  if (!config.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
  if (config.ttsProvider === 'openai' && !config.openaiApiKey) {
    log.warn('TTS_PROVIDER=openai but OPENAI_API_KEY is empty; issues will publish without audio');
  }
  if (config.ttsProvider === 'elevenlabs' && !config.elevenApiKey) {
    log.warn('TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is empty; issues will publish without audio');
  }
}

const levels = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof levels;
function emit(level: Level, msg: string, extra?: unknown): void {
  const min = levels[(config.logLevel as Level) in levels ? (config.logLevel as Level) : 'info'];
  if (levels[level] < min) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (extra === undefined) out(line);
  else out(line, extra instanceof Error ? extra.message : extra);
}
export const log = {
  debug: (m: string, e?: unknown) => emit('debug', m, e),
  info: (m: string, e?: unknown) => emit('info', m, e),
  warn: (m: string, e?: unknown) => emit('warn', m, e),
  error: (m: string, e?: unknown) => emit('error', m, e),
};
