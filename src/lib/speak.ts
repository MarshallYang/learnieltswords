/** Pronunciation helper tuned for mainland China: throttle remotes, prefer local zh TTS. */

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null
let playGeneration = 0
let remoteGate: Promise<void> = Promise.resolve()
let lastRemoteAt = 0
const REMOTE_GAP_MS = 1100

export function youdaoVoiceUrl(word: string, accent: 'us' | 'uk' = 'uk'): string {
  const type = accent === 'us' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.trim())}&type=${type}`
}

export function baiduTtsUrl(text: string, lan: 'zh' | 'en' = 'zh', spd = 5): string {
  return `https://fanyi.baidu.com/gettts?lan=${lan}&text=${encodeURIComponent(text.trim())}&spd=${spd}&source=web`
}

export function sogouZhTtsUrl(text: string): string {
  return `https://fanyi.sogou.com/reventondc/synthesis?text=${encodeURIComponent(text.trim())}&speed=1&lang=zh-CHS&from=translateweb&speaker=6`
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
  const lower = langPref.toLowerCase()
  const prefix = lower.slice(0, 2)

  const scored = voices
    .map((v) => {
      const lang = (v.lang || '').toLowerCase()
      let score = 0
      if (lang === lower) score += 50
      if (lang.startsWith(prefix)) score += 20
      if (prefix === 'zh' && /zh|cmn|chinese/.test(lang + v.name.toLowerCase())) score += 30
      if (prefix === 'en' && /en/.test(lang)) score += 10
      // Prefer on-device voices (more reliable offline / in CN)
      if (v.localService) score += 25
      return { v, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.v || null
}

async function ensureVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const existing = window.speechSynthesis.getVoices()
  if (existing.length) return existing
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), timeoutMs)
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer)
      window.speechSynthesis.onvoiceschanged = null
      resolve(window.speechSynthesis.getVoices())
    }
  })
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
  window.speechSynthesis.speak(u)
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
  const ok = speakWord(word, { ...opts, lang: opts.lang || (accent === 'us' ? 'en-US' : 'en-GB') })
  return { mode: ok ? 'speech' : 'none', stop: cancelSpeech }
}

export type PlayResult = 'ok' | 'error' | 'aborted'

function wait(ms: number, gen: number): Promise<PlayResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(gen === playGeneration ? 'ok' : 'aborted'), ms)
  })
}

/** Serialize remote TTS requests with a gap to reduce QoS / rate-limit skips. */
async function withRemoteThrottle<T>(gen: number, fn: () => Promise<T>): Promise<T | 'aborted'> {
  const run = remoteGate.then(async () => {
    if (gen !== playGeneration) return 'aborted' as const
    const waitMs = Math.max(0, REMOTE_GAP_MS - (Date.now() - lastRemoteAt))
    if (waitMs) {
      const r = await wait(waitMs, gen)
      if (r === 'aborted') return 'aborted' as const
    }
    if (gen !== playGeneration) return 'aborted' as const
    lastRemoteAt = Date.now()
    return fn()
  })
  // Keep the chain alive even if this call fails
  remoteGate = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function playUrlOnce(url: string, gen = playGeneration): Promise<PlayResult> {
  if (typeof Audio === 'undefined' || !url.trim()) return Promise.resolve('error')
  if (gen !== playGeneration) return Promise.resolve('aborted')

  return withRemoteThrottle(gen, () => {
    cancelSpeech()
    return new Promise<PlayResult>((resolve) => {
      if (gen !== playGeneration) {
        resolve('aborted')
        return
      }
      const audio = new Audio()
      audio.preload = 'auto'
      currentAudio = audio
      let settled = false
      const done = (result: PlayResult) => {
        if (settled) return
        settled = true
        if (currentAudio === audio) currentAudio = null
        resolve(gen !== playGeneration ? 'aborted' : result)
      }

      // Treat suspiciously short clips after load as failure (rate-limit / empty)
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration < 0.15) {
          done('error')
        }
      }
      audio.onended = () => done('ok')
      audio.onerror = () => done('error')
      audio.src = url
      void audio.play().catch(() => done('error'))
    })
  }).then((r) => (r === 'aborted' ? 'aborted' : r))
}

