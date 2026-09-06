/** Pronunciation helper: China-reachable online audio + SpeechSynthesis fallback. */

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null
/** Bumped on every stop so in-flight play promises abort cleanly. */
let playGeneration = 0

/** Youdao dict voice — widely reachable in mainland China. type 1=US, 2=UK. */
export function youdaoVoiceUrl(word: string, accent: 'us' | 'uk' = 'uk'): string {
  const type = accent === 'us' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.trim())}&type=${type}`
}

/** Baidu fanyi TTS — useful for Chinese glosses in mainland China. */
export function baiduTtsUrl(text: string, lan: 'zh' | 'en' = 'zh', spd = 5): string {
  return `https://fanyi.baidu.com/gettts?lan=${lan}&text=${encodeURIComponent(text.trim())}&spd=${spd}&source=web`
}

export function cancelSpeech() {
  if (currentAudio) {
    try {
      currentAudio.onended = null
      currentAudio.onerror = null
      currentAudio.onplay = null
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

/** Stop all audio/TTS and invalidate in-flight playlist steps. */
export function stopAllPlayback() {
  playGeneration += 1
  cancelSpeech()
}

export function getPlayGeneration() {
  return playGeneration
}

function pickVoice(langPref: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const exact = voices.find((v) => v.lang === langPref)
  if (exact) return exact
  const prefix = langPref.slice(0, 2).toLowerCase()
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => /en|zh/i.test(v.lang)) ||
    null
  )
}

export type SpeakOptions = {
  lang?: string
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
  const voice = pickVoice(u.lang)
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
      const v = pickVoice(u.lang)
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
  fallbackText: string,
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
    const ok = speakWord(fallbackText, opts)
    if (!ok) opts.onError?.()
  }

  void audio.play().catch(() => {
    finish()
    const ok = speakWord(fallbackText, opts)
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

export type PlayResult = 'ok' | 'error' | 'aborted'

function wait(ms: number, gen: number): Promise<PlayResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(gen === playGeneration ? 'ok' : 'aborted'), ms)
  })
}

/** Play a remote audio URL once; resolves when ended/failed/aborted. */
export function playUrlOnce(url: string, gen = playGeneration): Promise<PlayResult> {
  if (typeof Audio === 'undefined' || !url.trim()) return Promise.resolve('error')
  if (gen !== playGeneration) return Promise.resolve('aborted')

  cancelSpeech()
  return new Promise((resolve) => {
    if (gen !== playGeneration) {
      resolve('aborted')
      return
    }
    const audio = new Audio(url)
    currentAudio = audio
    let settled = false
    const done = (result: PlayResult) => {
      if (settled) return
      settled = true
      if (currentAudio === audio) currentAudio = null
      resolve(gen !== playGeneration ? 'aborted' : result)
    }
    audio.onended = () => done('ok')
    audio.onerror = () => done('error')
    void audio.play().catch(() => done('error'))
  })
}

/** Speak via Web Speech once. */
export function speakOnce(
  text: string,
  lang: string,
  rate = 0.95,
  gen = playGeneration,
): Promise<PlayResult> {
  if (!text.trim()) return Promise.resolve('ok')
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve('error')
  if (gen !== playGeneration) return Promise.resolve('aborted')

  cancelSpeech()
  return new Promise((resolve) => {
    if (gen !== playGeneration) {
      resolve('aborted')
      return
    }
    const u = new SpeechSynthesisUtterance(text.trim())
    u.lang = lang
    u.rate = rate
    const voice = pickVoice(lang)
    if (voice) u.voice = voice
    currentUtterance = u
    let settled = false
    const done = (result: PlayResult) => {
      if (settled) return
      settled = true
      if (currentUtterance === u) currentUtterance = null
      resolve(gen !== playGeneration ? 'aborted' : result)
    }
    u.onend = () => done('ok')
    u.onerror = () => done('error')
    const start = () => window.speechSynthesis.speak(u)
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v = pickVoice(lang)
        if (v) u.voice = v
        window.speechSynthesis.onvoiceschanged = null
        start()
      }
    } else {
      start()
    }
  })
}

/** English word/phrase: Youdao first, then speech / Baidu en. */
export async function playEnglish(text: string, accent: 'us' | 'uk' = 'uk'): Promise<PlayResult> {
  const gen = playGeneration
  const t = text.trim()
  if (!t) return 'ok'
  let r = await playUrlOnce(youdaoVoiceUrl(t, accent), gen)
  if (r === 'aborted') return r
  if (r === 'ok') return r
  r = await playUrlOnce(baiduTtsUrl(t, 'en', 4), gen)
  if (r === 'aborted' || r === 'ok') return r
  return speakOnce(t, accent === 'us' ? 'en-US' : 'en-GB', 0.92, gen)
}

/** Chinese gloss: Baidu TTS first, then zh speech. */
export async function playChinese(text: string): Promise<PlayResult> {
  const gen = playGeneration
  const t = text.trim()
  if (!t) return 'ok'
  let r = await playUrlOnce(baiduTtsUrl(t, 'zh', 5), gen)
  if (r === 'aborted') return r
  if (r === 'ok') return r
  return speakOnce(t, 'zh-CN', 0.95, gen)
}

export async function pauseBetween(ms = 350): Promise<PlayResult> {
  return wait(ms, playGeneration)
}
