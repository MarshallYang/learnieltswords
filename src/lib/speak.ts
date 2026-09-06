/** Browser Web Speech API helper for IELTS word pronunciation (offline-friendly). */

let currentUtterance: SpeechSynthesisUtterance | null = null

export function cancelSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  currentUtterance = null
}

function pickVoice(langPref: 'en-US' | 'en-GB' = 'en-US'): SpeechSynthesisVoice | null {
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
  rate?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

/**
 * Speak `text` with en-US/en-GB voice. Cancels any in-flight utterance.
 * Returns false if SpeechSynthesis is unavailable.
 */
export function speakWord(text: string, opts: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text?.trim()) {
    opts.onError?.()
    return false
  }

  cancelSpeech()

  const u = new SpeechSynthesisUtterance(text.trim())
  u.lang = opts.lang || 'en-US'
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
  // Chrome sometimes needs voices to load asynchronously
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

/** Prefer remote audioUrl when present; fall back to SpeechSynthesis. */
export function playWordAudio(
  word: string,
  audioUrl: string | undefined,
  opts: SpeakOptions = {},
): { mode: 'audio' | 'speech' | 'none'; stop: () => void } {
  if (audioUrl && typeof Audio !== 'undefined') {
    try {
      cancelSpeech()
      const audio = new Audio(audioUrl)
      audio.onplay = () => opts.onStart?.()
      audio.onended = () => opts.onEnd?.()
      audio.onerror = () => {
        // Fall back to TTS
        const ok = speakWord(word, opts)
        if (!ok) opts.onError?.()
      }
      void audio.play().catch(() => {
        speakWord(word, opts)
      })
      return {
        mode: 'audio',
        stop: () => {
          audio.pause()
          audio.currentTime = 0
          opts.onEnd?.()
        },
      }
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
