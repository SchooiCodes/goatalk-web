import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

export function useTranscription() {
  const { i18n } = useTranslation()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef('')
  const shouldRestartRef = useRef(false)

  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null

  useEffect(() => {
    if (SpeechRecognitionAPI) {
      setModelReady(true)
    } else {
      setModelError('Speech recognition not available — type transcript manually')
    }
  }, [SpeechRecognitionAPI])

  const getLang = () => {
    switch (i18n.language) {
      case 'el': return 'el-GR'
      default: return 'en-US'
    }
  }

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    transcriptRef.current = ''
    setInterimText('')
    setIsTranscribing(true)
    shouldRestartRef.current = true

    const startRecognition = () => {
      if (!shouldRestartRef.current) return

      try {
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = getLang()
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsTranscribing(true)
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptChunk = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              transcriptRef.current += transcriptChunk + ' '
            } else {
              interim += transcriptChunk
            }
          }
          setInterimText(interim)
        }

        recognition.onerror = (event: Event) => {
          const err = event as SpeechRecognitionErrorEvent
          if (err.error === 'no-speech' || err.error === 'aborted') {
            if (shouldRestartRef.current) {
              startRecognition()
            }
          } else if (err.error === 'network') {
            setTimeout(() => {
              if (shouldRestartRef.current) startRecognition()
            }, 1000)
          }
        }

        recognition.onend = () => {
          if (shouldRestartRef.current) {
            startRecognition()
          } else {
            setIsTranscribing(false)
            setInterimText('')
          }
        }

        recognition.start()
        recognitionRef.current = recognition
      } catch (err) {
        console.error('Failed to start speech recognition:', err)
        setIsTranscribing(false)
      }
    }

    startRecognition()
  }, [SpeechRecognitionAPI, i18n.language])

  const stopListening = useCallback((): string => {
    shouldRestartRef.current = false
    setIsTranscribing(false)
    setInterimText('')
    if (recognitionRef.current) {
      try {
        if (recognitionRef.current.state !== 'inactive') {
          recognitionRef.current.stop()
        }
      } catch (err) {
        console.error('Error stopping recognition:', err)
      }
      recognitionRef.current = null
    }
    return transcriptRef.current.trim().replace(/\s+/g, ' ')
  }, [])

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false
      if (recognitionRef.current) {
        try {
          if (recognitionRef.current.state !== 'inactive') {
            recognitionRef.current.stop()
          }
        } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  const transcribe = useCallback(async (_audioBlob: Blob): Promise<string> => {
    return transcriptRef.current.trim().replace(/\s+/g, ' ')
  }, [])

  return { transcribe, startListening, stopListening, isTranscribing, interimText, modelReady, modelError, downloadProgress: 100 }
}
