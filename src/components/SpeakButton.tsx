import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Volume2 } from 'lucide-react'
import { cancelSpeech, playWordAudio, stopAllPlayback } from '../lib/speak'

type Props = {
  word: string
  audioUrl?: string
  className?: string
  label?: string
}

/** Tap-to-play: Youdao online audio (works in CN) with SpeechSynthesis fallback. */
export function SpeakButton({ word, audioUrl, className = '', label = '朗读' }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      stopRef.current?.()
      cancelSpeech()
    }
  }, [])

  useEffect(() => {
    stopRef.current?.()
    cancelSpeech()
    setSpeaking(false)
  }, [word])

  const onPlay = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (speaking) {
      stopRef.current?.()
      stopAllPlayback()
      cancelSpeech()
      setSpeaking(false)
      return
    }
    const handle = playWordAudio(word, audioUrl, {
      accent: 'uk',
      lang: 'en-GB',
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
    stopRef.current = handle.stop
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`${label} ${word}`}
      title={`${label}（在线发音）`}
      className={`tap-active inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:text-brand-300 ${
        speaking
          ? 'border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-300 dark:bg-brand-950 dark:text-brand-300'
          : ''
      } ${className}`}
    >
      <Volume2 className={`h-4 w-4 ${speaking ? 'animate-pulse' : ''}`} aria-hidden />
    </button>
  )
}
