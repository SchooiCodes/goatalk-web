export async function transcribeWithOpenAI(blob: Blob): Promise<string> {
  const apiKey = localStorage.getItem('openai_api_key')
  if (!apiKey) throw new Error('OpenAI API key not set. Add it in Settings.')

  const formData = new FormData()
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Whisper failed (${res.status})`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}

export async function transcribeWithHuggingFace(blob: Blob): Promise<string> {
  const res = await fetch('/api/transcribe-hf', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HuggingFace relay failed (${res.status})`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}

export async function transcribeWithDeepgram(blob: Blob): Promise<string> {
  const res = await fetch('/api/transcribe-deepgram', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Deepgram relay failed (${res.status})`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}

export async function transcribeWithGroq(blob: Blob): Promise<string> {
  const apiKey = localStorage.getItem('groq_api_key')
  if (!apiKey) throw new Error('Groq API key not set. Add it in Settings.')

  const formData = new FormData()
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'en')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Groq failed (${res.status})`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}
