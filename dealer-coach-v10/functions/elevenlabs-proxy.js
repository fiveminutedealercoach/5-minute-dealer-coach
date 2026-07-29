// Cloudflare Pages Function — ElevenLabs TTS proxy
// Supports per-persona voice IDs passed in the request body
// Falls back to ELEVENLABS_VOICE_ID env var if none provided
//
// AUDIO QUALITY FIXES:
//  1. language_code:'en' — turbo_v2_5 is a MULTILINGUAL model. With no language
//     pinned it infers per request and, on short or number-heavy text, renders
//     English with foreign phonetics. That was the "sounds like another language
//     mixed in" distortion. Pinning the language stops the drift.
//  2. Calmer voice settings — style exaggeration is the biggest source of
//     artifacts, and it compounds at low stability. style 0.35 + stability 0.45
//     produced warbling. Raised stability, dropped style near zero.
//  3. speakable() — grades and scores ("8/10", "A+", "85%") are exactly what TTS
//     mangles. Spelling them out before sending is far more reliable than hoping
//     the model handles them.
export async function onRequestPost(context) {
  const { request, env } = context
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Turn score/grade notation into words so the model reads it cleanly.
  const speakable = (raw) => {
    let t = String(raw == null ? '' : raw)
    t = t.split('—').join(' - ').split('–').join(' - ')
    // 8/10, 7 / 10  ->  8 out of 10
    t = t.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 out of $2')
    // A+, B-, C+ -> A plus, B minus  (letter grades only, not mid-word)
    t = t.replace(/\b([A-D])\+/g, '$1 plus')
    t = t.replace(/\b([A-D])-(?![A-Za-z])/g, '$1 minus')
    // 85% -> 85 percent
    t = t.replace(/(\d+)\s*%/g, '$1 percent')
    // collapse runs of whitespace the replacements may leave behind
    t = t.replace(/\s{2,}/g, ' ').trim()
    return t
  }

  try {
    const { text, voiceId, voiceSettings } = await request.json()
    const apiKey = env.ELEVENLABS_API_KEY
    if (!apiKey) return new Response(
      JSON.stringify({error:'ELEVENLABS_API_KEY not set'}),
      {status:500, headers:{'Content-Type':'application/json',...cors}}
    )
    // Use persona voice ID from request, fall back to env var
    const voice = voiceId || env.ELEVENLABS_VOICE_ID
    if (!voice) return new Response(
      JSON.stringify({error:'No voice ID — set ELEVENLABS_VOICE_ID in Cloudflare env vars'}),
      {status:500, headers:{'Content-Type':'application/json',...cors}}
    )

    // Calmer defaults. If a persona sends its own settings we still clamp style
    // down and floor stability, because that pair is what caused the artifacts.
    const base = {stability:0.62, similarity_boost:0.80, style:0.10, use_speaker_boost:true}
    const settings = voiceSettings
      ? {
          ...base,
          ...voiceSettings,
          stability: Math.max(0.55, Number(voiceSettings.stability ?? base.stability)),
          style:     Math.min(0.20, Number(voiceSettings.style     ?? base.style)),
          use_speaker_boost: true,
        }
      : base

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: speakable(text),
        model_id: 'eleven_turbo_v2_5',
        language_code: 'en',
        voice_settings: settings,
      })
    })
    if (!r.ok) {
      const err = await r.text()
      return new Response(
        JSON.stringify({error:err}),
        {status:r.status, headers:{'Content-Type':'application/json',...cors}}
      )
    }
    const buf = await r.arrayBuffer()
    return new Response(buf, {
      headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-cache',...cors}
    })
  } catch(e) {
    return new Response(
      JSON.stringify({error:e.message}),
      {status:500, headers:{'Content-Type':'application/json',...cors}}
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers:{
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
    }
  })
}
