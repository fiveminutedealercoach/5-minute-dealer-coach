// Cloudflare Pages Function — Dealer data sync via Supabase
// v6 — Restores the five KV-era actions the app still calls.
//      • verifyOperator  — lets the console check the admin key WITHOUT the key
//                          ever being written into the console HTML.
//      • updateDealer    — now returns the updated row so the console can patch
//                          its table in place instead of refetching everything.
//      • planned_team / gm_role support on registerDealer + updateDealer.
//      • gm_email/gm_name now fall back to the app's own onboarding fields, so a
//        manager who self-registers in the app no longer shows a blank GM.
//      • seat_limit    - 15 users per rooftop by default, enforced in joinDealer.
//                        The operator can raise it per dealership from the console.
//      • getMasterDashboard now returns seatLimit and the last 10 activities
//                        per rooftop so the console can show an activity feed.
//      • notes         - free-text operator notes per rooftop (who you spoke to,
//                        what they said, when to follow up).
//      • getRoster      - rep list + recap emails for a dealership
//      • getSettings    - read a per-dealership key (drill assignments, lifecycle steps)
//      • saveSettings   - write/clear that key
//      • updateContacts - set the recap email list
//      • removeRep      - drop a rep from the roster
//      These existed on the old Cloudflare KV backend and were missed in the
//      Supabase migration, which silently broke drill assignments, the rep
//      picker, Dealership Settings and the lifecycle editor. Requires SQL v5.
//      Existing app calls are unchanged and still require no admin key.

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
      // PATCH needs representation too — that is what lets updateDealer hand the
      // refreshed row back to the console for an in-place table update.
      'Prefer': (method === 'POST' || method === 'PATCH') ? 'return=representation' : ''
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

    // Shared operator gate. env.ADMIN_KEY is set in Cloudflare → Settings →
    // Environment variables. If it is missing, everything operator-only fails
    // closed rather than silently allowing access.
    const isOperator = () => !!env.ADMIN_KEY && data?.adminKey === env.ADMIN_KEY

    // ── VERIFY OPERATOR ───────────────────────────────────────
    // The console posts the key you typed at the gate. Nothing is stored and
    // nothing is returned except pass/fail, so the console file itself can ship
    // with no secret inside it.
    if (action === 'verifyOperator') {
      if (!env.ADMIN_KEY) return err('ADMIN_KEY is not configured on the server', 500)
      if (!isOperator()) return err('Invalid access key', 401)
      return ok({ success: true })
    }

    // ── REGISTER DEALER ──────────────────────────────────────
    // Intentionally NOT operator-gated: the app's own onboarding screen calls
    // this when a manager creates a rooftop themselves.
    if (action === 'registerDealer') {
      const { dealerName, dept, gmName, gmEmail, email, gmRole, mrr, status, plannedTeam, seatLimit } = data
      const code = dealerId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

      const existing = await sb(`/dealers?code=eq.${code}&select=code`)
      if (existing.length > 0) {
        return ok({ success: true, code, exists: true })
      }

      // Fall back to the app's onboarding fields so self-registered dealers
      // still get a usable GM name/email in the operator console.
      const contactName  = gmName  || repName || ''
      const contactEmail = gmEmail || email   || ''

      await sb('/dealers', 'POST', {
        code,
        name: dealerName,
        dept,
        gm_name: contactName,
        gm_email: contactEmail,
        gm_role: gmRole || 'gm',
        mrr: mrr == null ? 997 : mrr,
        status: status || 'active',
        planned_team: Array.isArray(plannedTeam) ? plannedTeam : [],
        seat_limit: seatLimit == null ? 15 : seatLimit,
        created_at: Date.now(),
        reps: []
      })

      await sb('/dealer_index', 'POST', {
        code,
        name: dealerName,
        dept,
        gm_name: contactName,
        gm_email: contactEmail,
        mrr: mrr == null ? 997 : mrr,
        status: status || 'active',
        created_at: Date.now(),
        last_active: Date.now()
      })

      return ok({ success: true, code })
    }

    // ── JOIN DEALER ───────────────────────────────────────────
    if (action === 'joinDealer') {
      // Sanitize the same way registerDealer does. A trailing space or an
      // autocomplete artifact used to produce "Dealer code not found".
      const code = String(dealerId || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!code) return err('Dealer code not found', 404)
      const rows = await sb(`/dealers?code=eq.${code}&select=*`)
      if (!rows.length) return err('Dealer code not found', 404)

      const dealer = rows[0]
      // Block suspended dealerships from adding new users
      if (dealer.status === 'suspended') {
        return err('This dealership account is suspended. Please contact your administrator.', 403)
      }
      const reps = dealer.reps || []

      // The roster is the source of truth for identity. Match case-insensitively
      // and hand back the name exactly as it is already stored, so "billy" and
      // "Billy" resolve to one person instead of splitting seats, stats and
      // drill assignments. The app saves whatever we return here.
      const typed = String(repName || '').trim()
      const existing = reps.find(r => String(r).trim().toLowerCase() === typed.toLowerCase())
      let canonicalName = existing || typed

      if (!existing && typed) {
        // Seat cap. Existing users can always get back in; only NEW joins are
        // blocked, so nobody gets locked out of an account they already use.
        const cap = dealer.seat_limit == null ? 15 : dealer.seat_limit
        if (reps.length >= cap) {
          return err('This dealership has reached its user limit of ' + cap + '. Please contact your manager.', 403)
        }
        reps.push(typed)
        await sb(`/dealers?code=eq.${code}`, 'PATCH', { reps })
        canonicalName = typed
      }

      return ok({ success: true, dealer, code, repName: canonicalName })
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

      // The app reads activity rows as a.repName; Supabase returns rep_name.
      // Add the camelCase alias alongside the original column so both the app
      // and anything reading rep_name keep working.
      const shaped = activities.map(a => ({ ...a, repName: a.rep_name }))

      return ok({ dealer: dealers[0], activities: shaped })
    }

    // ── UPDATE DEALER (operator only) ─────────────────────────
    if (action === 'updateDealer') {
      if (!isOperator()) return err('Unauthorized', 401)
      const code = dealerId.toUpperCase()
      const patch = data.patch || {}

      // Map friendly names → column names, only allow known fields
      const colMap = {
        name: 'name', gmName: 'gm_name', gmEmail: 'gm_email', gmRole: 'gm_role',
        mrr: 'mrr', status: 'status', dept: 'dept', plannedTeam: 'planned_team',
        seatLimit: 'seat_limit', notes: 'notes'
      }
      const dbPatch = {}
      Object.keys(colMap).forEach(k => {
        if (patch[k] !== undefined) dbPatch[colMap[k]] = patch[k]
      })
      if (Object.keys(dbPatch).length === 0) return err('No valid fields to update', 400)

      const updated = await sb(`/dealers?code=eq.${code}`, 'PATCH', dbPatch)

      // Mirror only the columns the index actually has. planned_team and gm_role
      // live on `dealers` alone, so they are stripped out here.
      const idxPatch = { ...dbPatch }
      delete idxPatch.planned_team
      delete idxPatch.gm_role
      delete idxPatch.seat_limit
      delete idxPatch.notes
      if (Object.keys(idxPatch).length > 0) {
        await sb(`/dealer_index?code=eq.${code}`, 'PATCH', idxPatch)
      }

      // Hand the fresh row back so the console can update one table row in place
      // instead of re-running the whole master dashboard query.
      // A PATCH that matched zero rows used to return success, so the console
      // would say "Saved" for a rooftop that no longer exists.
      if (!updated.length) return err('Dealer not found', 404)
      return ok({ success: true, dealer: updated[0] })
    }

    // ── DELETE DEALER (operator only) ─────────────────────────
    if (action === 'deleteDealer') {
      if (!isOperator()) return err('Unauthorized', 401)
      // Bulk delete posts dealerId:'MASTER' with the real code in data.code,
      // while single delete puts it in dealerId. Accept either.
      const raw = data?.code || dealerId
      const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!code || code === 'MASTER') return err('No dealership code specified', 400)

      // Previously every failure was swallowed and success returned regardless,
      // so a rejected delete still reported "Dealership deleted". Now we report
      // exactly which parts went, and fail loudly if the dealer row survived.
      const failed = []
      const tryDel = async (path, label) => {
        try { await sb(path, 'DELETE') } catch (e) { failed.push(label) }
      }
      await tryDel(`/activity?dealer_code=eq.${code}`, 'activity')
      await tryDel(`/dealer_settings?dealer_code=eq.${code}`, 'settings')
      await tryDel(`/dealers?code=eq.${code}`, 'dealer')
      await tryDel(`/dealer_index?code=eq.${code}`, 'index')

      if (failed.includes('dealer')) {
        return err('Could not delete the dealership record. Nothing was fully removed.', 500)
      }
      return ok({ success: true, partial: failed.length ? failed : undefined })
    }

    // ── GET ROSTER ────────────────────────────────────────────
    // Who is on this rooftop + where recap emails go. Used by the assign
    // picker, Quick Log, Dealership Settings and the manager email list.
    if (action === 'getRoster') {
      const code = dealerId.toUpperCase()
      const rows = await sb(`/dealers?code=eq.${code}&select=reps,contact_emails`)
      if (!rows.length) return ok({ reps: [], contactEmails: [] })
      return ok({
        reps: rows[0].reps || [],
        contactEmails: rows[0].contact_emails || []
      })
    }

    // ── UPDATE CONTACTS ───────────────────────────────────────
    if (action === 'updateContacts') {
      const code = dealerId.toUpperCase()
      const emails = Array.isArray(data?.emails) ? data.emails : []
      const updated = await sb(`/dealers?code=eq.${code}`, 'PATCH', { contact_emails: emails })
      if (!updated.length) return err('Dealer not found', 404)
      return ok({ success: true, contactEmails: emails })
    }

    // ── REMOVE REP ────────────────────────────────────────────
    // Drops the name from the roster. Their logged activity is left intact so
    // the dashboard history stays honest.
    if (action === 'removeRep') {
      const code = dealerId.toUpperCase()
      const rep = data?.rep
      if (!rep) return err('No rep specified', 400)
      const rows = await sb(`/dealers?code=eq.${code}&select=reps`)
      if (!rows.length) return err('Dealer not found', 404)
      const next = (rows[0].reps || []).filter(r => r !== rep)
      await sb(`/dealers?code=eq.${code}`, 'PATCH', { reps: next })
      return ok({ success: true, reps: next })
    }

    // ── SAVE CUSTOM SCRIPT ────────────────────────────────────
    // Appends one dealership-authored objection to dealers.custom_scripts.
    // There is no server-side session, so "manager only" is enforced in the UI
    // (the Save button renders for managers only). Here we harden by validating
    // the payload so a malformed or junk objection can't land: objection text is
    // required, dept/category are normalized, and we de-dupe against existing
    // objections (case-insensitive) so the same objection can't be saved twice.
    if (action === 'saveCustomScript') {
      const code = String(dealerId || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      const s = data?.script || {}
      const objection = String(s.objection || '').trim()
      if (!code) return err('No dealership code', 400)
      if (objection.length < 3) return err('Objection text is required', 400)
      if (objection.length > 300) return err('Objection is too long', 400)

      const dept = (s.dept === 'service') ? 'service' : 'sales'
      const category = String(s.category || 'Custom Objection').trim().slice(0, 60)

      const rows = await sb(`/dealers?code=eq.${code}&select=custom_scripts`)
      if (!rows.length) return err('Dealer not found', 404)
      const list = Array.isArray(rows[0].custom_scripts) ? rows[0].custom_scripts : []

      // Editing an existing entry: the app sends the original id back. Replace in
      // place so a correction doesn't create a duplicate.
      const editId = s.id && String(s.id).indexOf('custom-') === 0 ? String(s.id) : null
      if (editId && list.some(x => x && x.id === editId)) {
        const next = list.map(x => (x && x.id === editId)
          ? { ...x,
              objection,
              dept,
              category,
              script: String(s.script || x.script || '').slice(0, 1200),
              followup: String(s.followup || x.followup || '').slice(0, 600),
              situation: String(s.situation || x.situation || '').slice(0, 300),
              mistake: String(s.mistake || x.mistake || '').slice(0, 300),
              updatedAt: Date.now() }
          : x)
        await sb(`/dealers?code=eq.${code}`, 'PATCH', { custom_scripts: next })
        return ok({ success: true, updated: true, custom_scripts: next })
      }

      // de-dupe on objection text, case-insensitive
      if (list.some(x => x && String(x.objection || '').trim().toLowerCase() === objection.toLowerCase())) {
        return ok({ success: true, duplicate: true, custom_scripts: list })
      }

      const entry = {
        id: 'custom-' + Date.now(),
        objection,
        dept,
        category,
        audience: 'rep',
        custom: true,
        script: String(s.script || '').slice(0, 1200),
        followup: String(s.followup || '').slice(0, 600),
        situation: String(s.situation || 'Objection added by this dealership.').slice(0, 300),
        mistake: String(s.mistake || 'Not having a prepared response ready.').slice(0, 300),
        addedBy: String(s.addedBy || '').slice(0, 60),
        addedAt: Date.now(),
      }
      const next = [...list, entry]
      await sb(`/dealers?code=eq.${code}`, 'PATCH', { custom_scripts: next })
      return ok({ success: true, entry, custom_scripts: next })
    }

    // ── DELETE CUSTOM SCRIPT ──────────────────────────────────
    // Removes one dealership-authored objection by id (manager cleanup).
    if (action === 'deleteCustomScript') {
      const code = String(dealerId || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      const id = String(data?.id || '')
      if (!code || !id) return err('Missing dealership or id', 400)
      const rows = await sb(`/dealers?code=eq.${code}&select=custom_scripts`)
      if (!rows.length) return err('Dealer not found', 404)
      const list = Array.isArray(rows[0].custom_scripts) ? rows[0].custom_scripts : []
      const next = list.filter(x => x && x.id !== id)
      await sb(`/dealers?code=eq.${code}`, 'PATCH', { custom_scripts: next })
      return ok({ success: true, custom_scripts: next })
    }

    // ── GET SETTINGS ──────────────────────────────────────────
    // KV replacement. Returns { value } — null when the key is unset, which is
    // what the app checks before showing an assignment card.
    if (action === 'getSettings') {
      const code = dealerId.toUpperCase()
      const key = String(data?.key || '')
      if (!key) return err('No key specified', 400)
      const rows = await sb(`/dealer_settings?dealer_code=eq.${code}&key=eq.${encodeURIComponent(key)}&select=value`)
      return ok({ value: rows.length ? rows[0].value : null })
    }

    // ── SAVE SETTINGS ─────────────────────────────────────────
    // value === null clears the key (that is how a completed drill assignment
    // is removed). Otherwise upsert.
    if (action === 'saveSettings') {
      const code = dealerId.toUpperCase()
      const key = String(data?.key || '')
      if (!key) return err('No key specified', 400)
      const value = data?.value

      if (value === null || value === undefined) {
        try { await sb(`/dealer_settings?dealer_code=eq.${code}&key=eq.${encodeURIComponent(key)}`, 'DELETE') } catch {}
        return ok({ success: true, cleared: true })
      }

      const existing = await sb(`/dealer_settings?dealer_code=eq.${code}&key=eq.${encodeURIComponent(key)}&select=key`)
      if (existing.length) {
        await sb(`/dealer_settings?dealer_code=eq.${code}&key=eq.${encodeURIComponent(key)}`, 'PATCH',
          { value, updated_at: Date.now() })
      } else {
        await sb('/dealer_settings', 'POST',
          { dealer_code: code, key, value, updated_at: Date.now() })
      }
      return ok({ success: true, value })
    }

    // ── GET MASTER DASHBOARD ──────────────────────────────────
    if (action === 'getMasterDashboard') {
      if (!isOperator()) return err('Unauthorized', 401)

      const index = await sb('/dealer_index?select=*&order=last_active.desc')

      const dealerStats = await Promise.all(index.map(async (d) => {
        try {
          const dealerRows = await sb(`/dealers?code=eq.${d.code}&select=*`)
          const dealerData = dealerRows[0] || {}
          // Was capped at 200, so a heavy rooftop silently stopped accruing cost
          // and its totals froze. 2000 comfortably covers a busy month.
          const acts = await sb(
            `/activity?dealer_code=eq.${d.code}&select=*&order=timestamp.desc&limit=2000`
          )
          const weekAgo  = Date.now() - 7 * 24 * 60 * 60 * 1000
          const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
          const weekActs  = acts.filter(a => a.timestamp > weekAgo)
          const monthActs = acts.filter(a => a.timestamp > monthAgo)
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
            name: d.name || dealerData.name || d.code,
            dept: d.dept,
            gmName: d.gm_name || dealerData.gm_name || '',
            gmEmail: d.gm_email || dealerData.gm_email || '',
            gmRole: dealerData.gm_role || 'gm',
            mrr: d.mrr == null ? (dealerData.mrr == null ? 997 : dealerData.mrr) : d.mrr,
            status: d.status || dealerData.status || 'active',
            created: d.created_at,
            reps: reps.length,
            teamMembers: dealerData.reps || [],
            plannedTeam: dealerData.planned_team || [],
            seatLimit: dealerData.seat_limit == null ? 15 : dealerData.seat_limit,
            notes: dealerData.notes || '',
            totalDrills: acts.length,
            weekDrills: weekActs.length,
            weekHuddles: weekActs.filter(a => a.type === 'huddle').length,
            voiceDrills: acts.filter(a => a.type === 'voice_drill' || a.type === 'voice').length,
            // 30-day figures: cost is a monthly number, so it has to be compared
            // against a month of activity, not lifetime.
            monthDrills: monthActs.length,
            monthVoiceDrills: monthActs.filter(a => a.type === 'voice_drill' || a.type === 'voice').length,
            winRate: acts.length > 0 ? Math.round((won / acts.length) * 100) : 0,
            lastActive,
            daysSinceActive,
            health,
            recentActivity: acts.slice(0, 10).map(a => ({ ...a, repName: a.rep_name })),
            hasLoggedIn: (dealerData.reps || []).length > 0,
            hasActivity: acts.length > 0,
            hasHuddle: acts.some(a => a.type === 'huddle'),
            hasDrill: acts.some(a => a.type === 'voice_drill' || a.type === 'voice'),
          }
        } catch {
          return { code: d.code, name: d.name || d.code, error: true, health: 0, totalDrills: 0, status: d.status || 'active', plannedTeam: [], teamMembers: [], seatLimit: 15, recentActivity: [], notes: '' }
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
