interface Env {
  GOATALK_KV: KVNamespace
  CLOUDFLARE_API_TOKEN?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}

function getPairingHash(request: Request): string | null {
  const hash = request.headers.get('X-Pairing-Hash')
  if (!hash || hash.length !== 64) return null
  return hash
}

async function handleListRants(env: Env, request: Request) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const prefix = `shared/${hash}/rants/`
  const result = await env.GOATALK_KV.list({ prefix })
  const rants = result.keys.map((k) => ({
    id: k.name.replace(prefix, '').replace('.enc', ''),
  }))
  return json(rants)
}

async function handleUploadRant(request: Request, env: Env) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing rant id' }, 400)

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 10 * 1024 * 1024) {
    return json({ error: 'Rant too large' }, 413)
  }

  const key = `shared/${hash}/rants/${id}.enc`
  await env.GOATALK_KV.put(key, bytes)
  return json({ success: true }, 201)
}

async function handleGetRant(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/rants/${id}.enc`
  const value = await env.GOATALK_KV.get(key, { type: 'arrayBuffer' })
  if (!value) return json({ error: 'Not found' }, 404)
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream' } })
}

async function handleDeleteRant(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  await env.GOATALK_KV.delete(`shared/${hash}/rants/${id}.enc`)
  // Also delete read metadata if present
  await env.GOATALK_KV.delete(`shared/${hash}/rants/${id}.read`)
  return json({ success: true })
}

// Mark rant as read (listened)
async function handleMarkRantRead(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const timestamp = new Date().toISOString()
  await env.GOATALK_KV.put(`shared/${hash}/rants/${id}.read`, timestamp)
  return json({ success: true, timestamp })
}

// Get read status
async function handleGetRantRead(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const ts = await env.GOATALK_KV.get(`shared/${hash}/rants/${id}.read`)
  if (!ts) return json({ read: false })
  return json({ read: true, timestamp: ts })
}

async function handleGetProfile(env: Env, request: Request) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  if (!name) return json({ error: 'Missing name' }, 400)
  const key = `shared/${hash}/profile/${name}`
  const value = await env.GOATALK_KV.get(key, { type: 'arrayBuffer' })
  if (!value) return json({ error: 'Not found' }, 404)
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream' } })
}

async function handleUploadProfile(request: Request, env: Env) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  if (!name) return json({ error: 'Missing name' }, 400)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 200 * 1024) return json({ error: 'Profile data too large' }, 413)
  const key = `shared/${hash}/profile/${name}`
  await env.GOATALK_KV.put(key, bytes)
  return json({ success: true }, 201)
}

function getTransferHash(request: Request): string | null {
  const hash = request.headers.get('X-Transfer-Hash')
  if (!hash || hash.length !== 64) return null
  return hash
}

async function handleExportSession(request: Request, env: Env) {
  const hash = getTransferHash(request)
  if (!hash) return json({ error: 'Missing transfer hash' }, 400)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 10240) return json({ error: 'Session data too large' }, 413)
  await env.GOATALK_KV.put(`transfer/${hash}`, bytes)
  return json({ success: true }, 201)
}

async function handleImportSession(env: Env, request: Request) {
  const hash = getTransferHash(request)
  if (!hash) return json({ error: 'Missing transfer hash' }, 400)
  const key = `transfer/${hash}`
  const value = await env.GOATALK_KV.get(key, { type: 'arrayBuffer' })
  if (!value) return json({ error: 'Not found' }, 404)
  await env.GOATALK_KV.delete(key)
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream' } })
}

async function handleListNotes(env: Env, request: Request) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const prefix = `shared/${hash}/notes/`
  const result = await env.GOATALK_KV.list({ prefix })
  const notes = result.keys.map((k) => ({
    id: k.name.replace(prefix, '').replace('.enc', ''),
  }))
  return json(notes)
}

async function handleUploadNote(request: Request, env: Env) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing note id' }, 400)

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 200 * 1024) {
    return json({ error: 'Note too large' }, 413)
  }

  const key = `shared/${hash}/notes/${id}.enc`
  await env.GOATALK_KV.put(key, bytes)
  return json({ success: true }, 201)
}

async function handleGetNote(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/notes/${id}.enc`
  const value = await env.GOATALK_KV.get(key, { type: 'arrayBuffer' })
  if (!value) return json({ error: 'Not found' }, 404)
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream' } })
}

