// Cloudflare Pages Function — ElevenLabs TTS proxy
// Supports two voice IDs (sales/service) and per-persona voice settings

export async function onRequestPost(context) {
  const { request, env } = context
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const { text, voiceId, deptKey, voiceSettings } = await request.json()
    const apiKey = env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors }
      })
    }

    // Voice selection priority:
    // 1. Explicit voiceId in request
    // 2. Dept-specific env var (ELEVENLABS_VOICE_ID_SALES or ELEVENLABS_VOICE_ID_SERVICE)
    // 3. Generic ELEVENLABS_VOICE_ID fallback
    let voice = voiceId
    if (!voice && deptKey) {
      voice = deptKey === 'voiceIdSales'
        ? (env.ELEVENLABS_VOICE_ID_SALES || env.ELEVENLABS_VOICE_ID)
        : (env.ELEVENLABS_VOICE_ID_SERVICE || env.ELEVENLABS_VOICE_ID_SALES || env.ELEVENLABS_VOICE_ID)
    }
    if (!voice) voice = env.ELEVENLABS_VOICE_ID

    if (!voice) {
      return new Response(JSON.stringify({ error: 'ElevenLabs Voice ID not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors }
      })
    }

    // Per-persona voice settings override defaults
    const settings = voiceSettings || { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true }
    if (!settings.use_speaker_boost) settings.use_speaker_boost = true

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', voice_settings: settings })
    })

    if (!r.ok) {
      const err = await r.text()
      return new Response(JSON.stringify({ error: err }), {
        status: r.status, headers: { 'Content-Type': 'application/json', ...cors }
      })
    }

    const buf = await r.arrayBuffer()
    return new Response(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache', ...cors } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors }
    })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
