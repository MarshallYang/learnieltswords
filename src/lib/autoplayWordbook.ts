import type { Word } from '../types'
import { meaningForTts, pauseBetween, playChinese, playEnglish, stopAllPlayback, type PlayResult } from './speak'

export type AutoplayHandlers = {
  onWordStart?: (index: number, word: Word) => void
  onStep?: (index: number, step: 'word' | 'meaning' | 'example') => void
  onDone?: () => void
  onAbort?: () => void
}

async function stepOrAbort(r: PlayResult, onAbort?: () => void): Promise<boolean> {
  if (r === 'aborted') {
    onAbort?.()
    return false
  }
  return true
}

/**
 * Sequentially play word → Chinese meaning → English example.
 * Remote TTS is throttled; Chinese prefers local speech to avoid QoS skips.
 */
export async function autoplayWordList(words: Word[], handlers: AutoplayHandlers = {}): Promise<void> {
  stopAllPlayback()

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    handlers.onWordStart?.(i, w)

    handlers.onStep?.(i, 'word')
    let r = await playEnglish(w.word, 'uk')
    if (!(await stepOrAbort(r, handlers.onAbort))) return
    // Even if word audio failed, pause briefly then still read translation
    r = await pauseBetween(r === 'ok' ? 450 : 700)
    if (!(await stepOrAbort(r, handlers.onAbort))) return

    handlers.onStep?.(i, 'meaning')
    const meaning = meaningForTts(w.meaningZh || '')
    r = await playChinese(meaning)
    if (!(await stepOrAbort(r, handlers.onAbort))) return
    // If meaning failed, wait a bit longer before example (avoid hammering)
    r = await pauseBetween(r === 'ok' ? 500 : 900)
    if (!(await stepOrAbort(r, handlers.onAbort))) return

    const example = w.exampleEn?.trim()
    if (example) {
      handlers.onStep?.(i, 'example')
      r = await playEnglish(example, 'uk')
      if (!(await stepOrAbort(r, handlers.onAbort))) return
    }

    r = await pauseBetween(750)
    if (!(await stepOrAbort(r, handlers.onAbort))) return
  }

  handlers.onDone?.()
}
