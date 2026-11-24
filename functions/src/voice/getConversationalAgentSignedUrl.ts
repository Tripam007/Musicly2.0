import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { checkRateLimit } from './rateLimit';

export interface GetSignedUrlRequest {
  agentId?: string;
}

export interface GetSignedUrlResponse {
  success: boolean;
  signedUrl: string;
  agentId: string;
}

export async function handleGetConversationalAgentSignedUrl(
  request: CallableRequest<GetSignedUrlRequest>,
  apiKeySecret?: string
): Promise<GetSignedUrlResponse> {
  const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';

  // 1. Rate limiting: 20 agent sessions per minute
  const rateLimit = checkRateLimit(`convai_${uid}`, 20);
  if (!rateLimit.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Conversational Agent rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`
    );
  }

  const apiKey = apiKeySecret || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'ElevenLabs API key is not configured on the server.'
    );
  }

  const agentId = request.data?.agentId || process.env.ELEVENLABS_AGENT_ID || 'agent_musicly_assistant';
  const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[ConversationalAI] Failed to get signed URL (${response.status}): ${errText}`);
      throw new HttpsError(
        'internal',
        `ElevenLabs Conversational Agent returned ${response.status}: ${errText}`
      );
    }

    const data: any = await response.json();
    return {
      success: true,
      signedUrl: data.signed_url,
      agentId,
    };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError(
      'internal',
      `Failed to initialize Conversational Agent session: ${err?.message || err}`
    );
  }
}
