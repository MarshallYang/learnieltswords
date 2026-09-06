/** Pronunciation helper: prefer China-reachable online audio, then Web Speech. */

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

/** Youdao dict voice — widely reachable in mainland China. type 1=US, 2=UK. */
export function youdaoVoiceUrl(word: string, accent: 'us' | 'uk' = 'uk'): string {
  const type = accent === 'us' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.trim())}&type=${type}`
}

export function cancelSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.removeAttribute('src')
      currentAudio.load()
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

function pickVoice(langPref: 'en-US' | 'en-GB' = 'en-GB'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const exact = voices.find((v) => v.lang === langPref)
  if (exact) return exact
  const prefix = voices.find((v) => v.lang?.toLowerCase().startsWith(langPref.slice(0, 2)))
  return prefix || voices.find((v) => /en/i.test(v.lang)) || null
}

export type SpeakOptions = {
  lang?: 'en-US' | 'en-GB'
  accent?: 'us' | 'uk'
  rate?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export function speakWord(text: string, opts: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text?.trim()) {
    opts.onError?.()
    return false
  }

  cancelSpeech()

  const u = new SpeechSynthesisUtterance(text.trim())
  u.lang = opts.lang || (opts.accent === 'us' ? 'en-US' : 'en-GB')
  u.rate = opts.rate ?? 0.92
  u.pitch = 1
  const voice = pickVoice(u.lang as 'en-US' | 'en-GB')
  if (voice) u.voice = voice

  u.onstart = () => opts.onStart?.()
  u.onend = () => {
    if (currentUtterance === u) currentUtterance = null
    opts.onEnd?.()
  }
  u.onerror = () => {
    if (currentUtterance === u) currentUtterance = null
    opts.onError?.()
  }

  currentUtterance = u
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickVoice(u.lang as 'en-US' | 'en-GB')
      if (v) u.voice = v
      window.speechSynthesis.speak(u)
      window.speechSynthesis.onvoiceschanged = null
    }
  } else {
    window.speechSynthesis.speak(u)
  }
  return true
}

function playRemoteUrl(
  url: string,
  word: string,
  opts: SpeakOptions,
): { mode: 'audio' | 'speech' | 'none'; stop: () => void } {
  cancelSpeech()
  const audio = new Audio(url)
  currentAudio = audio
  let settled = false

  const finish = (fn?: () => void) => {
    if (settled) return
    settled = true
    if (currentAudio === audio) currentAudio = null
    fn?.()
  }

  audio.onplay = () => opts.onStart?.()
  audio.onended = () => finish(opts.onEnd)
  audio.onerror = () => {
    finish()
    // Fall back to browser TTS (may still fail in CN)
    const ok = speakWord(word, opts)
    if (!ok) opts.onError?.()
  }

  void audio.play().catch(() => {
    finish()
    const ok = speakWord(word, opts)
    if (!ok) opts.onError?.()
  })

  return {
    mode: 'audio',
    stop: () => {
      cancelSpeech()
      finish(opts.onEnd)
    },
  }
}

/**
 * Prefer China-reachable Youdao audio (or explicit audioUrl), then SpeechSynthesis.
 * IELTS default accent: UK.
 */
export function playWordAudio(
  word: string,
  audioUrl: string | undefined,
  opts: SpeakOptions = {},
): { mode: 'audio' | 'speech' | 'none'; stop: () => void } {
  const accent = opts.accent || (opts.lang === 'en-US' ? 'us' : 'uk')
  const primary = audioUrl?.trim() || youdaoVoiceUrl(word, accent)
  if (typeof Audio !== 'undefined' && word?.trim()) {
    try {
      return playRemoteUrl(primary, word, opts)
    } catch {
      /* fall through */
    }
  }
  const ok = speakWord(word, opts)
  return {
    mode: ok ? 'speech' : 'none',
    stop: cancelSpeech,
  }
}
