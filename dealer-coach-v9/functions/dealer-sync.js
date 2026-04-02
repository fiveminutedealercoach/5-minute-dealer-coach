// Cloudflare Pages Function — Dealer KV sync
// Handles dealer registration, rep activity logging, and dashboard reads

export async function onRequestPost(context) {
  const { request, env } = context
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body = await request.json()
    const { action, dealerId, repName, data } = body

    if (!env.DEALER_KV) {
      return new Response(JSON.stringify({ error: 'KV not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // ── REGISTER DEALER ──────────────────────────────────────────
    if (action === 'registerDealer') {
      const { dealerName, dept } = data
      const code = dealerId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
      const existing = await env.DEALER_KV.get(`dealer:${code}`)
      if (existing) {
        return new Response(JSON.stringify({ success: true, code, exists: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      const dealer = { code, name: dealerName, dept, created: Date.now(), reps: [] }
      await env.DEALER_KV.put(`dealer:${code}`, JSON.stringify(dealer))
      return new Response(JSON.stringify({ success: true, code }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // ── JOIN DEALER ───────────────────────────────────────────────
    if (action === 'joinDealer') {
      const code = dealerId.toUpperCase()
      const raw = await env.DEALER_KV.get(`dealer:${code}`)
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Dealer code not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      const dealer = JSON.parse(raw)
      if (!dealer.reps.includes(repName)) {
        dealer.reps.push(repName)
        await env.DEALER_KV.put(`dealer:${code}`, JSON.stringify(dealer))
      }
      return new Response(JSON.stringify({ success: true, dealer }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // ── LOG ACTIVITY ──────────────────────────────────────────────
    if (action === 'logActivity') {
      const code = dealerId.toUpperCase()
      const key = `activity:${code}:${Date.now()}`
      const entry = { repName, ...data, timestamp: Date.now() }
      await env.DEALER_KV.put(key, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 90 }) // 90 days
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // ── GET DASHBOARD ─────────────────────────────────────────────
    if (action === 'getDashboard') {
      const code = dealerId.toUpperCase()
      const dealerRaw = await env.DEALER_KV.get(`dealer:${code}`)
      if (!dealerRaw) {
        return new Response(JSON.stringify({ error: 'Dealer not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      const dealer = JSON.parse(dealerRaw)
      // Get last 100 activity entries
      const list = await env.DEALER_KV.list({ prefix: `activity:${code}:`, limit: 100 })
      const activities = await Promise.all(
        list.keys.map(async k => {
          const v = await env.DEALER_KV.get(k.name)
          return v ? JSON.parse(v) : null
        })
      )
      const sorted = activities.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp)
      return new Response(JSON.stringify({ dealer, activities: sorted }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
