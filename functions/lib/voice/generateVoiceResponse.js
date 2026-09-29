"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGenerateVoiceResponse = handleGenerateVoiceResponse;
const https_1 = require("firebase-functions/v2/https");
const rateLimit_1 = require("./rateLimit");
// In-memory cache for common short system responses to save latency and API cost
const ttsResponseCache = new Map();
// Clean up cache if it exceeds 200 items
function trimCache() {
    if (ttsResponseCache.size > 200) {
        const keys = Array.from(ttsResponseCache.keys());
        for (let i = 0; i < 50; i++) {
            ttsResponseCache.delete(keys[i]);
        }
    }
}
async function handleGenerateVoiceResponse(request, apiKeySecret) {
    const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';
    // 1. Rate limiting: 30 TTS requests per minute max
    const rateLimit = (0, rateLimit_1.checkRateLimit)(`tts_${uid}`, 30);
    if (!rateLimit.allowed) {
        throw new https_1.HttpsError('resource-exhausted', `Voice response rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`);
    }
    const { text, voiceId: customVoiceId } = request.data || {};
    if (!text || typeof text !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid text parameter.');
    }
    // Strictly enforce short, minimal responses (max 160 characters)
    const trimmedText = text.trim().slice(0, 160);
    const cacheKey = trimmedText.toLowerCase();
    // 2. Check memory cache first
    const cachedAudio = ttsResponseCache.get(cacheKey);
    if (cachedAudio) {
        return {
            audioBase64: cachedAudio,
            mimeType: 'audio/mpeg',
            status: 'SUCCESS',
            cached: true,
        };
    }
    // 3. Resolve API key from Secret or environment
    const apiKey = apiKeySecret || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        // If not configured, gracefully let the client know so it falls back to Web Speech Synthesis
        return {
            audioBase64: null,
            mimeType: 'audio/mpeg',
            status: 'KEY_NOT_CONFIGURED',
        };
    }
    // 4. ElevenLabs Voice Selection:
    // Default: Rachel (21m00Tcm4TlvDq8ikWAM) - calm, warm, cinematic
    const voiceId = customVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: trimmedText,
                model_id: modelId,
                voice_settings: {
                    stability: 0.75,
                    similarity_boost: 0.85,
                    style: 0.15,
                    use_speaker_boost: true,
                },
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.warn(`[ElevenLabs] API responded with ${response.status}: ${errorText}`);
            if (response.status === 429) {
                throw new https_1.HttpsError('resource-exhausted', 'ElevenLabs quota or rate limit reached.');
            }
            if (response.status === 401 || response.status === 403) {
                return {
                    audioBase64: null,
                    mimeType: 'audio/mpeg',
                    status: 'KEY_NOT_CONFIGURED',
                };
            }
            return {
                audioBase64: null,
                mimeType: 'audio/mpeg',
                status: 'FAILED',
            };
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
        // Cache successful audio for repeated short phrases
        trimCache();
        ttsResponseCache.set(cacheKey, audioBase64);
        return {
            audioBase64,
            mimeType: 'audio/mpeg',
            status: 'SUCCESS',
            cached: false,
        };
    }
    catch (err) {
        console.error('[generateMusiclyVoice] ElevenLabs request error:', err);
        return {
            audioBase64: null,
            mimeType: 'audio/mpeg',
            status: 'FAILED',
        };
    }
}
//# sourceMappingURL=generateVoiceResponse.js.map