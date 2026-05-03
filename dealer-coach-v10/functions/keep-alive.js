// ── Supabase Keep-Alive Worker ────────────────────────────────
// Runs on a schedule to prevent Supabase free tier from pausing
// Deploy to: dealer-coach-v10/functions/keep-alive.js

export async function onRequestGet(context) {
  const result = await pingSupabase(context)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function pingSupabase(context) {
  const url = context.env.SUPABASE_URL
  const key = context.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return { success: false, error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' }
  }

  try {
    const res = await fetch(`${url}/rest/v1/dealer_index?limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      }
    })
    return {
      success: res.ok,
      status: res.status,
      timestamp: new Date().toISOString(),
      message: res.ok ? 'Supabase pinged successfully' : 'Ping failed'
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
