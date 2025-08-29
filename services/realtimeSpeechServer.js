import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { processChatMessage } from './chatbotService.js';
import { transcribeAudio } from './speechRecognitionService.js';

async function recognizeOnce(base64Content, languageCode = 'ko-KR', mime) {
  try {
    if (process.env.GOOGLE_CLOUD_SPEECH_ENABLED !== 'true') {
      // 폴백: 내부 STT 서비스 사용(더미 포함)
      const buf = Buffer.from(base64Content, 'base64');
      return await transcribeAudio(buf, languageCode, mime);
    }
    const { SpeechClient } = await import('@google-cloud/speech');
    const client = new SpeechClient({ keyFilename: process.env.GOOGLE_CLOUD_KEY_FILENAME });

    const mimeLower = (mime || '').toLowerCase();
    let encoding = undefined;
    let sampleRateHertz = undefined;
    if (mimeLower.includes('wav')) { encoding = 'LINEAR16'; sampleRateHertz = 16000; }
    else if (mimeLower.includes('mpeg') || mimeLower.includes('mp3')) { encoding = 'MP3'; sampleRateHertz = 48000; }
    else if (mimeLower.includes('webm')) { encoding = 'WEBM_OPUS'; sampleRateHertz = 48000; }
    else if (mimeLower.includes('ogg')) { encoding = 'OGG_OPUS'; sampleRateHertz = 48000; }
    else if (mimeLower.includes('flac')) { encoding = 'FLAC'; sampleRateHertz = 48000; }

    const [response] = await client.recognize({
      audio: { content: base64Content },
      config: {
        languageCode,
        enableAutomaticPunctuation: true,
        encoding,
        sampleRateHertz,
        audioChannelCount: 1,
      },
    });
    const texts = (response.results || [])
      .flatMap(r => (r.alternatives || []).map(a => a.transcript))
      .filter(Boolean);
    return texts.join(' ').trim();
  } catch (err) {
    logger.error('실시간 인식 recognizeOnce 실패:', { message: err?.message });
    return '';
  }
}

