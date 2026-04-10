// Cloudflare Pages Function — Dealer data sync via Supabase

const SUPABASE_URL = 'https://zthgswndbgekoboknpae.supabase.co'
const SUPABASE_KEY = 'sb_publishable_8siqgy2GXbukkL_F4fUzzg_nX1O0BxX'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const sb = async (path, method='GET', body=null) => {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method==='POST' ? 'return=representation' : ''
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(SUPABASE_URL + '/rest/v1' + path, opts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

export async function onRequest(context) {
  const { request, env } = context

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors }
    })
  }

  const ok = (data) => new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...cors }
  })
  const err = (msg, status=500) => new Response(JSON.stringify({ error: msg }), {
    status, headers: { 'Content-Type': 'application/json', ...cors }
  })

  try {
    const body = await request.json()
    const { action, dealerId, repName, data } = body

    // ── REGISTER DEALER ──────────────────────────────────────
    if (action === 'registerDealer') {
      const { dealerName, dept } = data
      const code = dealerId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

      const existing = await sb(`/dealers?code=eq.${code}&select=code`)
      if (existing.length > 0) {
        return ok({ success: true, code, exists: true })
      }

      await sb('/dealers', 'POST', {
        code,
        name: dealerName,
        dept,
        created_at: Date.now(),
        reps: []
      })

      await sb('/dealer_index', 'POST', {
        code,
        name: dealerName,
        dept,
        created_at: Date.now(),
        last_active: Date.now()
      })

      return ok({ success: true, code })
    }

    // ── JOIN DEALER ───────────────────────────────────────────
    if (action === 'joinDealer') {
      const code = dealerId.toUpperCase()
      const rows = await sb(`/dealers?code=eq.${code}&select=*`)
      if (!rows.length) return err('Dealer code not found', 404)

      const dealer = rows[0]
      const reps = dealer.reps || []
      if (!reps.includes(repName)) {
        reps.push(repName)
        await sb(`/dealers?code=eq.${code}`, 'PATCH', { reps })
      }

      return ok({ success: true, dealer })
    }

    // ── LOG ACTIVITY ──────────────────────────────────────────
    if (action === 'logActivity') {
      const code = dealerId.toUpperCase()
      await sb('/activity', 'POST', {
        dealer_code: code,
        rep_name: repName,
        type: data.type || 'drill',
        script: data.script || '',
        result: data.result || '',
        dept: data.dept || 'sales',
        timestamp: Date.now(),
        data: data
      })

      await sb(`/dealer_index?code=eq.${code}`, 'PATCH', {
        last_active: Date.now()
      })

      return ok({ success: true })
    }

    // ── GET DASHBOARD ─────────────────────────────────────────
    if (action === 'getDashboard') {
      const code = dealerId.toUpperCase()
      const dealers = await sb(`/dealers?code=eq.${code}&select=*`)
      if (!dealers.length) return err('Dealer not found', 404)

      const activities = await sb(
        `/activity?dealer_code=eq.${code}&select=*&order=timestamp.desc&limit=100`
      )

      return ok({ dealer: dealers[0], activities })
    }

    // ── GET MASTER DASHBOARD ──────────────────────────────────
    if (action === 'getMasterDashboard') {
      if (data?.adminKey !== env.ADMIN_KEY) return err('Unauthorized', 401)

      const index = await sb('/dealer_index?select=*&order=last_active.desc')

      const dealerStats = await Promise.all(index.map(async (d) => {
        try {
          const acts = await sb(
            `/activity?dealer_code=eq.${d.code}&select=*&order=timestamp.desc&limit=200`
          )
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const weekActs = acts.filter(a => a.timestamp > weekAgo)
          const reps = [...new Set(acts.map(a => a.rep_name))].filter(Boolean)
          const won = acts.filter(a => a.result === 'won' || a.result?.startsWith('A') || a.result?.startsWith('B')).length
          const lastActive = acts[0]?.timestamp || d.created_at
          const daysSinceActive = Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24))

          let health = 0
          if (weekActs.length >= 10) health += 40
          else if (weekActs.length >= 5) health += 25
          else if (weekActs.length >= 1) health += 10
          if (daysSinceActive <= 1) health += 25
          else if (daysSinceActive <= 3) health += 15
          else if (daysSinceActive <= 7) health += 5
          if (weekActs.filter(a => a.type === 'huddle').length >= 3) health += 20
          else if (weekActs.filter(a => a.type === 'huddle').length >= 1) health += 10
          if (acts.length > 0) health += Math.min(15, Math.floor((won / acts.length) * 15))

          return {
            code: d.code,
            name: d.name || d.code,
            dept: d.dept,
            created: d.created_at,
            reps: reps.length,
            totalDrills: acts.length,
            weekDrills: weekActs.length,
            weekHuddles: weekActs.filter(a => a.type === 'huddle').length,
            voiceDrills: acts.filter(a => a.type === 'voice_drill' || a.type === 'voice').length,
            winRate: acts.length > 0 ? Math.round((won / acts.length) * 100) : 0,
            lastActive,
            daysSinceActive,
            health,
            recentActivity: acts.slice(0, 3)
          }
        } catch {
          return { code: d.code, name: d.name || d.code, error: true, health: 0, totalDrills: 0 }
        }
      }))

      const sorted = dealerStats.sort((a, b) => b.health - a.health)
      return ok({ dealers: sorted, total: sorted.length })
    }

    return err('Unknown action', 400)

  } catch (e) {
    return err(e.message)
  }
}
