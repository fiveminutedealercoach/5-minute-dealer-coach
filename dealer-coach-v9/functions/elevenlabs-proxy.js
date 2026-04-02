// Cloudflare Pages Function — ElevenLabs TTS proxy
// Two voice IDs by dept. Per-persona stability/style variation.

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

    if (!apiKey) return new Response(JSON.stringify({error:'ELEVENLABS_API_KEY not set'}),{status:500,headers:{'Content-Type':'application/json',...cors}})

    // Voice priority:
    // 1. explicit voiceId in request
    // 2. ELEVENLABS_VOICE_ID_SALES (sales dept or default)
    // 3. ELEVENLABS_VOICE_ID_SERVICE (service dept)
    // 4. ELEVENLABS_VOICE_ID (legacy fallback)
    let voice = voiceId
    if (!voice) {
      if (deptKey === 'voiceIdService') {
        voice = env.ELEVENLABS_VOICE_ID_SERVICE || env.ELEVENLABS_VOICE_ID_SALES || env.ELEVENLABS_VOICE_ID
      } else {
        // Sales OR any non-dept call — use sales voice as primary
        voice = env.ELEVENLABS_VOICE_ID_SALES || env.ELEVENLABS_VOICE_ID
      }
    }

    if (!voice) return new Response(JSON.stringify({error:'No ElevenLabs Voice ID configured. Set ELEVENLABS_VOICE_ID_SALES in Cloudflare env vars.'}),{status:500,headers:{'Content-Type':'application/json',...cors}})

    const settings = voiceSettings
      ? {...voiceSettings, use_speaker_boost:true}
      : {stability:0.45, similarity_boost:0.82, style:0.35, use_speaker_boost:true}

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`,{
      method:'POST',
      headers:{'xi-api-key':apiKey,'Content-Type':'application/json','Accept':'audio/mpeg'},
      body:JSON.stringify({text, model_id:'eleven_turbo_v2_5', voice_settings:settings})
    })

    if (!r.ok) {
      const err = await r.text()
      return new Response(JSON.stringify({error:err}),{status:r.status,headers:{'Content-Type':'application/json',...cors}})
    }

    const buf = await r.arrayBuffer()
    return new Response(buf,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-cache',...cors}})
  } catch(e) {
    return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json',...cors}})
  }
}

export async function onRequestOptions() {
  return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})
}
