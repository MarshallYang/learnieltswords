import type { Word } from '../types'
import { pauseBetween, playChinese, playEnglish, stopAllPlayback, type PlayResult } from './speak'

export type AutoplayHandlers = {
  onWordStart?: (index: number, word: Word) => void
  onStep?: (index: number, step: 'word' | 'meaning' | 'example') => void
  onDone?: () => void
  onAbort?: () => void
}

function stripPosNoise(meaningZh: string): string {
  // Keep readable for TTS: "v. 放弃；抛弃" → "放弃；抛弃" is optional; keep full for clarity
  return meaningZh.replace(/\s+/g, ' ').trim()
}

/**
 * Sequentially play word → Chinese meaning → English example for each item.
 * Call stopAllPlayback() (or leave the page) to abort.
 */
export async function autoplayWordList(words: Word[], handlers: AutoplayHandlers = {}): Promise<void> {
  stopAllPlayback()
  // New generation after stop — start fresh
  // stopAllPlayback already bumped generation; subsequent plays capture new gen

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    handlers.onWordStart?.(i, w)

    handlers.onStep?.(i, 'word')
    let r: PlayResult = await playEnglish(w.word, 'uk')
    if (r === 'aborted') {
      handlers.onAbort?.()
      return
    }
    r = await pauseBetween(280)
    if (r === 'aborted') {
      handlers.onAbort?.()
      return
    }

    handlers.onStep?.(i, 'meaning')
    r = await playChinese(stripPosNoise(w.meaningZh || ''))
    if (r === 'aborted') {
      handlers.onAbort?.()
      return
    }
    r = await pauseBetween(280)
    if (r === 'aborted') {
      handlers.onAbort?.()
      return
    }

    const example = w.exampleEn?.trim()
    if (example) {
      handlers.onStep?.(i, 'example')
      r = await playEnglish(example, 'uk')
      if (r === 'aborted') {
        handlers.onAbort?.()
        return
      }
    }

    r = await pauseBetween(500)
    if (r === 'aborted') {
      handlers.onAbort?.()
      return
    }
  }

  handlers.onDone?.()
}
