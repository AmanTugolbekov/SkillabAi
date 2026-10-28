'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Голосовой ввод на Web Speech API — он встроен в браузер, работает без
 * сервера и ключей. Распознавание идёт на стороне браузера (в Chrome —
 * через сервисы Google), аудио мы никуда не отправляем и не храним.
 *
 * Поддержки нет в Firefox и в старых браузерах, поэтому кнопка просто не
 * появляется там, где API недоступен.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
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
  'no-speech': 'Не расслышал — попробуйте ещё раз',
  network: 'Нет связи с сервисом распознавания',
  'audio-capture': 'Микрофон не найден',
};

export default function VoiceInput({
  onText,
  onFinal,
  continuous = false,
  title = 'Сказать голосом',
}: {
  /** Текст по ходу речи: промежуточный и финальный. */
  onText: (text: string, isFinal: boolean) => void;
  /** Речь закончилась — финальный текст целиком. */
  onFinal?: (text: string) => void;
  /** true — слушать через паузы, пока не нажмут «стоп» (для длинных анонсов). */
  continuous?: boolean;
  title?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const finalText = useRef('');

  useEffect(() => {
    setSupported(recognitionClass() !== null);
    return () => recognition.current?.abort();
  }, []);

  function stop() {
    recognition.current?.stop();
    setListening(false);
  }

  function start() {
    const Recognition = recognitionClass();
    if (!Recognition) return;

    setError(null);
    finalText.current = '';

    const instance = new Recognition();
    instance.lang = 'ru-RU';
    instance.continuous = continuous;
    instance.interimResults = true;

    instance.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText.current += chunk;
        else interim += chunk;
      }
      const text = (finalText.current + interim).trim();
      if (text) onText(text, false);
    };

    instance.onerror = (event) => {
      setError(ERRORS[event.error] ?? 'Распознавание не удалось');
      setListening(false);
    };

    instance.onend = () => {
      setListening(false);
      const text = finalText.current.trim();
      if (text) {
        onText(text, true);
        onFinal?.(text);
      }
    };

    recognition.current = instance;
    instance.start();
    setListening(true);
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
