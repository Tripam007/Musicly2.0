"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranscribeCommand = handleTranscribeCommand;
const https_1 = require("firebase-functions/v2/https");
const speech_1 = require("@google-cloud/speech");
const rateLimit_1 = require("./rateLimit");
let speechClientInstance = null;
function getSpeechClient() {
    if (!speechClientInstance) {
        speechClientInstance = new speech_1.SpeechClient();
    }
    return speechClientInstance;
}
// Map common client MIME types to Google Cloud Speech recognition encodings
function resolveEncoding(mimeType = '') {
    const lower = mimeType.toLowerCase();
    if (lower.includes('webm')) {
        return speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS;
    }
    if (lower.includes('ogg')) {
        return speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS;
    }
    if (lower.includes('wav') || lower.includes('linear16')) {
        return speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
    }
    if (lower.includes('flac')) {
        return speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC;
    }
    return speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
}
async function handleTranscribeCommand(request) {
    const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';
    // 1. Rate limiting: 40 requests per minute max
    const rateLimit = (0, rateLimit_1.checkRateLimit)(`stt_${uid}`, 40);
    if (!rateLimit.allowed) {
        throw new https_1.HttpsError('resource-exhausted', `Voice rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`);
    }
    const { audioBase64, mimeType = 'audio/webm;codecs=opus', languagePreference = 'en-IN' } = request.data || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid audioBase64 payload.');
    }
    // 2. Audio payload size check (max ~5MB base64 string = ~3.75MB audio file, well above an 8s clip)
    if (audioBase64.length > 5 * 1024 * 1024) {
        throw new https_1.HttpsError('invalid-argument', 'Audio payload exceeds maximum size limit (5MB).');
    }
    const audioBytes = Buffer.from(audioBase64, 'base64');
    if (audioBytes.length < 500) {
        // Too short to contain meaningful speech
        return {
            transcript: '',
            confidence: 0,
            detectedLanguage: languagePreference,
            alternatives: [],
        };
    }
    const encoding = resolveEncoding(mimeType);
    // 3. Configure Google Cloud Speech-to-Text for short voice commands
    // Multi-lingual & Hinglish support: Primary code + alternative language codes
    let primaryLang = 'en-IN';
    let altLangs = ['en-US', 'hi-IN', 'bn-IN'];
    if (languagePreference.startsWith('hi')) {
        primaryLang = 'hi-IN';
        altLangs = ['en-IN', 'en-US', 'bn-IN'];
    }
    else if (languagePreference.startsWith('bn')) {
        primaryLang = 'bn-IN';
        altLangs = ['en-IN', 'en-US', 'hi-IN'];
    }
    else if (languagePreference === 'en-US') {
        primaryLang = 'en-US';
        altLangs = ['en-IN', 'hi-IN', 'bn-IN'];
    }
    const config = {
        encoding,
        languageCode: primaryLang,
        alternativeLanguageCodes: altLangs,
        enableAutomaticPunctuation: true,
        // Google Cloud STT short-utterance model for commands & music search
        model: 'command_and_search',
        maxAlternatives: 3,
        // Provide speech adaptation / phrases for Musicly actions & music terms
        speechContexts: [
            {
                phrases: [
                    'play',
                    'pause',
                    'resume',
                    'stop',
                    'next song',
                    'next track',
                    'previous song',
                    'previous track',
                    'skip',
                    'volume up',
                    'volume down',
                    'mute',
                    'unmute',
                    'volume 50',
                    'shuffle',
                    'repeat',
                    'like this',
                    'open library',
                    'open scenes',
                    'Afterglow',
                    'Drive',
                    'Studio',
                    'Indie',
                    'Faasle',
                    'Kaavish',
                    'Coldplay',
                    'gaana chalao',
                    'agla gaana',
                    'pichhla gaana',
                    'volume badhao',
                    'volume ghatao',
                    'rok do',
                    'gaan chalao',
                    'porer gaan',
                    'thamo',
                ],
                boost: 15,
            },
        ],
    };
    // If sample rate provided and needed (e.g. LINEAR16)
    if (request.data.sampleRateHertz && request.data.sampleRateHertz > 0) {
        config.sampleRateHertz = request.data.sampleRateHertz;
    }
    else if (encoding === speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS) {
        config.sampleRateHertz = 48000;
    }
    try {
        const client = getSpeechClient();
        const [response] = await client.recognize({
            config,
            audio: { content: audioBytes },
        });
        if (!response.results || response.results.length === 0) {
            return {
                transcript: '',
                confidence: 0,
                detectedLanguage: primaryLang,
                alternatives: [],
            };
        }
        const firstResult = response.results[0];
        const topAlternative = firstResult.alternatives?.[0];
        const detectedLanguage = firstResult.languageCode || primaryLang;
        const transcript = topAlternative?.transcript?.trim() || '';
        const rawConf = topAlternative?.confidence;
        const confidence = rawConf != null ? Math.round(Number(rawConf) * 100) / 100 : 0.85;
        const alternatives = [];
        if (firstResult.alternatives && firstResult.alternatives.length > 1) {
            for (let i = 1; i < firstResult.alternatives.length; i++) {
                const altText = firstResult.alternatives[i]?.transcript?.trim();
                if (altText && altText !== transcript) {
                    alternatives.push(altText);
                }
            }
        }
        return {
            transcript,
            confidence,
            detectedLanguage,
            alternatives,
        };
    }
    catch (err) {
        console.error('[transcribeMusiclyCommand] Speech-to-Text error:', err);
        // If 'command_and_search' model is unsupported for certain language combinations, retry with 'default'
        if (err.message && err.message.includes('model') && config.model === 'command_and_search') {
            try {
                const client = getSpeechClient();
                config.model = 'default';
                const [fallbackResponse] = await client.recognize({
                    config,
                    audio: { content: audioBytes },
                });
                const firstResult = fallbackResponse.results?.[0];
                const topAlternative = firstResult?.alternatives?.[0];
                const fallbackConf = topAlternative?.confidence;
                return {
                    transcript: topAlternative?.transcript?.trim() || '',
                    confidence: fallbackConf != null ? Math.round(Number(fallbackConf) * 100) / 100 : 0.8,
                    detectedLanguage: firstResult?.languageCode || primaryLang,
                    alternatives: [],
                };
            }
            catch (fallbackErr) {
                console.error('[transcribeMusiclyCommand] Fallback model error:', fallbackErr);
            }
        }
        throw new https_1.HttpsError('internal', err.message || 'Google Cloud Speech recognition service error.');
    }
}
//# sourceMappingURL=transcribeCommand.js.map