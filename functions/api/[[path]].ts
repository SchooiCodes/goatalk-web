interface Env {
  GOATALK_KV: KVNamespace
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

    // Whisper transcription (optional - for future use with API key)
    if (path === 'transcribe') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      // This endpoint is for future use if we want to add Whisper transcription
      // Currently using Web Speech API for instant transcription
      return json({ error: 'Whisper transcription not yet configured' }, 501)
    }

    return json({ error: 'Not found' }, 404)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
}