export function attachRealtimeSpeechServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws/speech' });
  logger.info('WebSocket Speech 서버 활성화: /ws/speech');

  wss.on('connection', (ws) => {
    logger.info('WS 연결 수립: /ws/speech');
    const session = { userId: null, lang: 'ko-KR', mime: null, chunks: [], timer: null, stream: null, sttEnabled: process.env.GOOGLE_CLOUD_SPEECH_ENABLED === 'true' };

    ws.on('message', async (raw, isBinary) => {
      try {
        // ws 라이브러리는 기본적으로 Buffer를 전달 → 텍스트 프레임이면 isBinary=false
        if (!isBinary) {
          const text = typeof raw === 'string' ? raw : raw.toString('utf8');
          const msg = JSON.parse(text);
          if (msg.type === 'start') {
            // 토큰 검증(선택)
            try {
              if (msg.token) jwt.verify(msg.token.replace(/\s+/g, ''), process.env.JWT_SECRET);
            } catch (e) {
              return ws.send(JSON.stringify({ type: 'error', message: '유효하지 않은 토큰' }));
            }
            session.userId = msg.userId || null;
            session.lang = msg.language || 'ko-KR';
            session.mime = msg.mime || null;
            logger.info('WS 음성 세션 시작', { userId: session.userId, lang: session.lang, mime: session.mime, stt: session.sttEnabled });
            // 실시간 스트리밍 시작 (Google STT)
            if (session.sttEnabled) {
              try {
                const { SpeechClient } = await import('@google-cloud/speech');
                const client = new SpeechClient({ keyFilename: process.env.GOOGLE_CLOUD_KEY_FILENAME });
                const mimeLower = (session.mime || 'audio/webm').toLowerCase();
                let encoding = 'WEBM_OPUS';
                let sampleRateHertz = 48000;
                if (mimeLower.includes('wav')) { encoding = 'LINEAR16'; sampleRateHertz = 16000; }
                else if (mimeLower.includes('mp3') || mimeLower.includes('mpeg')) { encoding = 'MP3'; sampleRateHertz = 48000; }
                else if (mimeLower.includes('ogg')) { encoding = 'OGG_OPUS'; sampleRateHertz = 48000; }

                session.stream = client.streamingRecognize({
                  config: {
                    languageCode: session.lang,
                    encoding,
                    sampleRateHertz,
                    enableAutomaticPunctuation: true,
                    audioChannelCount: 1,
                  },
                  interimResults: true,
                })
                  .on('error', (err) => {
                    logger.error('STT streaming error:', { message: err?.message });
                    // 스트림 오류 발생 시 폴백으로 전환
                    try { if (session.stream) session.stream.end(); } catch {}
                    session.stream = null;
                    session.sttEnabled = false;
                    if (!session.timer) {
                      session.timer = setInterval(async () => {
                        if (!session.chunks.length) return;
                        const combined = Buffer.concat(session.chunks);
                        session.chunks = [];
                        const base64 = combined.toString('base64');
                        const text = await recognizeOnce(base64, session.lang, session.mime);
                        if (text) ws.send(JSON.stringify({ type: 'partial', text }));
                      }, 300);
                    }
                  })
                  .on('data', async (data) => {
                    try {
                      const result = data.results?.[0];
                      const transcript = result?.alternatives?.[0]?.transcript?.trim();
                      if (!transcript) return;
                      if (result?.isFinal) {
                        ws.send(JSON.stringify({ type: 'final', text: transcript }));
                        if (session.userId) {
                          const resp = await processChatMessage(transcript, session.userId);
                          ws.send(JSON.stringify({ type: 'chatbot', data: resp }));
                        }
                      } else {
                        ws.send(JSON.stringify({ type: 'partial', text: transcript }));
                      }
                    } catch {}
                  });
              } catch (err) {
                logger.error('STT stream init 실패:', { message: err?.message });
              }
            } else {
              // 폴백: 300ms 주기로 매우 빠른 의사-부분 인식(로컬 추정 불가 → 누적 후 짧게 recognize)
              session.timer = setInterval(async () => {
                if (!session.chunks.length) return;
                const combined = Buffer.concat(session.chunks);
                session.chunks = [];
                const base64 = combined.toString('base64');
                const text = await recognizeOnce(base64, session.lang, session.mime);
                if (text) ws.send(JSON.stringify({ type: 'partial', text }));
              }, 300);
            }
            ws.send(JSON.stringify({ type: 'ready' }));
            return;
          }
          if (msg.type === 'audio' && msg.chunk) {
            const buf = Buffer.from(msg.chunk, 'base64');
            if (buf?.length) {
              // 1초에 한 번 정도만 로깅되도록 샘플링 가능하지만 간단히 길이만 출력
              logger.info('WS 오디오 청크 수신', { bytes: buf.length });
            }
            if (session.sttEnabled && session.stream) {
              // Google streamingRecognize 입력
              try { session.stream.write({ audioContent: buf }); } catch {}
            } else {
              session.chunks.push(buf);
            }
            return;
          }
          if (msg.type === 'stop') {
            logger.info('WS 음성 세션 종료 요청');
            try {
              if (session.timer) clearInterval(session.timer);
              if (session.sttEnabled && session.stream) {
                try { session.stream.end(); } catch {}
              } else if (session.chunks.length) {
                const base64 = Buffer.concat(session.chunks).toString('base64');
                const text = await recognizeOnce(base64, session.lang, session.mime);
                if (text) {
                  logger.info('WS 최종 인식 텍스트', { text });
                  ws.send(JSON.stringify({ type: 'final', text }));
                  if (session.userId) {
                    const resp = await processChatMessage(text, session.userId);
                    ws.send(JSON.stringify({ type: 'chatbot', data: resp }));
                  }
                }
              }
            } catch {}
            return ws.close();
          }
        } else if (Buffer.isBuffer(raw)) {
          // 바이너리 프레임: 순수 오디오 청크로 간주
          if (raw?.length) logger.info('WS 오디오 청크 수신', { bytes: raw.length });
          if (session.sttEnabled && session.stream) {
            try { session.stream.write({ audioContent: raw }); } catch {}
          } else {
            session.chunks.push(raw);
          }
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: '메시지 처리 실패' }));
      }
    });

    ws.on('close', () => {
      if (session.timer) clearInterval(session.timer);
      try { if (session.stream) session.stream.end(); } catch {}
    });
  });
}


