"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGenerateVoiceResponse = handleGenerateVoiceResponse;
const https_1 = require("firebase-functions/v2/https");
const text_to_speech_1 = require("@google-cloud/text-to-speech");
const rateLimit_1 = require("./rateLimit");
let googleTtsClient = null;
function getGoogleTtsClient() {
    if (!googleTtsClient) {
        googleTtsClient = new text_to_speech_1.TextToSpeechClient();
    }
    return googleTtsClient;
}
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
/**
 * Synthesize speech via Google Cloud Text-to-Speech
 */
async function synthesizeWithGoogleTTS(text, voiceName = 'en-US-Journey-F', languageCode = 'en-US', gender = 'FEMALE') {
    const client = getGoogleTtsClient();
    const ssmlGender = gender.toUpperCase() === 'MALE'
        ? text_to_speech_1.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE
        : text_to_speech_1.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE;
    const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: {
            languageCode: languageCode || 'en-US',
            name: voiceName || 'en-US-Journey-F',
            ssmlGender,
        },
        audioConfig: {
            audioEncoding: text_to_speech_1.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
            speakingRate: 1.0,
            pitch: 0.0,
        },
    });
    const audioContent = response.audioContent;
    return {
        audioBase64: audioContent.toString('base64'),
        mimeType: 'audio/mpeg',
        status: 'SUCCESS',
        providerUsed: 'google',
    };
}
async function handleGenerateVoiceResponse(request, apiKeySecret) {
    const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';
    // 1. Rate limiting: 30 TTS requests per minute max
    const rateLimit = (0, rateLimit_1.checkRateLimit)(`tts_${uid}`, 30);
    if (!rateLimit.allowed) {
        throw new https_1.HttpsError('resource-exhausted', `Voice response rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`);
    }
    const { text, voiceId: customVoiceId, provider = 'elevenlabs', language = 'en-US', gender = 'FEMALE' } = request.data || {};
    if (!text || typeof text !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid text parameter.');
    }
    // Strictly enforce short, minimal responses (max 160 characters)
    const trimmedText = text.trim().slice(0, 160);
    // Check memory cache first - Keyed by provider + voiceId + text
    const cacheKey = `${provider}_${customVoiceId || 'default'}_${trimmedText.toLowerCase()}`;
    const cachedAudio = ttsResponseCache.get(cacheKey);
    if (cachedAudio) {
        return {
            audioBase64: cachedAudio,
            mimeType: 'audio/mpeg',
            status: 'SUCCESS',
            cached: true,
            providerUsed: provider,
        };
    }
    // 1. Google Cloud Text-to-Speech
    if (provider === 'google') {
        try {
            const googleVoice = customVoiceId || (gender === 'MALE' ? 'en-US-Journey-D' : 'en-US-Journey-F');
            const googleResult = await synthesizeWithGoogleTTS(trimmedText, googleVoice, language, gender);
            if (googleResult.audioBase64) {
                ttsResponseCache.set(cacheKey, googleResult.audioBase64);
                trimCache();
                return googleResult;
            }
        }
        catch (googleErr) {
            console.warn('[handleGenerateVoiceResponse] Google TTS note, falling back to ElevenLabs:', googleErr);
        }
    }
    // 2. ElevenLabs Voice Selection:
    // Default: Nathaniel C (AeRdCCKzvd23BpJoofzx) - calm, British suspenseful storyteller
    const voiceId = customVoiceId || process.env.ELEVENLABS_VOICE_ID || 'AeRdCCKzvd23BpJoofzx';
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
    // Resolve API key from Secret or environment
    const apiKey = apiKeySecret || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        // If not configured, gracefully let the client know so it falls back to Web Speech Synthesis
        return {
            audioBase64: null,
            mimeType: 'audio/mpeg',
            status: 'KEY_NOT_CONFIGURED',
            providerUsed: 'elevenlabs',
        };
    }
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