export async function speakOnce(
  text: string,
  lang: string,
  rate = 0.95,
  gen = playGeneration,
): Promise<PlayResult> {
  if (!text.trim()) return 'ok'
  if (typeof window === 'undefined' || !window.speechSynthesis) return 'error'
  if (gen !== playGeneration) return 'aborted'

  await ensureVoices()
  if (gen !== playGeneration) return 'aborted'

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
    if (voice) {
      u.voice = voice
      // Align lang with chosen voice when possible
      if (voice.lang) u.lang = voice.lang
    }
    currentUtterance = u
    let settled = false
    const done = (result: PlayResult) => {
      if (settled) return
      settled = true
      window.clearInterval(keepAlive)
      if (currentUtterance === u) currentUtterance = null
      resolve(gen !== playGeneration ? 'aborted' : result)
    }
    // Chrome often pauses speechSynthesis in background tabs / long queues
    const keepAlive = window.setInterval(() => {
      if (gen !== playGeneration) {
        done('aborted')
        return
      }
      try {
        window.speechSynthesis.resume()
      } catch {
        /* ignore */
      }
    }, 250)

    u.onend = () => done('ok')
    u.onerror = () => done('error')
    try {
      window.speechSynthesis.resume()
    } catch {
      /* ignore */
    }
    window.speechSynthesis.speak(u)
  })
}

async function playRemoteWithRetries(
  urls: string[],
  gen: number,
  retriesPerUrl = 2,
): Promise<PlayResult> {
  for (const url of urls) {
    for (let i = 0; i < retriesPerUrl; i++) {
      if (gen !== playGeneration) return 'aborted'
      const r = await playUrlOnce(url, gen)
      if (r === 'aborted' || r === 'ok') return r
      const waitR = await wait(400 + i * 500, gen)
      if (waitR === 'aborted') return 'aborted'
    }
  }
  return 'error'
}

/** Short English: Youdao (throttled) then local speech. Long text: local speech first. */
export async function playEnglish(text: string, accent: 'us' | 'uk' = 'uk'): Promise<PlayResult> {
  const gen = playGeneration
  const t = text.trim()
  if (!t) return 'ok'
  const lang = accent === 'us' ? 'en-US' : 'en-GB'
  const long = t.length > 48 || /\s/.test(t)

  if (long) {
    let r = await speakOnce(t, lang, 0.92, gen)
    if (r === 'aborted' || r === 'ok') return r
    // last resort: remote (may QoS)
    r = await playRemoteWithRetries([youdaoVoiceUrl(t, accent), baiduTtsUrl(t, 'en', 4)], gen, 1)
    return r
  }

  let r = await playRemoteWithRetries([youdaoVoiceUrl(t, accent)], gen, 3)
  if (r === 'aborted' || r === 'ok') return r
  r = await speakOnce(t, lang, 0.92, gen)
  if (r === 'aborted' || r === 'ok') return r
  return playRemoteWithRetries([baiduTtsUrl(t, 'en', 4)], gen, 1)
}

/** Prepare Chinese gloss for TTS. */
export function meaningForTts(meaningZh: string): string {
  let t = meaningZh.replace(/\s+/g, ' ').trim()
  // Drop leading POS tags: "v. " "n. " "adj. " "vt. "
  t = t.replace(/^([a-z]{1,5}\.\s*)+/i, '')
  // If mixed EN+ZH, prefer Chinese chunks when substantial
  const zh = t.match(/[\u4e00-\u9fff，。；、：！？“”‘’（）\dA-Za-z\s；，、：]+/g)?.join('') || t
  return zh.replace(/\s{2,}/g, ' ').trim() || t
}

/**
 * Chinese gloss: local zh speech first (no remote QoS), then Sogou/Baidu TTS.
 */
export async function playChinese(text: string): Promise<PlayResult> {
  const gen = playGeneration
  const t = meaningForTts(text)
  if (!t) return 'ok'

  // 1) Local / system Chinese voice — most reliable for translation in CN browsers
  let r = await speakOnce(t, 'zh-CN', 0.92, gen)
  if (r === 'aborted') return r
  if (r === 'ok') return r

  r = await speakOnce(t, 'zh-TW', 0.92, gen)
  if (r === 'aborted' || r === 'ok') return r

  // 2) Remote Chinese TTS with throttle + retry
  r = await playRemoteWithRetries([sogouZhTtsUrl(t), baiduTtsUrl(t, 'zh', 5)], gen, 2)
  return r
}

export async function pauseBetween(ms = 350): Promise<PlayResult> {
  return wait(ms, playGeneration)
}