async function handleDeleteNote(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/notes/${id}.enc`
  await env.GOATALK_KV.delete(key)
  return json({ success: true })
}

async function handleListLongs(env: Env, request: Request) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const prefix = `shared/${hash}/longs/`
  const result = await env.GOATALK_KV.list({ prefix })
  const entries = result.keys.map((k) => ({
    id: k.name.replace(prefix, '').replace('.enc', ''),
  }))
  return json(entries)
}

async function handleUploadLong(request: Request, env: Env) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing long id' }, 400)

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 1024 * 1024) {
    return json({ error: 'Long too large' }, 413)
  }

  const key = `shared/${hash}/longs/${id}.enc`
  await env.GOATALK_KV.put(key, bytes)
  return json({ success: true }, 201)
}

async function handleGetLong(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/longs/${id}.enc`
  const value = await env.GOATALK_KV.get(key, { type: 'arrayBuffer' })
  if (!value) return json({ error: 'Not found' }, 404)
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream' } })
}

async function handleDeleteLong(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/longs/${id}.enc`
  await env.GOATALK_KV.delete(key)
  return json({ success: true })
}

interface DeviceInfo {
  id: string
  name: string
  lastSeen: string
  createdAt: string
}

async function handleListDevices(env: Env, request: Request) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const prefix = `shared/${hash}/devices/`
  const result = await env.GOATALK_KV.list({ prefix })
  const devices: DeviceInfo[] = []
  for (const key of result.keys) {
    const value = await env.GOATALK_KV.get(key.name, { type: 'text' })
    if (value) devices.push(JSON.parse(value))
  }
  return json(devices)
}

async function handleRegisterDevice(request: Request, env: Env) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const body = await request.json() as { id: string; name: string }
  if (!body.id || !body.name) return json({ error: 'Missing id or name' }, 400)
  const now = new Date().toISOString()
  const device: DeviceInfo = { id: body.id, name: body.name, lastSeen: now, createdAt: now }
  await env.GOATALK_KV.put(`shared/${hash}/devices/${body.id}`, JSON.stringify(device))
  return json(device, 201)
}

async function handleGetDevice(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const value = await env.GOATALK_KV.get(`shared/${hash}/devices/${id}`, { type: 'text' })
  if (!value) return json({ error: 'Not found' }, 404)
  return json(JSON.parse(value))
}

async function handleUpdateDevice(request: Request, env: Env, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const body = await request.json() as { name?: string }
  const key = `shared/${hash}/devices/${id}`
  const existing = await env.GOATALK_KV.get(key, { type: 'text' })
  if (!existing) return json({ error: 'Not found' }, 404)
  const device: DeviceInfo = { ...JSON.parse(existing), name: body.name ?? JSON.parse(existing).name, lastSeen: new Date().toISOString() }
  await env.GOATALK_KV.put(key, JSON.stringify(device))
  return json(device)
}

async function handleUnregisterDevice(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  await env.GOATALK_KV.delete(`shared/${hash}/devices/${id}`)
  return json({ success: true })
}

async function handleDeviceHeartbeat(env: Env, request: Request, id: string) {
  const hash = getPairingHash(request)
  if (!hash) return json({ error: 'Missing pairing hash' }, 400)
  const key = `shared/${hash}/devices/${id}`
  const existing = await env.GOATALK_KV.get(key, { type: 'text' })
  if (!existing) return json({ error: 'Not found' }, 404)
  const device: DeviceInfo = { ...JSON.parse(existing), lastSeen: new Date().toISOString() }
  await env.GOATALK_KV.put(key, JSON.stringify(device))
  return json({ success: true })
}

export async function onRequest(context: EventContext<Env, string, any>) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\//, '')

  try {
    if (path === 'rants') {
      if (request.method === 'GET') return handleListRants(env, request)
      if (request.method === 'POST') return handleUploadRant(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path.startsWith('rants/')) {
      const sub = path.replace('rants/', '')
      const parts = sub.split('/')
      const id = parts[0]
      if (!id) return json({ error: 'Not found' }, 404)
      // /rants/<id>/read endpoints
      if (parts[1] === 'read') {
        if (request.method === 'POST') return handleMarkRantRead(env, request, id)
        if (request.method === 'GET') return handleGetRantRead(env, request, id)
        return json({ error: 'Method not allowed' }, 405)
      }
      if (request.method === 'GET') return handleGetRant(env, request, id)
      if (request.method === 'DELETE') return handleDeleteRant(env, request, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path === 'profile') {
      if (request.method === 'GET') return handleGetProfile(env, request)
      if (request.method === 'POST') return handleUploadProfile(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path === 'notes') {
      if (request.method === 'GET') return handleListNotes(env, request)
      if (request.method === 'POST') return handleUploadNote(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path.startsWith('notes/')) {
      const id = path.replace('notes/', '')
      if (!id) return json({ error: 'Not found' }, 404)
      if (request.method === 'GET') return handleGetNote(env, request, id)
      if (request.method === 'DELETE') return handleDeleteNote(env, request, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    // Device endpoints
    if (path === 'devices') {
      if (request.method === 'GET') return handleListDevices(env, request)
      if (request.method === 'POST') return handleRegisterDevice(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path.startsWith('devices/')) {
      const id = path.replace('devices/', '')
      if (request.method === 'GET') return handleGetDevice(env, request, id)
      if (request.method === 'PUT') return handleUpdateDevice(request, env, id)
      if (request.method === 'DELETE') return handleUnregisterDevice(env, request, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    // Device heartbeat
    if (path.startsWith('devices/') && path.endsWith('/heartbeat')) {
      const id = path.replace('devices/', '').replace('/heartbeat', '')
      if (request.method === 'POST') return handleDeviceHeartbeat(env, request, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path === 'longs') {
      if (request.method === 'GET') return handleListLongs(env, request)
      if (request.method === 'POST') return handleUploadLong(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path.startsWith('longs/')) {
      const id = path.replace('longs/', '')
      if (!id) return json({ error: 'Not found' }, 404)
      if (request.method === 'GET') return handleGetLong(env, request, id)
      if (request.method === 'DELETE') return handleDeleteLong(env, request, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (path === 'migrate') {
      if (request.method === 'POST') return handleExportSession(request, env)
      if (request.method === 'GET') return handleImportSession(env, request)
      return json({ error: 'Method not allowed' }, 405)
    }

    // Model proxy: relay HF model files with permissive CORS
    if (path.startsWith('model-proxy')) {
      const modelPath = url.searchParams.get('path')
      if (!modelPath) return json({ error: 'Missing path' }, 400)
      const modelUrl = `https://huggingface.co${modelPath.startsWith('/') ? '' : '/'}${modelPath}`
      const resp = await fetch(modelUrl)
      const headers = new Headers(resp.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      headers.set('Access-Control-Allow-Headers', '*')
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      })
    }

    // Config: returns client-safe settings
    if (path === 'config') {
      return json({
        huggingFaceToken: !!env.HUGGINGFACE_TOKEN,
        deepgramConfigured: !!env.DEEPGRAM_API_KEY,
      })
    }

    // Usage: check remaining credits for server-configured providers
    if (path === 'usage') {
      const result: Record<string, { status: string; detail?: string }> = {}

      // Check Deepgram
      if (env.DEEPGRAM_API_KEY) {
        try {
          const projects = await fetch('https://api.deepgram.com/v1/projects', {
            headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` },
          })
          if (projects.ok) {
            result.deepgram = { status: 'ok', detail: 'Ready' }
          } else {
            result.deepgram = { status: 'error', detail: 'Invalid key' }
          }
        } catch {
          result.deepgram = { status: 'error', detail: 'Check failed' }
        }
      }

      // Check HuggingFace
      if (env.HUGGINGFACE_TOKEN) {
        try {
          // Try a lightweight inference probe to check credits
          const probe = await fetch(
            'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
                'Content-Type': 'audio/wav',
              },
              body: new Uint8Array(44), // minimal valid WAV header
            },
          )
          if (probe.ok || probe.status === 500) {
            // 500 means the model processed it but found the audio too short — still means credits are fine
            result.huggingFace = { status: 'ok', detail: 'Credits available' }
          } else if (probe.status === 402 || probe.status === 403) {
            result.huggingFace = { status: 'depleted', detail: 'Credits depleted' }
          } else {
            result.huggingFace = { status: 'ok', detail: 'Ready' }
          }
        } catch {
          result.huggingFace = { status: 'error', detail: 'Check failed' }
        }
      }

      return json(result)
    }

    // Whisper transcription relay (optional — client can also call OpenAI directly)
    if (path === 'transcribe') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      const token = env.OPENAI_API_KEY
      if (!token) return json({ error: 'Transcription not configured' }, 500)

      try {
        // Relay the raw audio blob to OpenAI's Whisper API
        const contentType = request.headers.get('content-type') || 'audio/wav'
        const body = await request.arrayBuffer()
        const formData = new Uint8Array(body)

        // Build multipart for OpenAI
        const boundary = '----Boundary' + Math.random().toString(36).slice(2)
        const encoder = new TextEncoder()
        const disp = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: ${contentType}\r\n\r\n`
        const modelPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`
        const header = encoder.encode(disp)
        const footer = encoder.encode(modelPart)

        const full = new Uint8Array(header.byteLength + body.byteLength + footer.byteLength)
        full.set(header, 0)
        full.set(new Uint8Array(body), header.byteLength)
        full.set(footer, header.byteLength + body.byteLength)

        const aiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: full,
        })

        if (!aiRes.ok) {
          const errText = await aiRes.text()
          return json({ error: errText }, 502)
        }

        const aiData = await aiRes.json() as any
        return json({ text: (aiData.text || '').trim() })
      } catch (e: any) {
        return json({ error: e?.message || 'Transcription failed' }, 500)
      }
    }

    // HuggingFace Whisper relay (client can't call api-inference.huggingface.co directly due to CORS)
    if (path === 'transcribe-hf') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      const token = env.HUGGINGFACE_TOKEN
      if (!token) return json({ error: 'HuggingFace not configured' }, 500)

      try {
        const blob = await request.arrayBuffer()
        if (blob.byteLength === 0) return json({ error: 'Empty audio' }, 400)

        const resp = await fetch(
          'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': request.headers.get('content-type') || 'audio/webm',
            },
            body: blob,
          },
        )

        if (!resp.ok) {
          // HF may return 503 if model is loading; retry once after a short delay
          if (resp.status === 503) {
            await new Promise((r) => setTimeout(r, 5000))
            const retry = await fetch(
              'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': request.headers.get('content-type') || 'audio/webm',
                },
                body: blob,
              },
            )
            if (!retry.ok) {
              const errText = await retry.text()
              return json({ error: errText || `HuggingFace failed (${retry.status})` }, 502)
            }
            const data = await retry.json() as any
            return json({ text: (data.text || '').trim() })
          }
          const errText = await resp.text()
          return json({ error: errText || `HuggingFace failed (${resp.status})` }, 502)
        }

        const data = await resp.json() as any
        return json({ text: (data.text || '').trim() })
      } catch (e: any) {
        return json({ error: e?.message || 'HuggingFace transcription relay failed' }, 500)
      }
    }

    // Deepgram relay
    if (path === 'transcribe-deepgram') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      const token = env.DEEPGRAM_API_KEY
      if (!token) return json({ error: 'Deepgram not configured' }, 500)

      try {
        const blob = await request.arrayBuffer()
        if (blob.byteLength === 0) return json({ error: 'Empty audio' }, 400)

        const resp = await fetch(
          'https://api.deepgram.com/v1/listen?language=en&model=whisper&smart_format=true',
          {
            method: 'POST',
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': request.headers.get('content-type') || 'audio/webm',
            },
            body: blob,
          },
        )

        if (!resp.ok) {
          const errText = await resp.text()
          return json({ error: errText || `Deepgram failed (${resp.status})` }, 502)
        }

        const data = await resp.json() as any
        const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        return json({ text: transcript.trim() })
      } catch (e: any) {
        return json({ error: e?.message || 'Deepgram transcription relay failed' }, 500)
      }
    }

    return json({ error: 'Not found' }, 404)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
}
