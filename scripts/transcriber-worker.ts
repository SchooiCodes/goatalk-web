interface Env {
  AI: any
  GOATALK_KV: KVNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/transcribe' && request.method === 'POST' && env.AI) {
      try {
        const audioBuf = await request.arrayBuffer()
        const input = new Uint8Array(audioBuf)
        const result = await env.AI.run('@cf/openai/whisper', { audio: [...input] })
        const text = (result as any)?.text || ''
        return new Response(JSON.stringify({ text: text.trim() }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || 'Transcription failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
    }
    return new Response('Not found', { status: 404 })
  },
}
