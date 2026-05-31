import { getDb } from './database'

let activeRecorder: MediaRecorder | null = null
let activeStream: MediaStream | null = null

function generateKey(): string {
  return `audio_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function saveAudio(blob: Blob): Promise<string> {
  const key = generateKey()
  const arrayBuffer = await blob.arrayBuffer()
  const db = await getDb()
  await db.put('audio', arrayBuffer, key)
  return key
}

export async function loadAudio(key: string): Promise<Blob> {
  const db = await getDb()
  const data = await db.get('audio', key) as ArrayBuffer | undefined
  if (!data) throw new Error('Audio not found')
  return new Blob([data], { type: 'audio/webm' })
}

export async function deleteAudio(key: string): Promise<void> {
  const db = await getDb()
  await db.delete('audio', key)
}

function safeAtob(base64: string): string | null {
  try { return atob(base64) } catch { return null }
}

export async function saveAudioFromBase64(base64: string): Promise<string> {
  const binary = safeAtob(base64)
  if (!binary) throw new Error('Invalid audio data')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'audio/webm' })
  return saveAudio(blob)
}

export function startRecording(opts: {
  onData: (blob: Blob) => void
  onStop: (blob: Blob) => void
  onError: (err: Error) => void
}): void {
  if (!navigator.mediaDevices?.getUserMedia) {
    opts.onError(new Error('Recording not supported on this device'))
    return
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const chunks: Blob[] = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      activeRecorder = recorder
      activeStream = stream
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
        opts.onData(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        activeRecorder = null
        activeStream = null
        opts.onStop(blob)
      }
      recorder.onerror = (event) => {
        activeRecorder = null
        opts.onError(new Error(`Recording failed: ${event.error}`))
      }
      // Start recording with a 100ms data collection interval
      recorder.start(100)
    })
    .catch((err) => opts.onError(err))
}

export function stopRecording(): void {
  if (activeRecorder && activeRecorder.state !== 'inactive') {
    activeRecorder.stop()
    // Don't null out activeRecorder here - let onstop handler do cleanup
  }
}

export function pauseRecording(): void {
  if (activeRecorder?.state === 'recording') activeRecorder.pause()
}

export function resumeRecording(): void {
  if (activeRecorder?.state === 'paused') activeRecorder.resume()
}

export function cancelRecording(): void {
  if (activeRecorder && activeRecorder.state !== 'inactive') {
    activeRecorder.ondataavailable = null
    activeRecorder.onstop = null
    activeRecorder.onerror = null
    activeRecorder.stop()
    activeStream?.getTracks().forEach((t) => t.stop())
    activeStream = null
    activeRecorder = null
  }
}

export function getRecordingState(): string {
  return activeRecorder?.state || 'inactive'
}
