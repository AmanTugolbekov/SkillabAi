'use client';

import { useEffect, useRef, useState } from 'react';
import { tidySpeech } from '@/lib/speech';

/**
 * Голосовой ввод на Web Speech API — он встроен в браузер, работает без
 * сервера и ключей. Распознавание идёт на стороне браузера (в Chrome —
 * через сервисы Google), аудио мы никуда не отправляем и не храним.
 *
 * Поддержки нет в Firefox и в старых браузерах, поэтому кнопка просто не
 * появляется там, где API недоступен.
 *
 * Слушаем всегда в непрерывном режиме и сами перезапускаем сессию: иначе
 * Chrome обрывает запись на первой же паузе и отдаёт половину фразы. Запись
 * держится, пока её не остановят кнопкой или пока не пройдёт autoStopMs
 * тишины после последних слов.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Браузер не дал доступ к микрофону',
  'service-not-allowed': 'Браузер не дал доступ к микрофону',
  network: 'Нет связи с сервисом распознавания',
  'audio-capture': 'Микрофон не найден',
};

export default function VoiceInput({
  onText,
  onFinal,
  autoStopMs,
  title = 'Сказать голосом',
}: {
  /** Текст по ходу речи: промежуточный и финальный. */
  onText: (text: string, isFinal: boolean) => void;
  /** Запись закончилась — финальный текст целиком. */
  onFinal?: (text: string) => void;
  /** Сколько тишины ждать, прежде чем остановиться самим. Без него — только кнопкой. */
  autoStopMs?: number;
  title?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  /** Текст закрытых сессий: Chrome обрывает запись сам, мы поднимаем новую. */
  const committed = useRef('');
  /** Всё, что набралось в текущей сессии, целиком. */
  const session = useRef('');
  const wantListening = useRef(false);
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(recognitionClass() !== null);
    return () => {
      wantListening.current = false;
      if (silence.current) clearTimeout(silence.current);
      drop();
    };
  }, []);

  /** Отвязывает прежнюю сессию, чтобы её onend не поднял вторую запись. */
  function drop() {
    const instance = recognition.current;
    if (!instance) return;
    instance.onresult = null;
    instance.onerror = null;
    instance.onend = null;
    instance.abort();
    recognition.current = null;
  }

  function fullText() {
    return tidySpeech(`${committed.current} ${session.current}`);
  }

  function stop() {
    wantListening.current = false;
    if (silence.current) clearTimeout(silence.current);
    const text = fullText();
    drop();
    setListening(false);
    if (text) {
      onText(text, true);
      onFinal?.(text);
    }
  }

  function listen() {
    const Recognition = recognitionClass();
    if (!Recognition) return;

    drop();
    session.current = '';

    const instance = new Recognition();
    instance.lang = 'ru-RU';
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;

    instance.onresult = (event) => {
      // Собираем фразу заново из всего списка результатов. Chrome присылает
      // один и тот же финальный результат по нескольку раз, и если дописывать
      // его к накопленному, слово повторяется: «пикник пикник пикник».
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += `${event.results[i][0].transcript} `;
      }
      session.current = text;
      const whole = fullText();
      if (whole) onText(whole, false);

      if (autoStopMs) {
        if (silence.current) clearTimeout(silence.current);
        silence.current = setTimeout(stop, autoStopMs);
      }
    };

    instance.onerror = (event) => {
      // Тишина в непрерывном режиме — не ошибка: ждём, пока заговорят.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      wantListening.current = false;
      setError(ERRORS[event.error] ?? 'Распознавание не удалось');
      setListening(false);
    };

    // Chrome закрывает сессию сам каждые несколько десятков секунд —
    // забираем её текст и поднимаем новую, пока запись не остановили.
    instance.onend = () => {
      committed.current = `${committed.current} ${session.current}`.trim();
      session.current = '';
      if (wantListening.current) listen();
      else setListening(false);
    };

    recognition.current = instance;
    instance.start();
  }

  function start() {
    setError(null);
    committed.current = '';
    session.current = '';
    wantListening.current = true;
    setListening(true);
    listen();
  }

  if (!supported) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? 'Остановить запись' : title}
        title={listening ? 'Остановить запись' : title}
        className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[12px] border border-line transition-colors"
        style={
          listening
            ? { background: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'transparent' }
            : { background: 'var(--surface)', color: 'var(--text)' }
        }
      >
        {listening ? <StopIcon /> : <MicIcon />}
      </button>
      {error && (
        <span
          className="absolute bottom-[54px] right-0 w-[220px] rounded-[10px] px-3 py-2 text-[12px] leading-snug"
          style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
          role="status"
        >
          {error}
        </span>
      )}
    </span>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
