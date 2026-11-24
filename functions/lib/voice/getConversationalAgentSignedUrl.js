"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetConversationalAgentSignedUrl = handleGetConversationalAgentSignedUrl;
const https_1 = require("firebase-functions/v2/https");
const rateLimit_1 = require("./rateLimit");
async function handleGetConversationalAgentSignedUrl(request, apiKeySecret) {
    const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';
    // 1. Rate limiting: 20 agent sessions per minute
    const rateLimit = (0, rateLimit_1.checkRateLimit)(`convai_${uid}`, 20);
    if (!rateLimit.allowed) {
        throw new https_1.HttpsError('resource-exhausted', `Conversational Agent rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`);
    }
    const apiKey = apiKeySecret || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'ElevenLabs API key is not configured on the server.');
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
            throw new https_1.HttpsError('internal', `ElevenLabs Conversational Agent returned ${response.status}: ${errText}`);
        }
        const data = await response.json();
        return {
            success: true,
            signedUrl: data.signed_url,
            agentId,
        };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', `Failed to initialize Conversational Agent session: ${err?.message || err}`);
    }
}
//# sourceMappingURL=getConversationalAgentSignedUrl.js.map