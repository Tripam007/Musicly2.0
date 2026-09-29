import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { SpeechClient, protos } from '@google-cloud/speech';
import { checkRateLimit } from './rateLimit';

let speechClientInstance: SpeechClient | null = null;
function getSpeechClient(): SpeechClient {
  if (!speechClientInstance) {
    speechClientInstance = new SpeechClient();
  }
  return speechClientInstance;
}

export interface TranscribeRequest {
  audioBase64: string;
  mimeType?: string;
  languagePreference?: string;
  sampleRateHertz?: number;
}

export interface TranscribeResponse {
  transcript: string;
  confidence: number;
  detectedLanguage: string;
  alternatives: string[];
}

// Map common client MIME types to Google Cloud Speech recognition encodings
function resolveEncoding(mimeType: string = ''): protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  const lower = mimeType.toLowerCase();
  if (lower.includes('webm')) {
    return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS;
  }
  if (lower.includes('ogg')) {
    return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS;
  }
  if (lower.includes('wav') || lower.includes('linear16')) {
    return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
  }
  if (lower.includes('flac')) {
    return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC;
  }
  return protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
}

export async function handleTranscribeCommand(
  request: CallableRequest<TranscribeRequest>
): Promise<TranscribeResponse> {
  const uid = request.auth?.uid || request.rawRequest.ip || 'anonymous';

  // 1. Rate limiting: 40 requests per minute max
  const rateLimit = checkRateLimit(`stt_${uid}`, 40);
  if (!rateLimit.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Voice rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetMs / 1000)} seconds.`
    );
  }

  const { audioBase64, mimeType = 'audio/webm;codecs=opus', languagePreference = 'en-IN' } = request.data || {};

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing or invalid audioBase64 payload.');
  }

  // 2. Audio payload size check (max ~5MB base64 string = ~3.75MB audio file, well above an 8s clip)
  if (audioBase64.length > 5 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Audio payload exceeds maximum size limit (5MB).');
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
  } else if (languagePreference.startsWith('bn')) {
    primaryLang = 'bn-IN';
    altLangs = ['en-IN', 'en-US', 'hi-IN'];
  } else if (languagePreference === 'en-US') {
    primaryLang = 'en-US';
    altLangs = ['en-IN', 'hi-IN', 'bn-IN'];
  }

  const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
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
  } else if (encoding === protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS) {
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

    const alternatives: string[] = [];
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
  } catch (err: any) {
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
      } catch (fallbackErr) {
        console.error('[transcribeMusiclyCommand] Fallback model error:', fallbackErr);
      }
    }

    throw new HttpsError(
      'internal',
      err.message || 'Google Cloud Speech recognition service error.'
    );
  }
}
