import { useState, useEffect, useRef } from 'react'
import { SCRIPTS } from './data/scripts'

const C = { navy:'#050d1f',navyMid:'#0a1930',navyLight:'#0f2448',blue:'#1a6bff',blueBright:'#3d8bff',green:'#b8ff3c',white:'#ffffff',gray:'#8a9ab5',lightText:'#c8d4e8',card:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.08)',red:'#ff6b6b',yellow:'#ffc947',orange:'#ff9f43' }
const fH = "'Barlow Condensed', sans-serif"
const fB = "'Barlow', sans-serif"
const inp = { background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:C.white,fontFamily:fB,fontSize:14,padding:'8px 12px',outline:'none',width:'100%',boxSizing:'border-box' }

const ROLES = {
  gm:       { label:'General Manager',    icon:'⭐', dept:'both',    isManager:true  },
  sales_mgr:{ label:'Sales Manager',      icon:'🏆', dept:'sales',   isManager:true  },
  svc_mgr:  { label:'Service Manager',    icon:'🔧', dept:'service', isManager:true  },
  sales_rep:{ label:'Sales Consultant',   icon:'🚗', dept:'sales',   isManager:false },
  svc_rep:  { label:'Service Consultant', icon:'🔩', dept:'service', isManager:false },
  bdc:      { label:'BDC',                icon:'📞', dept:'both',    isManager:false },
}
const isManager = role => ROLES[role]?.isManager || false
const roleDept  = role => ROLES[role]?.dept || 'both'

const SCORES = [
  {val:'won',     label:'✓ Won',       color:C.green},
  {val:'progress',label:'◑ Progress',  color:C.yellow},
  {val:'practice',label:'↺ Practice',  color:C.orange},
]
const scoreColor = r => r==='won'?C.green:r==='progress'?C.yellow:C.orange
const scoreLabel = r => r==='won'?'✓ Won':r==='progress'?'◑ Progress':'↺ Practice'

const SCOLS = [C.green,C.blue,C.yellow,'#ff6bbb',C.blueBright]
const STEPS = [
  {icon:'🏆',label:'Win From Yesterday',desc:'Open with one specific win from yesterday. Name the rep, the script, the result.',time:30},
  {icon:'📋',label:'Script of the Day',desc:"Read today's script aloud — fully, with energy. Every rep follows along.",time:60},
  {icon:'🎭',label:'Live Drill',desc:'Manager plays the customer. One rep handles it live. No notes. Real pressure.',time:90},
  {icon:'🎯',label:'One Coaching Note',desc:'One specific thing to improve. Not a lecture. One clear, actionable note.',time:60},
  {icon:'🔒',label:'Commit & Close',desc:'Each rep commits out loud to using this script today.',time:60},
]
const TOTAL_H = 300
const STEP_STARTS = [0,30,90,180,240]

const SALES_SCHED=[{day:'MON',label:'Sales — Price / Discount Objection',id:6},{day:'TUE',label:'Sales — Payment or Commitment Objection',id:9},{day:'WED',label:'Sales — Trade-In & Used Car Objections',id:19},{day:'THU',label:'Sales — Finance & Add-On Objections',id:14},{day:'FRI',label:'Weekly Review — What Worked?',id:null}]
const SVC_SCHED=[{day:'MON',label:'Service — Deferred Maintenance Objections',id:42},{day:'TUE',label:'Service — Price & Estimate Pushback',id:44},{day:'WED',label:'Service — MPI Conversion',id:52},{day:'THU',label:'Service — Competitive / Outside Shop',id:43},{day:'FRI',label:'Weekly Review — What Worked?',id:null}]
const BOTH_SCHED=[{day:'MON',label:'Sales — Price / Discount Objection',id:6},{day:'TUE',label:'Service — Deferred Maintenance',id:42},{day:'WED',label:'Sales — Payment Objection',id:9},{day:'THU',label:'Service — Price Pushback',id:44},{day:'FRI',label:'Weekly Review — What Worked?',id:null}]
const getSched = dept => dept==='sales'?SALES_SCHED:dept==='service'?SVC_SCHED:BOTH_SCHED

// ── Hip welcome messages ──────────────────────────────────────
const WELCOME_NEW = [
  "Welcome to the system, [N]. Your competition just fell further behind. 🎯",
  "You're in, [N]. Let's build something they can't touch. 🔥",
  "[N] is in the building. Time to get to work. ⚡",
  "Welcome aboard, [N]. The team just got stronger. 💪",
]
const WELCOME_BACK = [
  "Back at it, [N]. Let's get some reps in. 🔥",
  "Good to see you, [N]. Time to sharpen the edge. 🎯",
  "You're back, [N]. Let's make today count. 💪",
  "[N] is in the building. Ready to work? 🚀",
  "Welcome back, [N]. The grind doesn't stop. ⚡",
]
const pickWelcome = (name, isNew) => {
  const pool = isNew ? WELCOME_NEW : WELCOME_BACK
  return pool[Math.floor(Math.random()*pool.length)].replace('[N]', name)
}

const AI_OPENERS = {
  1:"My team keeps saying we have to discount to close. What's your response to that?",2:"I've already decided this customer won't pay sticker. There's no point trying.",3:"We never set gross goals in morning meetings. Is that really necessary?",4:"I don't see why we need to celebrate gross wins publicly. It creates competition.",5:"We use a one-price model so I just tell customers the price is the price.",6:"I just checked online and found this exact car for two thousand dollars less. Match that price.",7:"Look, I don't have time for a presentation. Just give me your absolute best price right now.",8:"I really like the car but I need to run it by my wife before I make any decisions.",9:"That monthly payment is way too high. There is absolutely no way I can do that number.",10:"I'm not ready to buy today. I'm just here to gather some information.",11:"I want to think about it and come back sometime next week when I've decided.",12:"I found this exact same car at another dealership and they're five hundred dollars cheaper.",13:"I'm honestly just browsing today and not looking to purchase anything.",14:"I don't need the extended warranty. I'll just take my chances if something breaks.",15:"GAP insurance sounds like a total ripoff to me. Why would I need that?",16:"I never buy warranties on anything. I'll deal with it if something goes wrong.",17:"I just want to know the payment with nothing added. Skip all the extras.",18:"Can you just show me the base payment without any of those add-ons?",19:"My trade-in is worth way more than what you're offering me for it.",20:"Why does reconditioning cost so much? That seems really inflated to me.",21:"I found the exact same used car at another lot for less money.",22:"The CarFax shows this car had an accident. I don't want to buy it.",23:"I can get a newer model for basically the same price somewhere else.",24:"I don't need the paint protection package. I'll take my chances with the finish.",25:"Those accessories seem really overpriced. I can get them cheaper online.",26:"Do I really need all of this? It feels like you're just adding stuff I don't want.",27:"I'll add the accessories later after I've had the car for a little while.",28:"I'm paying cash so I should be getting a much better deal than this.",29:"I need to see all my options laid out before I can decide on anything.",30:"Let me talk to your manager. I want to see what else you can do on this deal.",31:"Your prices are way too high compared to other shops I've called around.",32:"My advisors just write orders. They don't try to sell anything extra at all.",33:"I already know what I need done so just write up the order for that.",34:"Nobody told me what my target for customer-pay is today. I have no idea.",35:"I didn't present that recommendation because I knew they wouldn't buy it.",36:"I'll just skip the maintenance package presentation for this customer today.",37:"We don't have time to do a full inspection for every quick-lube customer.",38:"Just do whatever the car needs. I trust you guys to figure it out.",39:"How do I know this inspection is even real? Did you actually check everything?",40:"I'll approve just the oil change but skip everything else on that list.",41:"Can you just email me the inspection results? I don't really want to go over it.",42:"The car has been running fine for two years. I'll wait until it actually breaks to fix it.",43:"My brother-in-law is a mechanic and he can do it for half the price you're quoting.",44:"Seven hundred and eighty dollars? I thought this was only going to be around two hundred.",45:"I just had that exact service done somewhere else just three months ago.",46:"My other dealership charges significantly less than you for the same labor.",47:"If that's really the price you're quoting me, I'll just take it somewhere else.",48:"How much does a basic oil change cost? Just give me a number right now.",49:"I'm calling around to compare prices. What's your cheapest oil change option?",50:"I need to bring my car in urgently today. Can you fit me in without an appointment?",51:"Can I just drop it off without scheduling? I'm pretty flexible on timing.",52:"Just do the oil change please. Skip everything else on that list today.",53:"I need to call my husband first before I approve any of these repairs.",54:"I'll take care of that recommendation next time I come in for service.",55:"Which of these items is actually urgent versus which ones can wait a while?",56:"The car is twelve years old. I really don't want to put any more money into it.",57:"My tires look perfectly fine to me. I don't think I need new ones right now.",58:"The brakes seem completely fine to me. I don't understand why you're recommending this.",59:"I don't think I need a coolant flush. The car runs perfectly fine without it.",60:"I've never done a transmission service in ten years and the car has been totally fine.",
}
const getOpener = id => AI_OPENERS[id] || "Tell me why I should trust your recommendation here."

const loadJSON = (k,d) => { try { return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)) } catch { return d } }
const saveJSON = (k,v) => localStorage.setItem(k,JSON.stringify(v))

// ── ElevenLabs TTS with browser fallback ─────────────────────
let elAudio = null
const speakEL = async (text, onDone) => {
  try {
    if (elAudio) { elAudio.pause(); elAudio = null }
    const res = await fetch('/elevenlabs-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})
    if (!res.ok) throw new Error('EL failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    elAudio = new Audio(url)
    elAudio.onended = () => { URL.revokeObjectURL(url); onDone && onDone() }
    elAudio.onerror  = () => { speakBrowser(text, onDone) }
    await elAudio.play()
  } catch { speakBrowser(text, onDone) }
}
const speakBrowser = (text, onDone) => {
  if (!window.speechSynthesis) { onDone && onDone(); return }
  window.speechSynthesis.cancel()
  setTimeout(()=>{
    const u = new SpeechSynthesisUtterance(text)
    u.rate=0.88; u.pitch=0.82; u.volume=1
    const v = window.speechSynthesis.getVoices()
    const pref = v.find(v=>/samantha|karen|victoria|google us english/i.test(v.name))
    if (pref) u.voice=pref
    u.onend = () => onDone && onDone()
    window.speechSynthesis.speak(u)
  },150)
}
const stopSpeaking = () => {
  if (elAudio) { try { elAudio.pause() } catch {} elAudio = null }
  try { window.speechSynthesis?.cancel() } catch {}
}
const speak = (text, onDone) => speakEL(text, onDone)

// ── Dealer KV sync ───────────────────────────────────────────
const dealerSync = async (action, dealerId, repName, data={}) => {
  try {
    const res = await fetch('/dealer-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,dealerId,repName,data})})
    return await res.json()
  } catch { return {error:'Network error'} }
}

const getTodayKey  = () => new Date().toISOString().split('T')[0]
const updateStreak = sd => {
  const today = getTodayKey()
  const yest  = new Date(Date.now()-86400000).toISOString().split('T')[0]
  if (sd.lastDay===today) return sd
  if (sd.lastDay===yest)  return {...sd,count:sd.count+1,lastDay:today}
  return {count:1,lastDay:today}
}

const MILESTONES = [
  {count:1,   icon:'🎯',label:'First Drill',    msg:"You ran your first drill. The journey starts here."},
  {count:5,   icon:'🔥',label:'On Fire',         msg:"5 drills in. You're building real habits."},
  {count:10,  icon:'⚡',label:'Getting Sharp',   msg:"10 drills. Your responses are getting sharper."},
  {count:25,  icon:'🏆',label:'Top Performer',   msg:"25 drills. You're in the top tier of your team."},
  {count:50,  icon:'💎',label:'Elite Closer',    msg:"50 drills. You've put in the work. It shows."},
  {count:100, icon:'👑',label:'Coaching Legend', msg:"100 drills. You ARE the standard on your team."},
]
const getNewMilestone = (prev, next) => MILESTONES.find(m=>m.count>prev&&m.count<=next)||null

// ── PDF ──────────────────────────────────────────────────────
const printPDF = (title, body) => {
  const w = window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#1a1a1a;background:#fff;padding:40px;max-width:760px;margin:0 auto;}
h1{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;color:#050d1f;}
h2{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;color:#1a6bff;border-bottom:2px solid #1a6bff;padding-bottom:4px;}
h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px;color:#333;}
.sub{font-size:13px;color:#666;margin-bottom:6px;}.date{font-size:11px;color:#999;margin-bottom:20px;}.divider{height:1px;background:#e0e0e0;margin:16px 0;}
.card{border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid;}
.card.blue{border-left:4px solid #1a6bff;}.card.green{border-left:4px solid #5ca800;}.card.red{border-left:4px solid #e85d4a;}.card.yellow{border-left:4px solid #f0a500;}
.label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px;}
.val{font-size:13px;color:#1a1a1a;line-height:1.6;}
.score-badge{display:inline-block;font-size:28px;font-weight:900;padding:8px 16px;border-radius:8px;margin-bottom:8px;}
.word-track{background:#f0f8e8;border:1px solid #b8e088;border-left:4px solid #5ca800;padding:14px 16px;font-style:italic;font-size:14px;color:#1a1a1a;margin:10px 0;line-height:1.8;border-radius:0 6px 6px 0;}
.action-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;padding:8px 10px;background:#f8f8f8;border-radius:4px;}
.action-num{background:#1a6bff;color:#fff;font-weight:700;font-size:12px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.no-print{background:#f0f4ff;border:1px solid #c0d0ff;border-radius:6px;padding:10px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;font-size:13px;}
.grade-a{background:#e8ffe8;color:#2d8a2d;}.grade-b{background:#e8f0ff;color:#1a6bff;}.grade-c{background:#fff8e8;color:#a07000;}.grade-d{background:#ffe8e8;color:#c03030;}
.cb-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:7px;}.cb{width:14px;height:14px;border:2px solid #ccc;border-radius:3px;flex-shrink:0;margin-top:2px;}
@media print{.no-print{display:none!important;}}
</style></head><body>
<div class="no-print"><span>Ready to print or save as PDF</span><button onclick="window.print()" style="background:#1a6bff;color:#fff;border:none;padding:8px 18px;border-radius:4px;font-weight:700;cursor:pointer;font-size:13px;">Print / Save PDF</button></div>
${body}
<div class="divider"></div><div style="font-size:11px;color:#999;text-align:center;margin-top:12px;">5-Minute Dealer Coaching System · 5minutedealercoach.com · ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
</body></html>`)
  w.document.close()
}

// ── Shared UI components ─────────────────────────────────────
const Tag = ({children,color=C.blue}) => (
  <span style={{background:`${color}20`,border:`1px solid ${color}44`,color,fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'3px 10px',borderRadius:100}}>{children}</span>
)
const PDFBtn = ({onClick,label='📄 Download PDF'}) => (
  <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,color:C.gray,fontFamily:fH,fontWeight:700,fontSize:12,letterSpacing:1,textTransform:'uppercase',padding:'8px 14px',borderRadius:6,cursor:'pointer',marginBottom:16}}>{label}</button>
)

function ScriptFilterBar({dept,setDept,cat,setCat,search,setSearch,lockDept=null}) {
  const cats = [...new Set(SCRIPTS.map(s=>s.category))]
  const ed = lockDept||dept
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',marginBottom:14}}>
      {!lockDept&&(
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          {[['all','All'],['sales','🏆 Sales'],['service','🔧 Service']].map(([v,l])=>(
            <button key={v} onClick={()=>{setDept(v);setCat&&setCat('all')}} style={{background:dept===v?(v==='sales'?C.blue:v==='service'?C.green:'rgba(255,255,255,0.15)'):'rgba(255,255,255,0.05)',color:dept===v&&v==='service'?C.navy:C.white,fontFamily:fH,fontWeight:700,fontSize:12,letterSpacing:1.5,textTransform:'uppercase',padding:'6px 14px',borderRadius:100,border:'none',cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      )}
      {setCat&&(
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          <button onClick={()=>setCat('all')} style={{background:cat==='all'?'rgba(255,255,255,0.12)':'transparent',color:cat==='all'?C.white:C.gray,fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'4px 10px',borderRadius:6,border:`1px solid ${C.border}`,cursor:'pointer'}}>All</button>
          {cats.filter(c=>ed==='all'||SCRIPTS.find(s=>s.category===c&&s.dept===ed)).map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{background:cat===c?'rgba(255,255,255,0.12)':'transparent',color:cat===c?C.white:C.gray,fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'4px 10px',borderRadius:6,border:`1px solid ${C.border}`,cursor:'pointer'}}>{c}</button>
          ))}
        </div>
      )}
      <input style={inp} placeholder="Search objections..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
  )
}

function ScriptCard({script,mode='full',defaultOpen=false}) {
  const [open,setOpen] = useState(defaultOpen)
  if (!script) return null
  return (
    <div style={{background:'rgba(184,255,60,0.04)',border:'1px solid rgba(184,255,60,0.2)',borderRadius:10,overflow:'hidden',marginBottom:10}}>
      <div onClick={()=>setOpen(o=>!o)} style={{background:`linear-gradient(135deg,${C.navyLight},#0c1f40)`,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:2}}>Script Reference</div>
          <div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1.1}}>{script.objection.replace(/"/g,'')}</div>
        </div>
        <div style={{color:C.green,fontSize:14}}>{open?'▲':'▼'}</div>
      </div>
      {open&&(
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
          {mode==='full'&&<div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.red,marginBottom:4}}>The Mistake</div><div style={{fontSize:12,color:C.lightText,lineHeight:1.6,background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.15)',borderRadius:6,padding:'8px 10px'}}>{script.mistake}</div></div>}
          <div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:4}}>The Script</div><div style={{fontSize:13,color:C.white,fontStyle:'italic',lineHeight:1.75,background:'rgba(184,255,60,0.05)',border:'1px solid rgba(184,255,60,0.2)',borderLeft:`3px solid ${C.green}`,borderRadius:'0 6px 6px 0',padding:'10px 12px'}}>{script.script}</div></div>
          {mode==='full'&&<div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:4}}>The Follow-Up</div><div style={{fontSize:12,color:'#ffe08a',fontStyle:'italic',lineHeight:1.6,background:'rgba(255,201,71,0.05)',border:'1px solid rgba(255,201,71,0.15)',borderRadius:6,padding:'8px 10px'}}>{script.followup}</div></div>}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONBOARDING — All 6 roles on BOTH create AND join screens
// ══════════════════════════════════════════════════════════════
const ALL_ROLES = [
  {id:'gm',      icon:'⭐',label:'General Manager'},
  {id:'sales_mgr',icon:'🏆',label:'Sales Manager'},
  {id:'svc_mgr', icon:'🔧',label:'Service Manager'},
  {id:'sales_rep',icon:'🚗',label:'Sales Consultant'},
  {id:'svc_rep', icon:'🔩',label:'Service Consultant'},
  {id:'bdc',     icon:'📞',label:'BDC'},
]

function RoleGrid({selected,onSelect}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
      {ALL_ROLES.map(r=>(
        <div key={r.id} onClick={()=>onSelect(r.id)} style={{border:`2px solid ${selected===r.id?C.green:C.border}`,background:selected===r.id?'rgba(184,255,60,0.08)':'transparent',borderRadius:10,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'border-color 0.15s'}}>
          <div style={{fontSize:22,marginBottom:5}}>{r.icon}</div>
          <div style={{fontFamily:fH,fontSize:10,fontWeight:900,textTransform:'uppercase',color:selected===r.id?C.green:C.gray,lineHeight:1.2}}>{r.label}</div>
        </div>
      ))}
    </div>
  )
}

function Onboarding({onDone}) {
  const [step,setStep]           = useState('choose')
  const [dealerName,setDealerName] = useState('')
  const [repName,setRepName]     = useState('')
  const [role,setRole]           = useState('')
  const [dealerCode,setDealerCode] = useState('')
  const [loading,setLoading]     = useState(false)
  const [error,setError]         = useState('')

  const btnPrimary = {background:C.green,color:C.navy,fontFamily:fH,fontWeight:900,fontSize:14,letterSpacing:1,textTransform:'uppercase',padding:'13px 20px',borderRadius:8,border:'none',cursor:'pointer',width:'100%',marginBottom:12}
  const btnSecondary = {background:'rgba(26,107,255,0.2)',color:C.white,fontFamily:fH,fontWeight:900,fontSize:14,letterSpacing:1,textTransform:'uppercase',padding:'13px 20px',borderRadius:8,border:'1px solid rgba(26,107,255,0.4)',cursor:'pointer',width:'100%'}

  const createDealer = async () => {
    if (!dealerName.trim()||!repName.trim()||!role) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    const code = dealerName.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)+Math.floor(Math.random()*100)
    const res = await dealerSync('registerDealer',code,repName.trim(),{dealerName:dealerName.trim(),dept:roleDept(role)})
    if (res.error&&!res.code) { setError('Setup failed. Try again.'); setLoading(false); return }
    const finalCode = res.code||code
    onDone({dealerId:finalCode,repName:repName.trim(),dealerName:dealerName.trim(),role,isManager:isManager(role)},true)
    setLoading(false)
  }

  const joinDealer = async () => {
    if (!dealerCode.trim()||!repName.trim()||!role) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    const res = await dealerSync('joinDealer',dealerCode.trim().toUpperCase(),repName.trim(),{role})
    if (res.error) { setError('Dealer code not found. Check with your manager.'); setLoading(false); return }
    onDone({dealerId:dealerCode.trim().toUpperCase(),repName:repName.trim(),dealerName:res.dealer?.name||'',role,isManager:isManager(role)},true)
    setLoading(false)
  }

  const wrap = {position:'fixed',inset:0,background:`linear-gradient(135deg,${C.navy},#0b1f4a)`,zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:24,overflowY:'auto'}
  const card = {background:C.navyMid,border:`1px solid ${C.border}`,borderRadius:16,padding:'24px',width:'100%',maxWidth:420}

  if (step==='choose') return (
    <div style={wrap}>
      <div style={card}>
        <div style={{fontFamily:fH,fontSize:26,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>5-Minute <span style={{color:C.green}}>Dealer Coach</span></div>
        <div style={{width:40,height:2,background:`linear-gradient(90deg,${C.blue},${C.green})`,margin:'10px 0 20px',borderRadius:2}}/>
        <div style={{fontFamily:fH,fontSize:18,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:6}}>Get Started</div>
        <div style={{fontSize:13,color:C.gray,lineHeight:1.6,marginBottom:24}}>Setting up a new dealership or joining your team?</div>
        <button onClick={()=>setStep('create')} style={btnPrimary}>🏢 Set Up My Dealership</button>
        <button onClick={()=>setStep('join')} style={btnSecondary}>🔑 Join with Dealer Code</button>
      </div>
    </div>
  )

  if (step==='create') return (
    <div style={wrap}>
      <div style={card}>
        <button onClick={()=>setStep('choose')} style={{background:'none',border:'none',color:C.gray,cursor:'pointer',fontFamily:fH,fontSize:12,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>← Back</button>
        <div style={{fontFamily:fH,fontSize:20,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:16}}>Set Up Dealership</div>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:5}}>Dealership Name</div><input style={inp} placeholder="e.g. Sunset Auto Group" value={dealerName} onChange={e=>setDealerName(e.target.value)}/></div>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:5}}>Your Name</div><input style={inp} placeholder="Your name" value={repName} onChange={e=>setRepName(e.target.value)}/></div>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:8}}>Your Role</div><RoleGrid selected={role} onSelect={setRole}/></div>
        </div>
        {error&&<div style={{fontSize:13,color:C.red,marginBottom:12}}>{error}</div>}
        <button onClick={createDealer} disabled={loading||!role} style={{...btnPrimary,marginBottom:0,background:role?C.green:'rgba(255,255,255,0.08)',color:role?C.navy:C.gray,cursor:role?'pointer':'default',opacity:loading?0.6:1}}>{loading?'Setting up...':'Create Dealership →'}</button>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={card}>
        <button onClick={()=>setStep('choose')} style={{background:'none',border:'none',color:C.gray,cursor:'pointer',fontFamily:fH,fontSize:12,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>← Back</button>
        <div style={{fontFamily:fH,fontSize:20,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:16}}>Join Dealership</div>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:5}}>Dealer Code</div><input style={{...inp,textTransform:'uppercase',letterSpacing:3,fontFamily:fH,fontSize:18,fontWeight:900}} placeholder="e.g. SUNSET42" value={dealerCode} onChange={e=>setDealerCode(e.target.value.toUpperCase())}/></div>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:5}}>Your Name</div><input style={inp} placeholder="Your name" value={repName} onChange={e=>setRepName(e.target.value)}/></div>
          <div><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:8}}>Your Role</div><RoleGrid selected={role} onSelect={setRole}/></div>
        </div>
        {error&&<div style={{fontSize:13,color:C.red,marginBottom:12}}>{error}</div>}
        <button onClick={joinDealer} disabled={loading||!role} style={{...btnPrimary,marginBottom:0,background:role?C.green:'rgba(255,255,255,0.08)',color:role?C.navy:C.gray,cursor:role?'pointer':'default',opacity:loading?0.6:1}}>{loading?'Joining...':'Join Dealership →'}</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HOME — Live calendar date, name in header, huddle preload
// ══════════════════════════════════════════════════════════════
function Home({onNav,dealer,stats,results,streak,milestone,onDrillNow,onHuddleNow,schedule,onScheduleChange,welcomeMsg}) {
  const role   = dealer?.role||'sales_rep'
  const dept   = roleDept(role)
  const isMgr  = isManager(role)
  const [teamKPI,setTeamKPI] = useState(null)

  // Managers: fetch live dealership KPIs
  useEffect(()=>{
    if(isMgr&&dealer?.dealerId){
      dealerSync('getDashboard',dealer.dealerId,'').then(res=>{
        if(res&&!res.error){
          const acts=res.activities||[]
          const reps=[...new Set(acts.map(a=>a.repName))].filter(Boolean)
          const weekAgo=Date.now()-7*24*60*60*1000
          const weekActs=acts.filter(a=>a.timestamp>weekAgo)
          const won=acts.filter(a=>a.result==='won').length
          setTeamKPI({
            activeReps:reps.length,
            totalDrills:acts.length,
            weekHuddles:weekActs.filter(a=>a.type==='huddle').length,
            winRate:acts.length>0?Math.round((won/acts.length)*100):0,
            salesDrills:acts.filter(a=>a.dept==='sales').length,
            svcDrills:acts.filter(a=>a.dept==='service').length,
            voiceDrills:acts.filter(a=>a.type==='voice_drill').length,
          })
        }
      })
    }
  },[dealer?.dealerId,isMgr])

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const days     = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const now      = new Date()
  const todayDay = days[now.getDay()]
  const sched    = getSched(dept)
  const schedIdx = Math.max(0,Math.min(now.getDay()-1,4))
  const todayRow = sched[schedIdx]
  const todayScript = todayRow?.id ? SCRIPTS.find(s=>s.id===todayRow.id) : null

  const objScores = {}
  results.forEach(r=>{
    if(!objScores[r.script])objScores[r.script]={won:0,total:0}
    objScores[r.script].total++
    if(r.result==='won')objScores[r.script].won++
  })
  const weakObjs = Object.entries(objScores).filter(([,v])=>v.total>=2)
    .map(([k,v])=>({label:k,pct:Math.round((v.won/v.total)*100)}))
    .sort((a,b)=>a.pct-b.pct).slice(0,2)

  const todayDrills = results.filter(r=>r.date===new Date().toLocaleDateString('en-US')).length
  const dailyGoal   = 3
  const progressPct = Math.min((todayDrills/dailyGoal)*100,100)

  return (
    <div style={{paddingBottom:80}}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg,${C.navyMid},#0b1f4a)`,padding:'14px 16px 12px',borderBottom:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontFamily:fH,fontSize:20,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1}}>5-MINUTE <span style={{color:C.green}}>DEALER COACH</span></div>
            <div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginTop:2}}>COMMAND CENTER</div>
            {dealer?.dealerName&&<div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.blueBright,marginTop:2}}>{dealer.dealerName}</div>}
          </div>
          <div style={{textAlign:'right'}}>
            {/* Live calendar date widget */}
            <div style={{background:'rgba(26,107,255,0.15)',border:'1px solid rgba(26,107,255,0.3)',borderRadius:8,padding:'5px 10px',marginBottom:6,textAlign:'center',minWidth:52}}>
              <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.blueBright}}>{dayNames[now.getDay()].slice(0,3).toUpperCase()}</div>
              <div style={{fontFamily:fH,fontSize:24,fontWeight:900,color:C.white,lineHeight:1.1}}>{now.getDate()}</div>
              <div style={{fontFamily:fH,fontSize:9,fontWeight:700,color:C.gray}}>{months[now.getMonth()].toUpperCase()}</div>
            </div>
            {/* Name + role badge */}
            <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(184,255,60,0.1)',border:'1px solid rgba(184,255,60,0.25)',color:C.green,fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'3px 8px',borderRadius:100,maxWidth:150,overflow:'hidden'}}>
              <span>{ROLES[role]?.icon}</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dealer?.repName||ROLES[role]?.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'0 16px'}}>
        {/* Welcome message */}
        {welcomeMsg&&(
          <div style={{background:'linear-gradient(135deg,rgba(26,107,255,0.15),rgba(26,107,255,0.05))',border:'1px solid rgba(26,107,255,0.3)',borderRadius:12,padding:'12px 16px',marginBottom:12}}>
            <div style={{fontSize:13,color:C.white,lineHeight:1.5}}>{welcomeMsg}</div>
          </div>
        )}

        {/* Milestone banner */}
        {milestone&&(
          <div style={{background:'linear-gradient(135deg,rgba(184,255,60,0.15),rgba(184,255,60,0.05))',border:'1px solid rgba(184,255,60,0.4)',borderRadius:12,padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:32}}>{milestone.icon}</div>
            <div>
              <div style={{fontFamily:fH,fontSize:14,fontWeight:900,textTransform:'uppercase',color:C.green}}>🎉 {milestone.label}</div>
              <div style={{fontSize:12,color:C.lightText,marginTop:2}}>{milestone.msg}</div>
            </div>
          </div>
        )}

        {/* Live Drills — reps only show personal progress bar */}
        {!isMgr && (
          <div style={{background:'linear-gradient(135deg,rgba(26,107,255,0.12),rgba(26,107,255,0.05))',border:'1px solid rgba(26,107,255,0.3)',borderRadius:12,padding:'14px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:14}}>
            <div style={{background:'rgba(26,107,255,0.2)',borderRadius:10,padding:'10px 14px',textAlign:'center',minWidth:64}}>
              <div style={{fontFamily:fH,fontSize:38,fontWeight:900,color:C.blueBright,lineHeight:1}}>{todayDrills}</div>
              <div style={{fontFamily:fH,fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.blueBright,marginTop:2}}>Today</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:fH,fontSize:13,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:2}}>Live Drills</div>
              <div style={{height:6,background:'rgba(255,255,255,0.08)',borderRadius:100,overflow:'hidden',margin:'6px 0'}}>
                <div style={{height:'100%',width:`${progressPct}%`,background:todayDrills>=dailyGoal?C.green:C.blue,borderRadius:100,transition:'width 0.4s'}}/>
              </div>
              <div style={{fontSize:11,color:todayDrills>=dailyGoal?C.green:C.gray}}>{todayDrills>=dailyGoal?'✓ Daily goal complete!':` ${todayDrills} of ${dailyGoal} — ${dailyGoal-todayDrills} more to hit goal`}</div>
            </div>
          </div>
        )}

        {/* Streak + daily goal */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:20}}>🔥</span><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.orange}}>Drill Streak</div></div>
            <div style={{fontFamily:fH,fontSize:36,fontWeight:900,color:C.orange,lineHeight:1}}>{streak?.count||0}</div>
            <div style={{fontSize:11,color:C.gray,marginTop:2}}>consecutive days</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.blue}}>Today's Goal</div>
              <div style={{fontFamily:fH,fontSize:12,fontWeight:900,color:todayDrills>=dailyGoal?C.green:C.gray}}>{todayDrills}/{dailyGoal}</div>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,0.08)',borderRadius:100,overflow:'hidden',marginBottom:6}}>
              <div style={{height:'100%',width:`${progressPct}%`,background:todayDrills>=dailyGoal?C.green:C.blue,borderRadius:100,transition:'width 0.4s'}}/>
            </div>
            {todayDrills>=dailyGoal?<div style={{fontSize:11,color:C.green}}>✓ Goal complete!</div>:<div style={{fontSize:11,color:C.gray}}>{dailyGoal-todayDrills} more to hit your goal</div>}
          </div>
        </div>

        {/* Stats row — managers: clean 4-KPI row, reps: personal 3-stat row */}
        {isMgr ? (
          <div style={{marginBottom:12}}>
            {/* 4 essential KPIs in one row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
              {[
                {val:teamKPI?.activeReps??'—',     label:'Active Reps',  color:C.blue,   icon:'👥'},
                {val:teamKPI?.voiceDrills??'—',    label:'Voice Drills', color:C.yellow, icon:'🎙'},
                {val:teamKPI?.weekHuddles??'—',    label:'Huddles/Wk',   color:C.green,  icon:'⏱'},
                {val:teamKPI?`${teamKPI.winRate}%`:'—', label:'Win Rate', color:teamKPI?.winRate>=60?C.green:teamKPI?.winRate>=40?C.yellow:C.orange, icon:'🏆'},
              ].map(({val,label,color,icon})=>(
                <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                  <div style={{fontSize:14,marginBottom:2}}>{icon}</div>
                  <div style={{fontFamily:fH,fontSize:22,fontWeight:900,color,lineHeight:1}}>{val}</div>
                  <div style={{fontFamily:fH,fontSize:7,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color,marginTop:3,lineHeight:1.2}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Thin sales/service split strip */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13}}>🏆</span>
                <span style={{fontFamily:fH,fontSize:12,fontWeight:900,color:C.blue}}>{teamKPI?.salesDrills??0}</span>
                <span style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.blue}}>Sales</span>
              </div>
              <div style={{width:1,height:20,background:C.border}}/>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13}}>🔧</span>
                <span style={{fontFamily:fH,fontSize:12,fontWeight:900,color:C.green}}>{teamKPI?.svcDrills??0}</span>
                <span style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.green}}>Service</span>
              </div>
              <div style={{width:1,height:20,background:C.border}}/>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13}}>📊</span>
                <span style={{fontFamily:fH,fontSize:12,fontWeight:900,color:C.gray}}>{teamKPI?.totalDrills??0}</span>
                <span style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.gray}}>Total</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[{val:stats.drills||0,label:'Total Drills',color:C.blue},{val:stats.huddles||0,label:'Huddles',color:C.green},{val:stats.voices||0,label:'Voice Drills',color:C.yellow}].map(({val,label,color})=>(
              <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontFamily:fH,fontSize:30,fontWeight:900,color,lineHeight:1}}>{val}</div>
                <div style={{fontFamily:fH,fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color,marginTop:3}}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Today's Focus — huddle button now preloads script */}
        <div style={{background:'linear-gradient(135deg,#0f2a5c,#1a3a7a)',border:'1px solid rgba(26,107,255,0.4)',borderRadius:12,padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{background:'rgba(26,107,255,0.3)',borderRadius:6,padding:'3px 8px',fontFamily:fH,fontSize:9,fontWeight:900,color:C.white,letterSpacing:1,textTransform:'uppercase'}}>{dayNames[now.getDay()]} · {months[now.getMonth()]} {now.getDate()}</div>
            <span style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>Today's Focus</span>
          </div>
          <div style={{fontFamily:fH,fontSize:18,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1.1,marginBottom:4}}>{schedule[todayRow?.day]||todayRow?.label}</div>
          {todayScript&&<div style={{fontSize:12,color:C.gray,marginBottom:12,fontStyle:'italic'}}>"{getOpener(todayScript.id).substring(0,65)}..."</div>}
          <div style={{display:'grid',gridTemplateColumns:isMgr?'1fr 1fr':'1fr',gap:10}}>
            <button onClick={()=>onDrillNow(todayScript)} style={{background:C.green,color:C.navy,fontFamily:fH,fontWeight:900,fontSize:13,letterSpacing:1,textTransform:'uppercase',padding:11,borderRadius:8,border:'none',cursor:'pointer'}}>🎙 Drill This Now</button>
            {isMgr&&<button onClick={()=>onHuddleNow(todayScript)} style={{background:'rgba(26,107,255,0.2)',color:C.white,fontFamily:fH,fontWeight:900,fontSize:13,letterSpacing:1,textTransform:'uppercase',padding:11,borderRadius:8,border:'1px solid rgba(26,107,255,0.4)',cursor:'pointer'}}>⏱ Team Huddle</button>}
          </div>
        </div>

        {/* Quick Drill */}
        <div onClick={()=>onDrillNow(null)} style={{background:'linear-gradient(135deg,rgba(26,107,255,0.12),rgba(26,107,255,0.06))',border:'1px solid rgba(26,107,255,0.3)',borderRadius:12,padding:'12px 16px',marginBottom:12,cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
          <div style={{fontSize:28}}>⚡</div>
          <div style={{flex:1}}><div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:C.blueBright,marginBottom:1}}>Quick Drill</div><div style={{fontSize:12,color:C.lightText}}>Random objection — tap and go</div></div>
          <div style={{color:C.blueBright,fontSize:18}}>→</div>
        </div>

        {/* Weekly Schedule */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:16}}>📅</span><span style={{fontFamily:fH,fontSize:13,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.white}}>This Week</span></div>
            {isMgr&&weakObjs.length>0&&<div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.blueBright}}>🧠 AI Insights ↓</div>}
          </div>
          {sched.map((d,i)=>{
            const isToday = d.day===todayDay&&now.getDay()>=1&&now.getDay()<=5
            const label   = schedule[d.day]||d.label
            return <div key={d.day} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:i<4?`1px solid ${C.border}`:'none'}}>
              <div style={{fontFamily:fH,fontSize:12,fontWeight:900,color:isToday?C.green:C.gray,minWidth:32}}>{d.day}</div>
              <div style={{flex:1,fontSize:12,color:isToday?C.white:C.lightText}}>{label}</div>
              {isToday&&<div style={{background:C.green,color:C.navy,fontFamily:fH,fontSize:9,fontWeight:900,letterSpacing:1,textTransform:'uppercase',padding:'2px 7px',borderRadius:100}}>Today</div>}
            </div>
          })}
          {isMgr&&weakObjs.length>0&&(
            <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
              <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.blueBright,marginBottom:8}}>🧠 Needs More Practice</div>
              {weakObjs.map((w,i)=>{
                const d2=['MON','TUE','WED','THU','FRI']
                const ti=d2.indexOf(todayDay); const nd=d2[(ti+1)%5]||'TUE'
                const added=Object.values(schedule).some(v=>v.includes(w.label))
                return <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:i<weakObjs.length-1?6:0}}>
                  <div style={{fontSize:11,color:C.lightText,flex:2}}>{w.label}</div>
                  <div style={{fontFamily:fH,fontSize:12,fontWeight:900,color:w.pct<40?C.red:C.yellow}}>{w.pct}%</div>
                  <button onClick={()=>onScheduleChange({...schedule,[nd]:`🧠 Focus: ${w.label}`})} disabled={added} style={{background:added?'rgba(184,255,60,0.15)':'rgba(184,255,60,0.08)',border:'1px solid rgba(184,255,60,0.3)',color:C.green,fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'3px 8px',borderRadius:6,cursor:added?'default':'pointer'}}>{added?'✓':'+ Add'}</button>
                </div>
              })}
            </div>
          )}
        </div>

        {isMgr&&(
          <div onClick={()=>onNav('hub')} style={{background:'linear-gradient(135deg,rgba(184,255,60,0.08),rgba(184,255,60,0.03))',border:'1px solid rgba(184,255,60,0.3)',borderRadius:12,padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:26}}>🏢</div>
            <div style={{flex:1}}><div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:C.green,marginBottom:1}}>Manager Hub</div><div style={{fontSize:12,color:C.lightText}}>Shop Time · Leadership Grid · Ownership Lifecycle</div></div>
            <div style={{color:C.green,fontSize:18}}>→</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SCRIPT LIBRARY
// ══════════════════════════════════════════════════════════════
function ScriptLibrary({dealer}) {
  const dept     = roleDept(dealer?.role||'both')
  const lockDept = dept==='both'?null:dept
  const [filterDept,setFilterDept] = useState(lockDept||'all')
  const [cat,setCat]   = useState('all')
  const [search,setSearch] = useState('')
  const [openId,setOpenId] = useState(null)

  const filtered = SCRIPTS.filter(s=>{
    if(filterDept!=='all'&&s.dept!==filterDept) return false
    if(cat!=='all'&&s.category!==cat) return false
    if(search&&!s.objection.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{padding:'16px 16px 80px'}}>
      <div style={{fontFamily:fH,fontSize:28,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Script Library</div>
      <div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>60 Word Tracks — Sales & Service</div>
      <ScriptFilterBar dept={filterDept} setDept={setFilterDept} cat={cat} setCat={setCat} search={search} setSearch={setSearch} lockDept={lockDept}/>
      <div style={{fontSize:12,color:C.gray,marginBottom:12}}>{filtered.length} scripts</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(s=>(
          <div key={s.id} style={{background:C.card,border:`1px solid ${openId===s.id?(s.dept==='sales'?'rgba(26,107,255,0.4)':'rgba(184,255,60,0.3)'):C.border}`,borderRadius:10,overflow:'hidden'}}>
            <div onClick={()=>setOpenId(openId===s.id?null:s.id)} style={{padding:'12px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:openId===s.id?`linear-gradient(135deg,${C.navyLight},#0c1f40)`:'transparent'}}>
              <div style={{fontFamily:fH,fontSize:24,fontWeight:900,color:s.dept==='sales'?'rgba(26,107,255,0.3)':'rgba(184,255,60,0.3)',lineHeight:1,minWidth:32}}>{String(s.id).padStart(2,'0')}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:5,marginBottom:3,flexWrap:'wrap'}}><Tag color={s.dept==='sales'?C.blue:C.green}>{s.dept}</Tag><Tag color={C.gray}>{s.category}</Tag></div>
                <div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1.1}}>{s.objection.replace(/"/g,'')}</div>
              </div>
              <div style={{color:C.gray,fontSize:12}}>{openId===s.id?'▲':'▼'}</div>
            </div>
            {openId===s.id&&(
              <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:10}}>
                {[{label:'The Situation',color:C.gray,content:s.situation,bg:'rgba(255,255,255,0.03)'},{label:'The Mistake',color:C.red,content:s.mistake,bg:'rgba(255,107,107,0.06)'}].map(({label,color,content,bg})=>(
                  <div key={label}><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color,marginBottom:4}}>{label}</div><div style={{background:bg,border:`1px solid ${color}22`,borderRadius:6,padding:'8px 10px',fontSize:12,color:C.lightText,lineHeight:1.65}}>{content}</div></div>
                ))}
                <div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:4}}>The Script</div><div style={{background:'rgba(184,255,60,0.05)',border:'1px solid rgba(184,255,60,0.2)',borderLeft:`3px solid ${C.green}`,borderRadius:'0 6px 6px 0',padding:'10px 12px',fontSize:13,color:C.white,fontStyle:'italic',lineHeight:1.75}}>{s.script}</div></div>
                <div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.blueBright,marginBottom:4}}>Why It Works</div><div style={{background:'rgba(26,107,255,0.07)',border:'1px solid rgba(26,107,255,0.18)',borderRadius:6,padding:'8px 10px',fontSize:12,color:C.lightText,lineHeight:1.65}}>{s.why}</div></div>
                <div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:4}}>The Follow-Up</div><div style={{background:'rgba(255,201,71,0.05)',border:'1px solid rgba(255,201,71,0.15)',borderRadius:6,padding:'8px 10px',fontSize:12,color:'#ffe08a',fontStyle:'italic',lineHeight:1.65}}>{s.followup}</div></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// VOICE DRILL — Rebuilt AI coaching with strict ACRA grading
// Grading calibrated to script library. D/F grades for bad responses.
// ══════════════════════════════════════════════════════════════
function VoiceDrill({onLog,dealer,preloadScript,onClearPreload}) {
  const dept     = roleDept(dealer?.role||'both')
  const lockDept = dept==='both'?null:dept
  const [filterDept,setFilterDept] = useState(lockDept||'all')
  const [cat,setCat]         = useState('all')
  const [search,setSearch]   = useState('')
  const [phase,setPhase]     = useState('list')
  const [activeS,setActiveS] = useState(null)
  const [exchange,setExchange]   = useState(0)
  const [transcript,setTranscript] = useState('')
  const [allTranscripts,setAllTranscripts] = useState([])
  const [feedback,setFeedback]   = useState(null)
  const [loading,setLoading]     = useState(false)
  const [error,setError]         = useState('')
  const [recording,setRecording] = useState(false)
  const [aiText,setAiText]       = useState('')
  const [speaking,setSpeaking]   = useState(false)
  const [showScript,setShowScript] = useState(false)
  const recRef    = useRef(null)
  const supported = typeof window!=='undefined'&&('SpeechRecognition' in window||'webkitSpeechRecognition' in window)

  useEffect(()=>{
    if(preloadScript){ launch(preloadScript); onClearPreload&&onClearPreload() }
  },[preloadScript])

  const filtered = SCRIPTS.filter(s=>{
    const ed = lockDept||filterDept
    if(ed!=='all'&&s.dept!==ed) return false
    if(cat!=='all'&&s.category!==cat) return false
    if(search&&!s.objection.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const launch = script => {
    if (!script) {
      const pool = SCRIPTS.filter(s=>dept==='both'||s.dept===dept)
      script = pool[Math.floor(Math.random()*pool.length)]
    }
    setActiveS(script); setPhase('drill'); setExchange(0)
    setTranscript(''); setAllTranscripts([]); setFeedback(null); setError(''); setShowScript(false)
    const opener = getOpener(script.id); setAiText(opener)
    setSpeaking(true); speak(opener,()=>setSpeaking(false))
  }

  const startRec = () => {
    if(!supported){setError('Use Chrome or Edge for voice. Type below.');return}
    stopSpeaking(); setSpeaking(false)
    setTimeout(()=>{
      const SR = window.SpeechRecognition||window.webkitSpeechRecognition
      const rec = new SR(); rec.continuous=false; rec.interimResults=true; rec.lang='en-US'
      rec.onresult = e => setTranscript(Array.from(e.results).map(r=>r[0].transcript).join(''))
      rec.onend  = () => setRecording(false)
      rec.onerror = () => { setRecording(false); setError('Mic error — type your response below.') }
      rec.start(); recRef.current=rec; setRecording(true); setTranscript(''); setError('')
    },400)
  }
  const stopRec = () => { recRef.current?.stop(); setRecording(false) }

  const submit = async () => {
    if(!transcript.trim()){setError('Record or type a response first.');return}
    const newEx = exchange+1; setExchange(newEx)
    const updatedTranscripts = [...allTranscripts, transcript]
    setAllTranscripts(updatedTranscripts)
    if(newEx<3){
      setLoading(true)
      try{
        const res = await fetch('/ai-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          system:`You are a difficult automotive dealership customer objecting about: "${activeS.objection}". Push back realistically in 1-2 sentences based on what the salesperson just said. Stay in character. Do NOT coach or break character.`,
          messages:[{role:'user',content:`Customer said: "${aiText}"\nSalesperson responded: "${transcript}"\nYou are still the skeptical customer. Push back:`}]
        })})
        const data = await res.json()
        const reply = data.content?.[0]?.text||"I'm still not convinced. Tell me more."
        setAiText(reply); setTranscript(''); setError('')
        setSpeaking(true); speak(reply,()=>setSpeaking(false))
      }catch{setError('AI issue — type your next response.')}
      setLoading(false)
    } else {
      await getFeedback(transcript, updatedTranscripts)
    }
  }

  // ── REBUILT AI COACHING ENGINE ──────────────────────────────
  // Strict ACRA grading. References actual script library word track.
  // D/F grades for bad answers. No more default B grades.
  const getFeedback = async (lastResp, allResps) => {
    setLoading(true); setError(''); stopSpeaking()
    const fullConversation = allResps.join(' | ')

    const systemPrompt = `You are a brutally honest, world-class automotive sales and service coach. You have 25+ years of dealership floor experience and you coach like a top GM — direct, specific, zero sugarcoating.

OBJECTION BEING DRILLED: "${activeS.objection}"
DEPARTMENT: ${activeS.dept} | CATEGORY: ${activeS.category}

THE CORRECT SITUATION: ${activeS.situation}
THE COMMON MISTAKE (what earns a D or F): ${activeS.mistake}
THE MODEL WORD TRACK (what an A-level response looks like): "${activeS.script}"
THE FOLLOW-UP CLOSE (what an A adds at the end): "${activeS.followup}"
WHY THIS SCRIPT WORKS: ${activeS.why}

THE ACRA FRAMEWORK — evaluate each step strictly:
1. ACKNOWLEDGE: Did they validate/mirror the customer's exact concern before anything else? (Cannot skip this — jumping straight to a pitch = automatic C or lower)
2. CLARIFY: Did they ask ONE specific diagnostic question to find the root objection? "Is it X or is it Y?" Pitching without diagnosing = B ceiling.
3. RESPOND: Did they pivot to a specific, compelling value point tied to the dealership's unique advantage? Generic responses = C range.
4. ADVANCE: Did they close with a direct yes/no commitment question? Vague close like "does that help?" = B ceiling. No close at all = C or lower.

STRICT GRADING RUBRIC — calibrate to the model word track above:
- A+ : Near-perfect. All 4 ACRA steps. Language mirrors the model word track. Almost nothing to improve.
- A  : All 4 steps executed, minor wording polish only.
- B+ : 3 of 4 steps solid. One step noticeably weak but present.
- B  : 2-3 steps done partially. Some value built, key steps missing or vague.
- C+ : Attempted to respond but missed 2+ framework steps. Generic or surface-level.
- C  : Weak/no acknowledgment, no clarifying question, generic pitch, no real close.
- D  : Made the common mistake — discounted, got defensive, argued, or caved.
- F  : Completely wrong direction, went silent, panicked, or ignored the objection.

CRITICAL: Do NOT inflate grades. If the response was obviously wrong, defensive, or skipped the ACRA framework entirely — grade it D or F. A response cannot score above C if it skips acknowledgment and the clarifying question. Compare directly to the model word track.

RETURN ONLY valid JSON, no markdown, no preamble whatsoever:
{"score":"B","score_detail":"B — [one sharp, specific sentence describing exactly what worked and what was missing]","acknowledge":"[specific feedback — quote their actual words if possible, say exactly what they said or failed to say for acknowledgment]","clarify":"[specific feedback on whether they asked a diagnostic question or just pitched immediately]","respond":"[specific feedback on the value pivot — generic vs specific, how it compares to the model]","advance":"[specific feedback on their closing move — was there a decisive yes/no question?]","improvement":"[complete word-for-word script they should use — customized to THIS objection, mirrors the structure of the model word track above, minimum 3 full sentences, must include all 4 ACRA steps]"}`

    try {
      const res = await fetch('/ai-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        system: systemPrompt,
        messages:[{role:'user',content:`Full salesperson responses across 3 exchanges: "${fullConversation}"\n\nFinal response for grading: "${lastResp}"\n\nGrade strictly against the model word track and return ONLY the JSON object:`}]
      })})
      const data = await res.json()
      const raw  = data.content?.[0]?.text||''
      try {
        const p = JSON.parse(raw.replace(/```json|```/g,'').trim())
        if (p.score&&p.improvement) {
          setFeedback(p); setPhase('feedback')
          const spoken = `Here's your coaching. Grade: ${p.score}. ${p.acknowledge} ${p.clarify}`
          setSpeaking(true); speak(spoken,()=>setSpeaking(false))
          if(dealer?.dealerId){
            dealerSync('logActivity',dealer.dealerId,dealer.repName,{type:'voice_drill',script:activeS.objection.replace(/"/g,''),result:p.score,dept:activeS.dept})
          }
          setLoading(false); return
        }
      } catch {}
    } catch {}

    // Fallback — use model word track so they always get value
    setFeedback({
      score:'C',score_detail:'C — Evaluation incomplete. Review the model word track below.',
      acknowledge:'Compare your opening to the model — did you mirror the customer before pitching?',
      clarify:'Did you ask a clarifying question before presenting your value? That step is critical.',
      respond:'Review the model word track below and identify the specific value pivot used.',
      advance:'Did you end with a direct yes/no commitment question?',
      improvement: activeS.script + ' ' + activeS.followup
    })
    setPhase('feedback')
    setLoading(false)
  }

  const exportFeedbackPDF = () => {
    if(!feedback||!activeS) return
    const gClass = s=>s?.startsWith('A')?'grade-a':s?.startsWith('B')?'grade-b':(s?.startsWith('D')||s==='F')?'grade-d':'grade-c'
    printPDF(`Coaching Report — ${activeS.objection.replace(/"/g,'').substring(0,40)}`,`
      <h1>Voice Drill Coaching Report</h1>
      <div class="sub">${dealer?.repName||'Team Member'} · ${dealer?.dealerName||'Dealership'}</div>
      <div class="date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      <div class="divider"></div>
      <h2>Performance Summary</h2>
      <div class="card">
        <div class="score-badge ${gClass(feedback.score)}">${feedback.score}</div>
        <div style="font-size:14px;color:#333;margin-bottom:6px;">${feedback.score_detail}</div>
        <div style="font-size:13px;color:#666;"><strong>Objection:</strong> ${activeS.objection.replace(/"/g,'')}</div>
        <div style="font-size:13px;color:#666;margin-top:4px;"><strong>Dept:</strong> ${activeS.dept} · ${activeS.category}</div>
      </div>
      <h2>Model Word Track (What an A Sounds Like)</h2>
      <div class="word-track">${activeS.script} ${activeS.followup}</div>
      <h2>ACRA Coaching Breakdown</h2>
      ${[{label:'Acknowledge',content:feedback.acknowledge,cls:'blue'},{label:'Clarify',cls:'yellow',content:feedback.clarify},{label:'Respond',cls:'green',content:feedback.respond},{label:'Advance',cls:'red',content:feedback.advance}].map(({label,content,cls})=>`<div class="card ${cls}"><h3>${label}</h3><div class="val">${content}</div></div>`).join('')}
      <h2>Your Improvement Script</h2>
      <div class="card green"><h3>Use This Word Track Next Time</h3><div class="word-track">${feedback.improvement}</div></div>
      <div class="card red"><h3>Mistake to Avoid</h3><div class="val">${activeS.mistake}</div></div>
      <div class="card"><h3>Manager Review</h3>
        <div style="margin-bottom:12px;"><div class="label">Manager Notes</div><div style="border-bottom:1px solid #ccc;min-height:50px;"></div></div>
        <div style="display:flex;gap:20px;"><div style="flex:1;"><div class="label">Reviewed By</div><div style="border-bottom:1px solid #ccc;min-height:24px;"></div></div><div style="flex:1;"><div class="label">Date</div><div style="border-bottom:1px solid #ccc;min-height:24px;"></div></div></div>
      </div>
    `)
  }

  const logResult = result => {
    onLog({dept:activeS.dept,script:activeS.objection.replace(/"/g,''),result,notes:'Voice drill — AI coached',type:'voice'})
    setPhase('list'); setActiveS(null); stopSpeaking()
  }

  const gradeColor = s => s?.startsWith('A')?C.green:s?.startsWith('B')?C.blueBright:(s?.startsWith('D')||s==='F')?C.red:C.yellow

  // Feedback screen
  if(phase==='feedback'&&activeS&&feedback) return(
    <div style={{padding:'16px 16px 80px'}}>
      <button onClick={()=>{setPhase('list');setActiveS(null);stopSpeaking()}} style={{background:'none',border:`1px solid ${C.border}`,color:C.gray,fontFamily:fH,fontWeight:700,fontSize:12,letterSpacing:1,textTransform:'uppercase',padding:'6px 14px',borderRadius:6,cursor:'pointer',marginBottom:14}}>← Back</button>
      <PDFBtn onClick={exportFeedbackPDF} label="📄 Save Coaching Report PDF"/>

      <div style={{background:'linear-gradient(135deg,rgba(184,255,60,0.08),rgba(184,255,60,0.03))',border:'1px solid rgba(184,255,60,0.25)',borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
          <div style={{width:64,height:64,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:`${gradeColor(feedback.score)}20`,border:`3px solid ${gradeColor(feedback.score)}`,fontFamily:fH,fontSize:26,fontWeight:900,color:gradeColor(feedback.score),flexShrink:0}}>{feedback.score}</div>
          <div>
            <div style={{fontFamily:fH,fontSize:13,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>🎯 Coaching Report</div>
            <div style={{fontSize:12,color:C.white,marginTop:2,fontWeight:600}}>{activeS.objection.replace(/"/g,'')}</div>
            {feedback.score_detail&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{feedback.score_detail}</div>}
          </div>
        </div>

        {/* Model word track for reference */}
        <div style={{background:'rgba(184,255,60,0.06)',border:'1px solid rgba(184,255,60,0.2)',borderLeft:`3px solid ${C.green}`,borderRadius:'0 8px 8px 0',padding:'10px 12px',marginBottom:12}}>
          <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:4}}>📋 Model Word Track</div>
          <div style={{fontSize:12,color:C.lightText,lineHeight:1.65,fontStyle:'italic'}}>{activeS.script}</div>
        </div>

        {[{key:'acknowledge',label:'Acknowledge',icon:'👂',color:C.blueBright},{key:'clarify',label:'Clarify',icon:'🔍',color:C.yellow},{key:'respond',label:'Respond',icon:'💬',color:C.green},{key:'advance',label:'Advance',icon:'🎯',color:'#ff6bbb'}].map(({key,label,icon,color})=>(
          feedback[key]&&<div key={key} style={{background:`${color}08`,border:`1px solid ${color}22`,borderRadius:8,padding:'10px 12px',marginBottom:10}}>
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color,marginBottom:4}}>{icon} {label}</div>
            <div style={{fontSize:12,color:C.lightText,lineHeight:1.65}}>{feedback[key]}</div>
          </div>
        ))}

        {feedback.improvement&&(
          <div style={{background:'rgba(26,107,255,0.1)',border:'1px solid rgba(26,107,255,0.2)',borderLeft:`3px solid ${C.blue}`,borderRadius:'0 8px 8px 0',padding:'12px 14px',marginBottom:12}}>
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.blueBright,marginBottom:6}}>💡 Use This Word Track Next Time</div>
            <div style={{fontSize:13,color:C.white,lineHeight:1.7,fontStyle:'italic'}}>{feedback.improvement}</div>
          </div>
        )}

        <div style={{background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.15)',borderRadius:8,padding:'10px 12px',marginBottom:14}}>
          <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.red,marginBottom:4}}>⚠ Mistake to Avoid</div>
          <div style={{fontSize:12,color:'#ffaaaa',lineHeight:1.6}}>{activeS.mistake}</div>
        </div>

        <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:8}}>Log your result:</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {SCORES.map(({val,label,color})=>(
            <button key={val} onClick={()=>logResult(val)} style={{padding:'10px 4px',borderRadius:8,border:`1px solid ${color}44`,background:`${color}15`,color,fontFamily:fH,fontWeight:900,fontSize:12,letterSpacing:.5,textTransform:'uppercase',cursor:'pointer'}}>{label}</button>
          ))}
        </div>
      </div>
      <button onClick={()=>launch(activeS)} style={{width:'100%',background:'rgba(26,107,255,0.15)',border:'1px solid rgba(26,107,255,0.3)',color:C.blueBright,fontFamily:fH,fontWeight:900,fontSize:14,letterSpacing:1,textTransform:'uppercase',padding:12,borderRadius:8,cursor:'pointer'}}>🔁 Drill Again</button>
    </div>
  )

  // Active drill screen
  if(phase==='drill'&&activeS) return(
    <div style={{padding:'16px 16px 80px'}}>
      <button onClick={()=>{setPhase('list');setActiveS(null);stopSpeaking()}} style={{background:'none',border:`1px solid ${C.border}`,color:C.gray,fontFamily:fH,fontWeight:700,fontSize:12,letterSpacing:1,textTransform:'uppercase',padding:'6px 14px',borderRadius:6,cursor:'pointer',marginBottom:14}}>← Back</button>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}><Tag color={activeS.dept==='sales'?C.blue:C.green}>{activeS.dept}</Tag><Tag color={C.gray}>{activeS.category}</Tag></div>
      <div style={{fontFamily:fH,fontSize:16,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:14,lineHeight:1.1}}>{activeS.objection.replace(/"/g,'')}</div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>{[0,1,2].map(i=><div key={i} style={{flex:1,height:6,borderRadius:100,background:i<exchange?C.green:i===exchange?C.blue:'rgba(255,255,255,0.1)',transition:'all 0.4s'}}/>)}</div>
      <div style={{fontSize:12,color:C.gray,textAlign:'center',marginBottom:14}}>Exchange {exchange+1} of 3{exchange>=2?' — AI coaching after this':''}</div>

      <div style={{background:speaking?'rgba(26,107,255,0.15)':'rgba(26,107,255,0.08)',border:`1px solid ${speaking?'rgba(26,107,255,0.5)':'rgba(26,107,255,0.2)'}`,borderRadius:12,padding:'14px 16px',marginBottom:12,transition:'all 0.3s'}}>
        <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:speaking?C.green:C.blueBright,marginBottom:6}}>{speaking?'🔊 Customer Speaking...':'🗣 Customer Says:'}</div>
        <div style={{fontSize:14,color:C.white,fontStyle:'italic',lineHeight:1.65}}>"{aiText}"</div>
        <button onClick={()=>{stopSpeaking();setSpeaking(true);speak(aiText,()=>setSpeaking(false))}} style={{marginTop:8,background:'rgba(26,107,255,0.2)',border:'1px solid rgba(26,107,255,0.3)',color:C.blueBright,fontFamily:fH,fontWeight:700,fontSize:11,letterSpacing:1,textTransform:'uppercase',padding:'5px 12px',borderRadius:6,cursor:'pointer'}}>🔊 Replay</button>
      </div>

      <button onClick={()=>setShowScript(s=>!s)} style={{width:'100%',background:showScript?'rgba(184,255,60,0.08)':'rgba(255,255,255,0.04)',border:`1px solid ${showScript?'rgba(184,255,60,0.3)':C.border}`,color:showScript?C.green:C.gray,fontFamily:fH,fontWeight:700,fontSize:12,letterSpacing:1,textTransform:'uppercase',padding:'8px 14px',borderRadius:6,cursor:'pointer',marginBottom:8}}>
        {showScript?'▲ Hide Script':'📋 Show Script'}
      </button>
      {showScript&&<ScriptCard script={activeS} mode='scriptonly' defaultOpen={true}/>}

      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:14}}>
        <button onClick={recording?stopRec:startRec} style={{width:72,height:72,borderRadius:'50%',background:recording?C.red:C.green,border:'none',cursor:'pointer',fontSize:26,boxShadow:recording?`0 0 30px ${C.red}66`:`0 0 20px ${C.green}44`}}>{recording?'⏹':'🎙'}</button>
        <div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:recording?C.red:C.gray}}>{recording?'Recording — tap to stop':'Tap mic to respond'}</div>
      </div>

      <textarea style={{...inp,minHeight:70,resize:'vertical',lineHeight:1.65,marginBottom:10}} placeholder="Spoken response appears here — or type it..." value={transcript} onChange={e=>setTranscript(e.target.value)}/>
      {error&&<div style={{background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.2)',borderRadius:8,padding:'8px 12px',fontSize:13,color:C.red,marginBottom:10}}>{error}</div>}
      <button onClick={submit} disabled={loading||!transcript.trim()} style={{width:'100%',background:transcript.trim()?C.green:'rgba(255,255,255,0.08)',color:transcript.trim()?C.navy:C.gray,fontFamily:fH,fontWeight:900,fontSize:15,letterSpacing:1,textTransform:'uppercase',padding:14,borderRadius:8,border:'none',cursor:transcript.trim()?'pointer':'default',opacity:loading?0.6:1}}>
        {loading?'⏳ Analyzing...':(exchange>=2?'🎯 Get Coaching':'✓ Submit Response')}
      </button>
    </div>
  )

  // Drill list
  return(
    <div style={{padding:'16px 16px 80px'}}>
      <div style={{fontFamily:fH,fontSize:28,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Voice Drill</div>
      <div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>AI Customer · 3 Exchanges · ACRA Coaching</div>
      {!supported&&<div style={{fontSize:12,color:C.yellow,marginBottom:10}}>⚠ Use Chrome or Edge for voice input.</div>}
      <ScriptFilterBar dept={filterDept} setDept={setFilterDept} cat={cat} setCat={setCat} search={search} setSearch={setSearch} lockDept={lockDept}/>
      <div style={{fontSize:12,color:C.gray,marginBottom:10}}>{filtered.length} drills</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(s=>(
          <div key={s.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontFamily:fH,fontSize:20,fontWeight:900,color:s.dept==='sales'?'rgba(26,107,255,0.35)':'rgba(184,255,60,0.35)',minWidth:30,lineHeight:1}}>{String(s.id).padStart(2,'0')}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:fH,fontSize:13,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1.1,marginBottom:3}}>{s.objection.replace(/"/g,'')}</div>
              <div style={{fontSize:11,color:C.gray,fontStyle:'italic',lineHeight:1.4,marginBottom:3}}>"{getOpener(s.id).substring(0,55)}..."</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}><Tag color={s.dept==='sales'?C.blue:C.green}>{s.dept}</Tag><span style={{fontSize:10,color:C.gray,alignSelf:'center'}}>{s.category}</span></div>
            </div>
            <button onClick={()=>launch(s)} style={{background:C.green,color:C.navy,fontFamily:fH,fontWeight:900,fontSize:13,letterSpacing:1,textTransform:'uppercase',padding:'10px 14px',borderRadius:8,border:'none',cursor:'pointer',flexShrink:0}}>GO</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HUDDLE TIMER — Now accepts preloadScript from Home button
// ══════════════════════════════════════════════════════════════
function HuddleTimer({onLog,dealer,preloadScript,onClearPreload}) {
  const dept     = roleDept(dealer?.role||'both')
  const lockDept = dept==='both'?null:dept
  const [filterDept,setFilterDept] = useState(lockDept||'all')
  const [cat,setCat]   = useState('all')
  const [search,setSearch] = useState('')
  const [phase,setPhase]   = useState('setup')
  const [selScript,setSelScript] = useState(null)
  const [timeLeft,setTimeLeft]   = useState(TOTAL_H)
  const [running,setRunning]     = useState(false)
  const intRef = useRef(null)

  // Preload script from Home "Team Huddle" button
  useEffect(()=>{
    if(preloadScript){ setSelScript(preloadScript); onClearPreload&&onClearPreload() }
  },[preloadScript])

  const getStep  = elapsed => { let s=0; for(let i=STEP_STARTS.length-1;i>=0;i--){if(elapsed>=STEP_STARTS[i]){s=i;break}} return s }
  const elapsed  = TOTAL_H-timeLeft; const step = getStep(elapsed)
  const col      = SCOLS[step]; const stepData = STEPS[step]
  const circ     = 2*Math.PI*80; const pct = elapsed/TOTAL_H
  const fmt      = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const showScriptForStep = step===1||step===2

  useEffect(()=>{
    if(!running) return
    intRef.current=setInterval(()=>{
      setTimeLeft(t=>{if(t<=1){clearInterval(intRef.current);setRunning(false);setPhase('done');return 0}return t-1})
    },1000)
    return ()=>clearInterval(intRef.current)
  },[running])

  const startHuddle = () => { if(!selScript)return; setPhase('running'); setTimeLeft(TOTAL_H); setRunning(false) }
  const skipStep    = () => { if(step<STEPS.length-1){setTimeLeft(TOTAL_H-STEP_STARTS[step+1])}else{clearInterval(intRef.current);setRunning(false);setPhase('done')} }

  const logResult = result => {
    if(dealer?.dealerId) dealerSync('logActivity',dealer.dealerId,dealer.repName,{type:'huddle',script:selScript.objection.replace(/"/g,''),result,dept:selScript.dept})
    onLog({dept:selScript.dept,script:selScript.objection.replace(/"/g,''),result,notes:'Huddle drill',type:'huddle'})
    setPhase('setup'); setSelScript(null); setTimeLeft(TOTAL_H); setRunning(false)
  }

  const filtered = SCRIPTS.filter(s=>{
    const ed=lockDept||filterDept
    if(ed!=='all'&&s.dept!==ed) return false
    if(cat!=='all'&&s.category!==cat) return false
    if(search&&!s.objection.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if(phase==='done') return(
    <div style={{padding:'16px 16px 80px',textAlign:'center'}}>
      <div style={{fontSize:60,marginBottom:12}}>🏆</div>
      <div style={{fontFamily:fH,fontSize:30,fontWeight:900,textTransform:'uppercase',color:C.green,marginBottom:6}}>Huddle Complete!</div>
      <div style={{fontSize:14,color:C.lightText,marginBottom:16}}>How did the team handle it?</div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',marginBottom:14,textAlign:'left'}}>
        <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:4}}>Script Used</div>
        <div style={{fontFamily:fH,fontSize:14,fontWeight:900,textTransform:'uppercase',color:C.white}}>{selScript?.objection.replace(/"/g,'')}</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
        {SCORES.map(({val,label,color})=>(
          <button key={val} onClick={()=>logResult(val)} style={{padding:14,borderRadius:10,border:`1px solid ${color}44`,background:`${color}15`,color,fontFamily:fH,fontWeight:900,fontSize:16,letterSpacing:1,textTransform:'uppercase',cursor:'pointer'}}>{label}</button>
        ))}
      </div>
      <button onClick={()=>{setPhase('setup');setSelScript(null);setTimeLeft(TOTAL_H);setRunning(false)}} style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.gray,fontFamily:fH,fontWeight:700,fontSize:13,letterSpacing:1,textTransform:'uppercase',padding:12,borderRadius:8,cursor:'pointer'}}>New Huddle</button>
    </div>
  )

  if(phase==='running') return(
    <div style={{padding:'16px 16px 80px'}}>
      <div style={{display:'flex',gap:4,marginBottom:14}}>{STEPS.map((_,i)=><div key={i} style={{flex:1,height:5,borderRadius:100,background:i<step?SCOLS[i]:i===step?col:'rgba(255,255,255,0.1)',transition:'all 0.4s'}}/>)}</div>
      <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:10,marginBottom:14}}>
        {STEPS.map((s,i)=>(
          <div key={i} style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 10px',borderRadius:8,border:`1px solid ${i===step?SCOLS[i]+'55':C.border}`,background:i===step?`${SCOLS[i]}22`:'rgba(255,255,255,0.03)',opacity:i<step?0.5:i===step?1:0.7,transform:i===step?'scale(1.05)':'scale(1)',transition:'all 0.4s'}}>
            <div style={{fontSize:16}}>{s.icon}</div>
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:i===step?SCOLS[i]:C.gray,whiteSpace:'nowrap'}}>{s.label.split(' ').slice(0,2).join(' ')}</div>
            <div style={{fontFamily:fH,fontSize:10,fontWeight:900,color:i===step?SCOLS[i]:C.gray}}>{s.time}s</div>
          </div>
        ))}
      </div>
      <div style={{background:`${col}18`,border:`1px solid ${col}44`,borderRadius:12,padding:16,marginBottom:14,transition:'all 0.4s'}}>
        <div style={{fontSize:28,marginBottom:8}}>{stepData.icon}</div>
        <div style={{fontFamily:fH,fontSize:22,fontWeight:900,textTransform:'uppercase',color:col,marginBottom:6}}>{stepData.label}</div>
        <div style={{fontSize:13,color:C.lightText,lineHeight:1.65,opacity:.85}}>{stepData.desc}</div>
      </div>
      {showScriptForStep&&selScript&&<ScriptCard script={selScript} mode='scriptonly' defaultOpen={true}/>}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:16}}>
        <div style={{position:'relative',width:190,height:190}}>
          <svg width="190" height="190" style={{transform:'rotate(-90deg)'}}>
            <circle cx="95" cy="95" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
            <circle cx="95" cy="95" r="80" fill="none" stroke={col} strokeWidth="12" strokeDasharray={circ} strokeDashoffset={circ-pct*circ} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s linear,stroke 0.4s'}}/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontFamily:fH,fontSize:48,fontWeight:900,color:col,lineHeight:1,transition:'color 0.4s'}}>{fmt(timeLeft)}</div>
            <div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginTop:4}}>Step {step+1} of {STEPS.length}</div>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <button onClick={()=>{if(running){clearInterval(intRef.current);setRunning(false)}else setRunning(true)}} style={{background:running?C.yellow:C.green,color:C.navy,fontFamily:fH,fontWeight:900,fontSize:14,letterSpacing:1,textTransform:'uppercase',padding:'10px 24px',borderRadius:8,border:'none',cursor:'pointer'}}>
          {running?'⏸ Pause':timeLeft===TOTAL_H?'▶ Start':'▶ Resume'}
        </button>
        <button onClick={skipStep} style={{background:'rgba(255,255,255,0.05)',color:C.gray,fontFamily:fH,fontWeight:900,fontSize:14,letterSpacing:1,textTransform:'uppercase',padding:'10px 24px',borderRadius:8,border:`1px solid ${C.border}`,cursor:'pointer'}}>Skip →</button>
      </div>
    </div>
  )

  return(
    <div style={{padding:'16px 16px 80px'}}>
      <div style={{fontFamily:fH,fontSize:28,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Team Huddle</div>
      <div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>5-Minute Daily Team Drill</div>
      {selScript&&(
        <div style={{background:'rgba(184,255,60,0.08)',border:'1px solid rgba(184,255,60,0.3)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>Pre-selected</div>
          <div style={{fontFamily:fH,fontSize:13,fontWeight:900,textTransform:'uppercase',color:C.white,flex:1}}>{selScript.objection.replace(/"/g,'')}</div>
          <div style={{color:C.green,fontSize:16}}>✓</div>
        </div>
      )}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>⏱</span><span style={{fontFamily:fH,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.white}}>The 5-Minute Framework</span></div>
        {STEPS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:i<4?10:0}}>
            <div style={{background:`${SCOLS[i]}22`,border:`1px solid ${SCOLS[i]}44`,borderRadius:100,padding:'3px 7px',fontFamily:fH,fontSize:10,fontWeight:900,color:SCOLS[i],minWidth:32,textAlign:'center',flexShrink:0}}>{s.time}s</div>
            <div><div style={{fontFamily:fH,fontSize:12,fontWeight:900,textTransform:'uppercase',color:SCOLS[i],marginBottom:1}}>{s.icon} {s.label}</div><div style={{fontSize:11,color:C.gray,lineHeight:1.5}}>{s.desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>Pick Today's Script</div>
      <ScriptFilterBar dept={filterDept} setDept={setFilterDept} cat={cat} setCat={setCat} search={search} setSearch={setSearch} lockDept={lockDept}/>
      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16,maxHeight:300,overflowY:'auto'}}>
        {filtered.map(s=>(
          <div key={s.id} onClick={()=>setSelScript(s)} style={{background:selScript?.id===s.id?(s.dept==='sales'?'rgba(26,107,255,0.12)':'rgba(184,255,60,0.08)'):C.card,border:`1px solid ${selScript?.id===s.id?(s.dept==='sales'?'rgba(26,107,255,0.4)':'rgba(184,255,60,0.35)'):C.border}`,borderRadius:8,padding:'10px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontFamily:fH,fontSize:18,fontWeight:900,color:s.dept==='sales'?'rgba(26,107,255,0.4)':'rgba(184,255,60,0.4)',minWidth:26}}>{String(s.id).padStart(2,'0')}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:fH,fontSize:13,fontWeight:900,textTransform:'uppercase',color:C.white,lineHeight:1.1,marginBottom:2}}>{s.objection.replace(/"/g,'')}</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}><Tag color={s.dept==='sales'?C.blue:C.green}>{s.dept}</Tag><span style={{fontSize:10,color:C.gray,alignSelf:'center'}}>{s.category}</span></div>
            </div>
            {selScript?.id===s.id&&<div style={{color:C.green,fontSize:16}}>✓</div>}
          </div>
        ))}
      </div>
      <button onClick={startHuddle} disabled={!selScript} style={{width:'100%',background:selScript?C.green:'rgba(255,255,255,0.08)',color:selScript?C.navy:C.gray,fontFamily:fH,fontWeight:900,fontSize:16,letterSpacing:1,textTransform:'uppercase',padding:16,borderRadius:10,border:'none',cursor:selScript?'pointer':'default'}}>
        {selScript?'▶ Start 5-Minute Huddle':'Select a script to start'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// TRACK & DASHBOARD — Rebuilt
// Managers: 3 zones (Health Bar, Who Needs Attention, Activity Feed) + floating log
// Reps: personal stats + team rank
// ══════════════════════════════════════════════════════════════
function QuickLogSheet({onLog,onClose,dealer}) {
  const [dept,setDept]   = useState(null)
  const [selObj,setSelObj] = useState(null)
  const [result,setResult] = useState(null)
  const [rep,setRep]     = useState('')
  const isMgr = isManager(dealer?.role||'sales_rep')

  const filteredScripts = dept ? SCRIPTS.filter(s=>s.dept===dept) : []

  const submit = () => {
    if(!dept||!selObj||!result) return
    onLog({dept,script:selObj.objection.replace(/"/g,''),result,notes:'Live win logged',type:'manual',rep:rep||dealer?.repName})
    onClose()
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)'}}/>
      <div style={{position:'relative',background:C.navyMid,borderRadius:'16px 16px 0 0',padding:'20px 16px 32px',border:`1px solid ${C.border}`,maxHeight:'85vh',overflowY:'auto'}}>
        {/* Handle */}
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.2)',borderRadius:100,margin:'0 auto 16px'}}/>
        <div style={{fontFamily:fH,fontSize:18,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Log a Live Win</div>
        <div style={{fontSize:12,color:C.gray,marginBottom:16}}>Used a script on the floor? Log it in 10 seconds.</div>

        {/* Step 1 — Department */}
        <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>1. Department</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[{id:'sales',icon:'🏆',label:'Sales',color:C.blue},{id:'service',icon:'🔧',label:'Service',color:C.green}].map(d=>(
            <div key={d.id} onClick={()=>{setDept(d.id);setSelObj(null)}} style={{background:dept===d.id?`${d.color}20`:'rgba(255,255,255,0.04)',border:`2px solid ${dept===d.id?d.color:C.border}`,borderRadius:12,padding:'14px 12px',textAlign:'center',cursor:'pointer',transition:'all 0.15s'}}>
              <div style={{fontSize:28,marginBottom:4}}>{d.icon}</div>
              <div style={{fontFamily:fH,fontSize:14,fontWeight:900,textTransform:'uppercase',color:dept===d.id?d.color:C.gray}}>{d.label}</div>
            </div>
          ))}
        </div>

        {/* Step 2 — Objection picker */}
        {dept && (
          <>
            <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>2. Script / Objection</div>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:16,maxHeight:200,overflowY:'auto',border:`1px solid ${C.border}`,borderRadius:10,padding:'6px'}}>
              {filteredScripts.map(s=>(
                <div key={s.id} onClick={()=>setSelObj(s)} style={{background:selObj?.id===s.id?(dept==='sales'?'rgba(26,107,255,0.15)':'rgba(184,255,60,0.1)'):'transparent',border:`1px solid ${selObj?.id===s.id?(dept==='sales'?'rgba(26,107,255,0.4)':'rgba(184,255,60,0.3)'):'transparent'}`,borderRadius:8,padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{fontFamily:fH,fontSize:13,fontWeight:900,color:dept==='sales'?'rgba(26,107,255,0.4)':'rgba(184,255,60,0.4)',minWidth:24}}>{String(s.id).padStart(2,'0')}</div>
                  <div style={{fontSize:12,color:selObj?.id===s.id?C.white:C.lightText,lineHeight:1.3}}>{s.objection.replace(/"/g,'')}</div>
                  {selObj?.id===s.id&&<div style={{marginLeft:'auto',color:C.green,flexShrink:0}}>✓</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 3 — Result */}
        {selObj && (
          <>
            <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>3. Result</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              {SCORES.map(({val,label,color})=>(
                <div key={val} onClick={()=>setResult(val)} style={{background:result===val?`${color}20`:'rgba(255,255,255,0.04)',border:`2px solid ${result===val?color:C.border}`,borderRadius:10,padding:'12px 6px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontFamily:fH,fontSize:13,fontWeight:900,color:result===val?color:C.gray}}>{label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 4 — Rep name (managers only) */}
        {isMgr&&result&&(
          <>
            <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>4. Team Member (optional)</div>
            <input style={{...inp,marginBottom:16}} placeholder="Rep name — leave blank for yourself" value={rep} onChange={e=>setRep(e.target.value)}/>
          </>
        )}

        {/* Submit */}
        <button onClick={submit} disabled={!dept||!selObj||!result} style={{width:'100%',background:dept&&selObj&&result?C.green:'rgba(255,255,255,0.08)',color:dept&&selObj&&result?C.navy:C.gray,fontFamily:fH,fontWeight:900,fontSize:16,letterSpacing:1,textTransform:'uppercase',padding:14,borderRadius:10,border:'none',cursor:dept&&selObj&&result?'pointer':'default'}}>
          {dept&&selObj&&result?'Log It →':'Complete steps above'}
        </button>
      </div>
    </div>
  )
}

function TrackDash({results,onRemove,onLog,preloadScript,dealer}) {
  const isMgr = isManager(dealer?.role||'sales_rep')
  const [dashData,setDashData]     = useState(null)
  const [dashLoading,setDashLoading] = useState(false)
  const [showLog,setShowLog]       = useState(false)

  // Load team data for managers
  useEffect(()=>{
    if(isMgr&&dealer?.dealerId){
      setDashLoading(true)
      dealerSync('getDashboard',dealer.dealerId,'').then(res=>{setDashData(res);setDashLoading(false)})
    }
  },[dealer?.dealerId])

  // preloadScript intentionally not used to auto-open sheet

  const won      = results.filter(r=>r.result==='won').length
  const progress = results.filter(r=>r.result==='progress').length
  const practice = results.filter(r=>r.result==='practice').length

  const exportDashPDF = () => {
    if(!dashData) return
    const acts = dashData.activities||[]
    const reps  = [...new Set(acts.map(a=>a.repName))].filter(Boolean)
    const rows  = reps.map(rep=>{
      const ra=acts.filter(a=>a.repName===rep)
      return `<tr><td style="padding:7px 10px;border-bottom:1px solid #eee;">${rep}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;">${ra.length}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;color:#1a6bff;">${ra.filter(a=>a.dept==='sales').length}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;color:#5ca800;">${ra.filter(a=>a.dept==='service').length}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;color:#2d8a2d;">${ra.filter(a=>a.result==='won').length}</td></tr>`
    }).join('')
    printPDF('Team Dashboard Report',`
      <h1>${dashData.dealer?.name||'Team Dashboard'}</h1><div class="sub">Dealer Code: ${dealer?.dealerId}</div>
      <div class="date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      <div class="divider"></div><h2>Team Summary</h2>
      ${rows?`<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f0f4ff;"><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Rep</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Total</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#1a6bff;">Sales</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#5ca800;">Service</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#2d8a2d;">Won</th></tr></thead><tbody>${rows}</tbody></table>`:'<p style="color:#999;">No activity yet.</p>'}
      <h2>Recent Activity</h2>
      ${(dashData.activities||[]).slice(0,20).map(a=>`<div class="card"><div style="font-size:13px;font-weight:700;">${a.repName} <span style="font-size:11px;color:${a.dept==='sales'?'#1a6bff':'#5ca800'};font-weight:600;">[${(a.dept||'').toUpperCase()}]</span></div><div style="font-size:12px;color:#666;">${a.script} · ${new Date(a.timestamp).toLocaleDateString()}</div></div>`).join('')}
    `)
  }

  // ── MANAGER VIEW ──────────────────────────────────────────
  if(isMgr) {
    const acts     = dashData?.activities||[]
    const reps     = [...new Set(acts.map(a=>a.repName))].filter(Boolean)
    const weekAgo  = Date.now()-7*24*60*60*1000
    const weekActs = acts.filter(a=>a.timestamp>weekAgo)
    const won_t    = acts.filter(a=>a.result==='won').length
    const winRate  = acts.length>0?Math.round((won_t/acts.length)*100):0

    // Who needs attention
    const repStats = reps.map(rep=>{
      const ra=acts.filter(a=>a.repName===rep)
      const wa=weekActs.filter(a=>a.repName===rep)
      return{rep,total:ra.length,weekTotal:wa.length,won:ra.filter(a=>a.result==='won').length,sales:ra.filter(a=>a.dept==='sales').length,service:ra.filter(a=>a.dept==='service').length}
    }).sort((a,b)=>b.total-a.total)
    const topPerformers  = repStats.slice(0,2)
    const needsCoaching  = [...repStats].sort((a,b)=>a.weekTotal-b.weekTotal).slice(0,2)

    return(
      <div style={{padding:'16px 16px 100px',position:'relative'}}>
        {showLog&&<QuickLogSheet onLog={r=>{onLog(r);setShowLog(false)}} onClose={()=>setShowLog(false)} dealer={dealer}/>}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontFamily:fH,fontSize:26,fontWeight:900,textTransform:'uppercase',color:C.white}}>Dashboard</div>
          <PDFBtn onClick={exportDashPDF} label="📄 Export"/>
        </div>

        {/* Dealer code pill */}
        <div style={{background:'rgba(184,255,60,0.08)',border:'1px solid rgba(184,255,60,0.25)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,flexShrink:0}}>Dealer Code</div>
          <div style={{fontFamily:fH,fontSize:22,fontWeight:900,letterSpacing:4,color:C.white,flex:1}}>{dealer?.dealerId}</div>
          <div style={{fontSize:11,color:C.gray}}>Share with team</div>
        </div>

        {/* Live Drills Today */}
        {(() => {
          const today = new Date().toLocaleDateString('en-US')
          const todayActs = (dashData?.activities||[]).filter(a=>new Date(a.timestamp).toLocaleDateString('en-US')===today)
          const todaySales = todayActs.filter(a=>a.dept==='sales').length
          const todaySvc   = todayActs.filter(a=>a.dept==='service').length
          return (
            <div style={{background:'linear-gradient(135deg,rgba(26,107,255,0.12),rgba(26,107,255,0.05))',border:'1px solid rgba(26,107,255,0.3)',borderRadius:12,padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
              <div style={{background:'rgba(26,107,255,0.2)',borderRadius:10,padding:'10px 14px',textAlign:'center',minWidth:64}}>
                <div style={{fontFamily:fH,fontSize:38,fontWeight:900,color:C.blueBright,lineHeight:1}}>{todayActs.length}</div>
                <div style={{fontFamily:fH,fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.blueBright,marginTop:2}}>Today</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:fH,fontSize:13,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Live Drills Today</div>
                <div style={{display:'flex',gap:10}}>
                  <div style={{fontSize:11,color:C.blue}}>🏆 {todaySales} Sales</div>
                  <div style={{fontSize:11,color:C.green}}>🔧 {todaySvc} Service</div>
                  <div style={{fontSize:11,color:C.yellow}}>⏱ {todayActs.filter(a=>a.type==='huddle').length} Huddles</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:todayActs.length>0?C.green:C.gray}}>{todayActs.length>0?'🟢 Active':'⚫ No activity'}</div>
              </div>
            </div>
          )
        })()}

        {dashLoading&&<div style={{textAlign:'center',color:C.gray,padding:'40px 0'}}>Loading team data...</div>}

        {!dashLoading&&(
          <>
            {/* ── ZONE 1: HEALTH BAR ──────────────────────── */}
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>⚡ Dealership Health</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:6}}>
              {[
                {val:reps.length,label:'Active Reps',color:C.blue,icon:'👥'},
                {val:acts.length,label:'Total Drills',color:C.green,icon:'🎯'},
                {val:weekActs.filter(a=>a.type==='huddle').length,label:'Huddles/Wk',color:C.yellow,icon:'⏱'},
                {val:`${winRate}%`,label:'Win Rate',color:winRate>=60?C.green:winRate>=40?C.yellow:C.orange,icon:'🏆'},
              ].map(({val,label,color,icon})=>(
                <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                  <div style={{fontSize:14,marginBottom:2}}>{icon}</div>
                  <div style={{fontFamily:fH,fontSize:20,fontWeight:900,color,lineHeight:1}}>{val}</div>
                  <div style={{fontFamily:fH,fontSize:7,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color,marginTop:2,lineHeight:1.2}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Dept split bar */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              <div style={{background:'rgba(26,107,255,0.08)',border:'1px solid rgba(26,107,255,0.2)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                <span>🏆</span><div><div style={{fontFamily:fH,fontSize:18,fontWeight:900,color:C.blue}}>{acts.filter(a=>a.dept==='sales').length}</div><div style={{fontFamily:fH,fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.blue}}>Sales Drills</div></div>
              </div>
              <div style={{background:'rgba(184,255,60,0.07)',border:'1px solid rgba(184,255,60,0.2)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                <span>🔧</span><div><div style={{fontFamily:fH,fontSize:18,fontWeight:900,color:C.green}}>{acts.filter(a=>a.dept==='service').length}</div><div style={{fontFamily:fH,fontSize:8,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.green}}>Service Drills</div></div>
              </div>
            </div>

            {/* ── ZONE 2: WHO NEEDS ATTENTION ─────────────── */}
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>🎯 Coaching Priorities</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {/* Top performers */}
              <div style={{background:'rgba(184,255,60,0.06)',border:'1px solid rgba(184,255,60,0.2)',borderRadius:10,padding:'12px 12px'}}>
                <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.green,marginBottom:8}}>🔥 Recognize</div>
                {topPerformers.length===0&&<div style={{fontSize:11,color:C.gray,fontStyle:'italic'}}>No activity yet</div>}
                {topPerformers.map((r,i)=>(
                  <div key={r.rep} style={{marginBottom:i<topPerformers.length-1?8:0}}>
                    <div style={{fontFamily:fH,fontSize:12,fontWeight:900,textTransform:'uppercase',color:C.white}}>{r.rep}</div>
                    <div style={{fontSize:10,color:C.gray}}>{r.total} drills · {r.won} won</div>
                    {r.weekTotal>0&&<div style={{fontSize:10,color:C.green}}>{r.weekTotal} this week</div>}
                  </div>
                ))}
              </div>
              {/* Needs coaching */}
              <div style={{background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.15)',borderRadius:10,padding:'12px 12px'}}>
                <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.red,marginBottom:8}}>⚠ Coach Now</div>
                {needsCoaching.length===0&&<div style={{fontSize:11,color:C.gray,fontStyle:'italic'}}>No activity yet</div>}
                {needsCoaching.filter(r=>r.weekTotal===0||repStats.indexOf(r)>repStats.length/2).map((r,i)=>(
                  <div key={r.rep} style={{marginBottom:i<needsCoaching.length-1?8:0}}>
                    <div style={{fontFamily:fH,fontSize:12,fontWeight:900,textTransform:'uppercase',color:C.white}}>{r.rep}</div>
                    <div style={{fontSize:10,color:C.gray}}>{r.weekTotal===0?'No activity this week':`${r.weekTotal} drills this week`}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full leaderboard */}
            {repStats.length>0&&(
              <>
                <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>👥 Full Leaderboard</div>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px',marginBottom:16}}>
                  {repStats.map((r,i)=>(
                    <div key={r.rep} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<repStats.length-1?`1px solid ${C.border}`:'none'}}>
                      <div style={{fontFamily:fH,fontSize:13,fontWeight:900,color:i===0?C.yellow:C.gray,minWidth:20}}>#{i+1}</div>
                      <div style={{width:30,height:30,borderRadius:'50%',background:C.blue+'22',border:`1px solid ${C.blue}44`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:fH,fontSize:12,fontWeight:900,color:C.blue}}>{r.rep[0]?.toUpperCase()}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:fH,fontSize:12,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:1}}>{r.rep}</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          <span style={{fontSize:10,color:C.green}}>✓{r.won}</span>
                          {r.sales>0&&<span style={{fontSize:10,color:C.blue,background:'rgba(26,107,255,0.12)',padding:'1px 5px',borderRadius:100}}>🏆{r.sales}</span>}
                          {r.service>0&&<span style={{fontSize:10,color:C.green,background:'rgba(184,255,60,0.1)',padding:'1px 5px',borderRadius:100}}>🔧{r.service}</span>}
                        </div>
                      </div>
                      <div style={{fontFamily:fH,fontSize:18,fontWeight:900,color:C.blue}}>{r.total}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── ZONE 3: ACTIVITY FEED ────────────────────── */}
            {acts.length>0&&(
              <>
                <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>📊 Recent Activity</div>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16}}>
                  {acts.slice(0,15).map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:i<14?`1px solid ${C.border}`:'none'}}>
                      <div style={{background:a.dept==='sales'?'rgba(26,107,255,0.15)':'rgba(184,255,60,0.1)',border:`1px solid ${a.dept==='sales'?'rgba(26,107,255,0.3)':'rgba(184,255,60,0.25)'}`,borderRadius:4,padding:'2px 5px',fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1,color:a.dept==='sales'?C.blueBright:C.green,flexShrink:0}}>
                        {a.dept==='sales'?'SALES':'SVC'}
                      </div>
                      <div style={{fontFamily:fH,fontSize:10,fontWeight:700,color:scoreColor(a.result)}}>{scoreLabel(a.result)}</div>
                      <div style={{flex:1}}><div style={{fontSize:11,color:C.white}}>{a.repName}</div><div style={{fontSize:10,color:C.gray,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{a.script}</div></div>
                      <div style={{fontSize:9,color:C.gray,flexShrink:0}}>{new Date(a.timestamp).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!dashData&&!dashLoading&&<div style={{textAlign:'center',color:C.gray,padding:'40px 0',fontSize:13}}>Dashboard unavailable. Check connection.</div>}
          </>
        )}

        {/* Floating + Log button */}
        <div onClick={()=>setShowLog(true)} style={{position:'fixed',bottom:82,right:'max(12px, calc(50vw - 228px))',background:C.green,display:'flex',alignItems:'center',gap:6,padding:'11px 16px',borderRadius:100,cursor:'pointer',boxShadow:`0 4px 20px rgba(184,255,60,0.45)`,zIndex:200}}>
          <span style={{fontSize:20,lineHeight:1,color:C.navy,fontWeight:900}}>+</span>
          <span style={{fontFamily:fH,fontSize:12,fontWeight:900,letterSpacing:1,textTransform:'uppercase',color:C.navy}}>Log Win</span>
        </div>
      </div>
    )
  }

  // ── REP VIEW ────────────────────────────────────────────────
  const myWon      = results.filter(r=>r.result==='won').length
  const myProgress = results.filter(r=>r.result==='progress').length
  const myPractice = results.filter(r=>r.result==='practice').length

  return(
    <div style={{padding:'16px 16px 100px',position:'relative'}}>
      {showLog&&<QuickLogSheet onLog={r=>{onLog(r);setShowLog(false)}} onClose={()=>setShowLog(false)} dealer={dealer}/>}

      <div style={{fontFamily:fH,fontSize:26,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:14}}>My Activity</div>

      {/* Personal KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[{label:'Won',val:myWon,color:C.green},{label:'Progress',val:myProgress,color:C.yellow},{label:'Practice',val:myPractice,color:C.orange}].map(({label,val,color})=>(
          <div key={label} style={{background:`${color}10`,border:`1px solid ${color}33`,borderRadius:10,padding:12,textAlign:'center'}}>
            <div style={{fontFamily:fH,fontSize:30,fontWeight:900,color}}>{val}</div>
            <div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Activity list */}
      {!results.length
        ?<div style={{textAlign:'center',color:C.gray,padding:'40px 0',fontSize:13,fontStyle:'italic'}}>No results yet. Complete a drill to start tracking.</div>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {results.map(e=>(
            <div key={e.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'11px 13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontFamily:fH,fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:scoreColor(e.result)}}>{scoreLabel(e.result)}</span>
                  <Tag color={e.dept==='sales'?C.blue:C.green}>{e.dept==='sales'?'🏆 Sales':'🔧 Service'}</Tag>
                  {e.type&&<Tag color={e.type==='huddle'?'#3dcfcf':e.type==='manual'?C.orange:C.blueBright}>{e.type}</Tag>}
                  <span style={{fontSize:10,color:C.gray}}>{e.date}</span>
                </div>
                <button onClick={()=>onRemove(e.id)} style={{background:'none',border:'none',color:C.gray,cursor:'pointer',fontSize:16}}>×</button>
              </div>
              <div style={{fontSize:13,color:C.white}}>{e.script}</div>
            </div>
          ))}
        </div>
      }

      {/* Floating + Log button */}
      <div onClick={()=>setShowLog(true)} style={{position:'fixed',bottom:82,right:'max(12px, calc(50vw - 228px))',background:C.green,display:'flex',alignItems:'center',gap:6,padding:'11px 16px',borderRadius:100,cursor:'pointer',boxShadow:`0 4px 20px rgba(184,255,60,0.45)`,zIndex:200}}>
          <span style={{fontSize:20,lineHeight:1,color:C.navy,fontWeight:900}}>+</span>
          <span style={{fontFamily:fH,fontSize:12,fontWeight:900,letterSpacing:1,textTransform:'uppercase',color:C.navy}}>Log Win</span>
        </div>
    </div>
  )
}


// ── Manager Hub tools (ShopTime, LeaderGrid, Lifecycle) ───────
const TS_LIST=[{label:'Waiting for first job to arrive',r:true},{label:'Moving cars in and out of workshop',r:true},{label:'Waiting for parts',r:true},{label:'Ad-hoc breaks (smoking, chatting)',r:true},{label:'Asking advice / collecting tools',r:true},{label:'Completing repair order information',r:true},{label:'Liaison with service advisor — extra work',r:true},{label:'Cleaning the work bay area',r:false},{label:'Down-time between jobs',r:true},{label:'Natural / scheduled breaks',r:false},{label:'Re-work / warranty corrections',r:true}]
function ShopTime(){const[mins,setMins]=useState(Array(TS_LIST.length).fill(''));const[techs,setTechs]=useState('');const[dy,setDy]=useState('5');const[wks,setWks]=useState('49');const[elr,setElr]=useState('');const[acts,setActs]=useState([{stealer:'',owner:'',by:''},{stealer:'',owner:'',by:''},{stealer:'',owner:'',by:''}]);const total=mins.reduce((a,v)=>a+(parseFloat(v)||0),0);const annHrs=total&&techs?(total*(parseFloat(techs)||0)*(parseFloat(dy)||0)*(parseFloat(wks)||0))/60:0;const annLost=annHrs*(parseFloat(elr)||0);const sm={...inp,width:66,textAlign:'right'};const expPDF=()=>{const rows=TS_LIST.map((st,i)=>mins[i]?`<tr><td style="padding:7px 10px;border-bottom:1px solid #eee;">${st.label}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;">${mins[i]} mins</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;color:${st.r?'#1a6bff':'#999'};">${st.r?'Recoverable':'Partial'}</td></tr>`:'').filter(Boolean).join('');const ar=acts.filter(a=>a.stealer).map((a,i)=>`<div class="card blue"><div style="font-size:13px;font-weight:700;margin-bottom:8px;">Priority #${i+1}: ${a.stealer}</div><div style="display:flex;gap:20px;"><div><div class="label">Owner</div><div class="val">${a.owner||'—'}</div></div><div><div class="label">By When</div><div class="val">${a.by||'—'}</div></div></div></div>`).join('');printPDF('Shop Time Stealer',`<h1>Shop Time Stealer</h1><div class="sub">Lost Revenue Calculator</div><div class="date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div class="divider"></div>${rows?`<h2>Assessment</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><thead><tr style="background:#f0f4ff;"><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Activity</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Mins</th><th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Status</th></tr></thead><tbody>${rows}</tbody></table>`:''}<div class="card" style="background:#f0f8f0;border-color:#90c090;margin-bottom:20px;"><div class="label">Total Mins Lost/Day</div><div style="font-size:28px;font-weight:900;color:#1a6bff;">${total.toFixed(0)} mins</div>${annLost>0?`<div style="font-size:20px;font-weight:700;color:#e85d4a;margin-top:6px;">Annual Lost: $${annLost.toLocaleString('en-US',{maximumFractionDigits:0})}</div>`:''}</div><h2>Action Plan</h2>${ar||'<div class="card blue"><div class="label">Priority #1</div><div style="border-bottom:1px solid #ccc;min-height:26px;"></div></div>'}`)};return(<div><div style={{fontFamily:fH,fontSize:22,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Shop Time Stealer</div><div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>Lost Revenue Calculator</div><PDFBtn onClick={expPDF}/><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden',marginBottom:14}}><div style={{background:`linear-gradient(135deg,${C.navyLight},#0c1f40)`,padding:'10px 16px',borderBottom:`1px solid ${C.border}`}}><div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>Assessment</div></div>{TS_LIST.map((st,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:`1px solid ${C.border}`}}><div style={{flex:1,fontSize:12,color:C.lightText}}>{st.label}</div><div style={{fontSize:10,fontFamily:fH,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:st.r?C.green:C.yellow,minWidth:70,textAlign:'right'}}>{st.r?'✓ Recov.':'◑ Partial'}</div><input style={sm} type="number" min="0" placeholder="mins" value={mins[i]} onChange={e=>{const n=[...mins];n[i]=e.target.value;setMins(n)}}/></div>)}<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px'}}><div style={{fontFamily:fH,fontSize:12,fontWeight:700,textTransform:'uppercase',color:C.white}}>Total/Day</div><div style={{fontFamily:fH,fontSize:24,fontWeight:900,color:total>0?C.green:C.gray}}>{total>0?total.toFixed(0):'—'} <span style={{fontSize:12,color:C.gray}}>mins</span></div></div></div><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden',marginBottom:14}}><div style={{background:`linear-gradient(135deg,${C.navyLight},#0c1f40)`,padding:'10px 16px',borderBottom:`1px solid ${C.border}`}}><div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>Calculator</div></div><div style={{padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{[{lbl:'Mins/Day',val:total.toFixed(0),ro:true,suf:'mins'},{lbl:'Technicians',val:techs,set:setTechs,ph:'8',suf:'techs'},{lbl:'Days/Week',val:dy,set:setDy,ph:'5',suf:'days'},{lbl:'Weeks/Year',val:wks,set:setWks,ph:'49',suf:'wks'},{lbl:'Labor Rate',val:elr,set:setElr,ph:'185',pre:'$',suf:'/hr'}].map((r,i)=>(<div key={i} style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:10,fontFamily:fH,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:5}}>{r.lbl}</div><div style={{display:'flex',alignItems:'center',gap:4}}>{r.pre&&<span style={{color:C.gray,fontSize:13}}>{r.pre}</span>}{r.ro?<div style={{fontFamily:fH,fontSize:20,fontWeight:900,color:C.green}}>{r.val||'—'}</div>:<input style={{...inp,fontSize:15}} type="number" min="0" placeholder={r.ph} value={r.val} onChange={e=>r.set(e.target.value)}/>}<span style={{color:C.gray,fontSize:11}}>{r.suf}</span></div></div>))}<div style={{background:annLost>0?'rgba(184,255,60,0.06)':'rgba(255,255,255,0.03)',border:annLost>0?'1px solid rgba(184,255,60,0.3)':`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',gridColumn:'1 / -1'}}><div style={{fontSize:10,fontFamily:fH,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:4}}>Annual Lost Revenue</div><div style={{fontFamily:fH,fontSize:36,fontWeight:900,color:annLost>0?C.green:C.gray}}>{annLost>0?`$${annLost.toLocaleString('en-US',{maximumFractionDigits:0})}`:'—'}</div>{annLost>0&&<div style={{display:'flex',gap:10,marginTop:10}}>{[25,50].map(p=><div key={p} style={{background:'rgba(26,107,255,0.1)',border:'1px solid rgba(26,107,255,0.2)',borderRadius:6,padding:'6px 10px'}}><div style={{fontSize:10,color:C.gray,fontFamily:fH,letterSpacing:1,textTransform:'uppercase'}}>{p}% Recovery</div><div style={{fontFamily:fH,fontSize:18,fontWeight:900,color:C.blueBright}}>${(annLost*p/100).toLocaleString('en-US',{maximumFractionDigits:0})}</div></div>)}</div>}</div></div></div><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}><div style={{background:`linear-gradient(135deg,${C.navyLight},#0c1f40)`,padding:'10px 16px',borderBottom:`1px solid ${C.border}`}}><div style={{fontFamily:fH,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green}}>Action Plan</div></div><div style={{padding:14}}>{acts.map((a,n)=>(<div key={n} style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 12px',marginBottom:8}}><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:6}}>Priority #{n+1}</div><div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:6}}><input style={inp} placeholder="Time stealer..." value={a.stealer} onChange={e=>{const x=[...acts];x[n]={...x[n],stealer:e.target.value};setActs(x)}}/><input style={inp} placeholder="Owner..." value={a.owner} onChange={e=>{const x=[...acts];x[n]={...x[n],owner:e.target.value};setActs(x)}}/><input style={inp} placeholder="By when..." value={a.by} onChange={e=>{const x=[...acts];x[n]={...x[n],by:e.target.value};setActs(x)}}/></div></div>))}</div></div></div>)}

const QUADS=[{id:'guide',label:'Guide',title:'Lack of Experience',sub:'High Commit · Low Cap',color:C.blue,bg:'rgba(26,107,255,0.08)',bdr:'rgba(26,107,255,0.25)',desc:'Enthusiastic but developing. Invest here.',word:'"Let me show you exactly how I\'d handle that, then we\'ll practice together."',coaching:'Direct & Guide — clear expectations, role-play.'},{id:'delegate',label:'Delegate',title:'High Performers',sub:'High Commit · High Cap',color:C.green,bg:'rgba(184,255,60,0.07)',bdr:'rgba(184,255,60,0.3)',desc:'Skilled, self-motivated. Give them autonomy.',word:'"I trust you. Here\'s the outcome — how you get there is yours."',coaching:'Delegate — give ownership, recognize publicly.'},{id:'direct',label:'Direct',title:'Up or Out',sub:'Low Commit · Low Cap',color:C.red,bg:'rgba(255,107,107,0.07)',bdr:'rgba(255,107,107,0.25)',desc:'Most challenging. Every day unaddressed costs your team.',word:'"Here are the results I need in 30 days. The change starts now."',coaching:'Direct — documented expectations, 30-day plan.'},{id:'excite',label:'Excite',title:'Experienced, Not Engaged',sub:'Low Commit · High Cap',color:C.yellow,bg:'rgba(255,201,71,0.07)',bdr:'rgba(255,201,71,0.25)',desc:'Most dangerous. Capability without commitment breeds cynicism.',word:'"I\'ve noticed a shift. Help me understand what\'s changed."',coaching:'Excite — honest 1:1, find root cause.'}]
function LeaderGrid(){const[team,setTeam]=useState([]);const[nm,setNm]=useState('');const[qid,setQid]=useState('delegate');const[sel,setSel]=useState(null);const[acts,setActs]=useState({});const[ap,setAp]=useState([{emp:'',priority:'',action:'',when:''},{emp:'',priority:'',action:'',when:''}]);const selQ=QUADS.find(q=>q.id===sel);const add=()=>{if(!nm.trim())return;setTeam([...team,{name:nm.trim(),qid,id:Date.now()}]);setNm('')};const rem=id=>setTeam(team.filter(m=>m.id!==id));const allNames=team.map(m=>m.name);const qC={guide:'#e8f0ff',delegate:'#e8ffe8',direct:'#ffe8e8',excite:'#fff8e8'};const expPDF=()=>{const tR=QUADS.map(q=>{const mb=team.filter(m=>m.qid===q.id);if(!mb.length)return'';return`<div class="card"><div style="padding:4px 8px;background:${qC[q.id]};color:${q.color};font-weight:700;border-radius:4px;display:inline-block;margin-bottom:8px;">${q.label} — ${q.title}</div><div style="font-size:13px;color:#333;margin-bottom:8px;">${mb.map(m=>m.name).join(', ')}</div><div class="word-track">${q.word}</div></div>`}).join('');const aR=ap.filter(a=>a.emp).map(a=>{const eq=team.find(m=>m.name===a.emp);const q=QUADS.find(q=>q.id===eq?.qid);return`<div class="card"><div style="font-size:18px;font-weight:700;color:#050d1f;margin-bottom:4px;">${a.emp}</div>${q?`<div class="word-track">${q.word}</div>`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px;"><div><div class="label">Priority</div><div class="val">${a.priority||'—'}</div></div><div><div class="label">By When</div><div class="val">${a.when||'—'}</div></div></div><div><div class="label">Coaching Action</div><div class="val">${a.action||'—'}</div></div></div>`}).join('');printPDF('Commitment & Capability',`<h1>Commitment & Capability</h1><div class="sub">Leadership Grid</div><div class="date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div class="divider"></div>${tR?`<h2>Team Assessment</h2>${tR}`:''}${aR?`<h2>Coaching Action Plan</h2>${aR}`:''}<h2>Weekly Check-In</h2>${['Reviewed grid','Identified top 2 priorities','Matched coaching style','Scheduled 1:1s','Written commitments'].map(i=>`<div class="cb-row"><div class="cb"></div><div style="font-size:13px;">${i}</div></div>`).join('')}`)};return(<div><div style={{fontFamily:fH,fontSize:22,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Commitment & Capability</div><div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>Leadership Grid</div><PDFBtn onClick={expPDF}/><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:14}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>🎯</span><span style={{fontFamily:fH,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.white}}>The Coaching Model</span></div>{QUADS.map((q,i)=>(<div key={q.id} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:i<3?10:0}}><div style={{background:`${q.color}22`,border:`1px solid ${q.color}44`,borderRadius:8,padding:'5px 8px',fontFamily:fH,fontSize:10,fontWeight:900,color:q.color,minWidth:60,textAlign:'center',flexShrink:0}}>{q.label}</div><div><div style={{fontFamily:fH,fontSize:12,fontWeight:900,textTransform:'uppercase',color:q.color,marginBottom:1}}>{q.title}</div><div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>{q.sub} — {q.desc}</div></div></div>))}</div><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',marginBottom:14}}><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray,marginBottom:8}}>Add Team Member</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={{...inp,flex:1}} placeholder="Name..." value={nm} onChange={e=>setNm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><select style={{...inp,flex:'0 0 auto',cursor:'pointer'}} value={qid} onChange={e=>setQid(e.target.value)}>{QUADS.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select><button onClick={add} style={{background:C.green,color:C.navy,fontFamily:fH,fontWeight:900,fontSize:12,letterSpacing:1,textTransform:'uppercase',padding:'8px 14px',borderRadius:6,border:'none',cursor:'pointer'}}>Add</button></div></div><div style={{marginBottom:14}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{QUADS.map(q=>{const mb=team.filter(m=>m.qid===q.id);const isS=sel===q.id;return(<div key={q.id} onClick={()=>setSel(isS?null:q.id)} style={{background:isS?q.bg:C.card,border:`2px solid ${isS?q.color:C.border}`,borderRadius:10,padding:12,cursor:'pointer',minHeight:90}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><div><div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:q.color}}>{q.label}</div><div style={{fontFamily:fH,fontSize:11,fontWeight:700,textTransform:'uppercase',color:C.white,lineHeight:1.1}}>{q.title}</div><div style={{fontSize:10,color:C.gray}}>{q.sub}</div></div><div style={{background:q.bg,border:`1px solid ${q.bdr}`,borderRadius:100,width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:fH,fontWeight:900,fontSize:11,color:q.color}}>{mb.length}</div></div><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{mb.map(m=><div key={m.id} style={{background:'rgba(255,255,255,0.08)',borderRadius:100,padding:'2px 7px',fontSize:11,color:C.white,display:'flex',alignItems:'center',gap:4}}>{m.name}<span onClick={e=>{e.stopPropagation();rem(m.id)}} style={{color:C.gray,cursor:'pointer'}}>×</span></div>)}{!mb.length&&<div style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>Empty</div>}</div></div>)})}</div></div>{selQ&&(<div style={{background:selQ.bg,border:`1px solid ${selQ.bdr}`,borderRadius:10,padding:'13px 14px',marginBottom:14}}><div style={{fontFamily:fH,fontSize:15,fontWeight:900,textTransform:'uppercase',color:selQ.color,marginBottom:4}}>{selQ.label} — {selQ.title}</div><p style={{fontSize:13,color:C.lightText,lineHeight:1.65,marginBottom:10}}>{selQ.desc}</p><div style={{background:'rgba(0,0,0,0.2)',borderLeft:`3px solid ${selQ.color}`,borderRadius:'0 6px 6px 0',padding:'10px 12px',fontSize:13,color:C.white,fontStyle:'italic',lineHeight:1.65,marginBottom:10}}>{selQ.word}</div><textarea style={{...inp,minHeight:44,resize:'vertical'}} placeholder="My action this week..." value={acts[selQ.id]||''} onChange={e=>setActs({...acts,[selQ.id]:e.target.value})}/></div>)}<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'13px 14px',marginBottom:14}}><div style={{fontFamily:fH,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:4}}>📋 Coaching Action Plan</div><div style={{fontSize:12,color:C.gray,marginBottom:12}}>Pick 2 employees from your grid.</div>{ap.map((a,i)=>(<div key={i} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:8,padding:'11px 12px',marginBottom:8}}><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.green,marginBottom:8}}>Employee #{i+1}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}><div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:3}}>Name</div><select style={{...inp,cursor:'pointer'}} value={a.emp} onChange={e=>{const x=[...ap];x[i]={...x[i],emp:e.target.value};setAp(x)}}><option value="">Select...</option>{allNames.map(n=><option key={n} value={n}>{n}</option>)}</select></div><div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:3}}>Priority</div><select style={{...inp,cursor:'pointer'}} value={a.priority} onChange={e=>{const x=[...ap];x[i]={...x[i],priority:e.target.value};setAp(x)}}><option value="">Select...</option><option value="High — This Week">High — This Week</option><option value="Medium — This Month">Medium</option><option value="Watching">Watching</option></select></div></div><div style={{marginBottom:6}}><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:3}}>Coaching Action</div><input style={inp} placeholder="e.g. Role-play payment objection by Friday..." value={a.action} onChange={e=>{const x=[...ap];x[i]={...x[i],action:e.target.value};setAp(x)}}/></div><div><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.gray,marginBottom:3}}>By When</div><input style={inp} placeholder="e.g. Friday EOD" value={a.when} onChange={e=>{const x=[...ap];x[i]={...x[i],when:e.target.value};setAp(x)}}/></div></div>))}</div></div>)}

const LC_STEPS=[{id:'sell1',n:1,label:'Sell #1',title:'Set the Foundation',focus:'Sell the ownership experience, not just the vehicle.',color:'#e85d4a',actions:['Deliver 5 personalized ownership value points during the sale','Capture complete guest profile — email, phone, communication preferences','Introduce the service experience early — before the deal is done','Manager turn focused on the ownership journey, not just closing'],metrics:['Closing ratio','Email capture rate (goal: 85%+)','CRM notes quality score']},{id:'deliver',n:2,label:'Deliver',title:'Execute a Premium Delivery',focus:'Slow down the delivery to speed up retention.',color:'#e88b3a',actions:['Complete the Delivery Checklist with the guest — every delivery','Manager touchpoint during delivery reinforces brand trust','Confirm technology setup, features walkthrough, and first service intro','Manager signs off on checklist before guest departs'],metrics:['Delivery checklist completion rate (goal: 90%+)','Delivery satisfaction scores']},{id:'schedule',n:3,label:'Schedule',title:'Lock in Retention',focus:'Every delivery equals a future service appointment.',color:C.green,actions:['Schedule first service appointment at delivery — every time','Confirm appointment in system before goodbye','Activate automated confirmation texts and reminders','BDC follows up within 24 hours to confirm'],metrics:['Service appts set at delivery (goal: 90–100%)','First service show rate (goal: 75%+)']},{id:'reconnect',n:4,label:'ReConnect',title:'Reinforce the Relationship',focus:'This is where loyalty is built.',color:'#3dcfcf',actions:['Schedule the ReConnect during delivery — not as an afterthought','Complete within 3–7 days while experience is fresh','Review features, confirm satisfaction, validate service appointment','Document the ReConnect outcome in CRM'],metrics:['ReConnect completion rate (goal: 90%+)','ReConnect scheduled at delivery']},{id:'appraise',n:5,label:'Appraise',title:'Activate the Sales Opportunity',focus:'The service drive is your most consistent showroom.',color:C.blueBright,actions:['Send complimentary trade appraisal offer during service appointment confirmation','BDC monitors responses and qualifies interested guests','Service advisor verbally reinforces the appraisal offer','Sales team notified immediately when interest is expressed'],metrics:['Appraisal requests per month','Service-to-sales conversion rate']},{id:'sell2',n:6,label:'Sell #2',title:'Complete the Cycle',focus:'Your next sale is already in your service lane.',color:C.blue,actions:['Engage appraisal-interested guests with personalized follow-up','Present upgrade options, equity position, and loyalty incentives','Highlight ownership benefits of staying with your dealership','Track cycle time: days from Vehicle #1 to Vehicle #2 close'],metrics:['Repeat purchase rate','Service-to-sale conversion rate','Average lifecycle cycle days']}]
function Lifecycle(){const[checked,setChecked]=useState({});const[exp,setExp]=useState('sell1');const[notes,setNotes]=useState({});const tog=(sid,ai)=>{const k=`${sid}-${ai}`;setChecked(p=>({...p,[k]:!p[k]}))};const pct=step=>Math.round((step.actions.filter((_,i)=>checked[`${step.id}-${i}`]).length/step.actions.length)*100);const overall=Math.round(LC_STEPS.reduce((a,s)=>a+pct(s),0)/LC_STEPS.length);const expPDF=()=>{const items=LC_STEPS.map(step=>{const unc=step.actions.filter((_,i)=>!checked[`${step.id}-${i}`]);if(!unc.length)return'';return`<div class="card red"><div style="font-size:15px;font-weight:700;color:#e85d4a;margin-bottom:4px;">${step.n}. ${step.label} — ${step.title}</div><div style="font-size:12px;color:#666;font-style:italic;margin-bottom:8px;">"${step.focus}"</div>${unc.map(a=>`<div class="cb-row"><div class="cb"></div><div style="font-size:13px;color:#333;">${a}</div></div>`).join('')}${notes[step.id]?`<div style="background:#f8f8f8;border:1px solid #e0e0e0;border-radius:4px;padding:10px 12px;margin-top:8px;font-size:13px;color:#444;">${notes[step.id]}</div>`:''}</div>`}).filter(Boolean).join('');printPDF('Ownership Lifecycle',`<h1>Ownership Lifecycle</h1><div class="sub">Improvement Plan — ${overall}% Overall</div><div class="date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div class="divider"></div>${items||'<p style="color:#999;text-align:center;padding:20px;">All actions complete!</p>'}`)};return(<div><div style={{fontFamily:fH,fontSize:22,fontWeight:900,textTransform:'uppercase',color:C.white,marginBottom:4}}>Ownership Lifecycle</div><div style={{fontFamily:fH,fontSize:13,color:C.blueBright,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>First Sale to Second Sale</div><PDFBtn onClick={expPDF}/><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><div style={{fontFamily:fH,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.gray}}>Overall</div><div style={{fontFamily:fH,fontSize:20,fontWeight:900,color:overall>70?C.green:overall>30?C.yellow:C.gray}}>{overall}%</div></div><div style={{height:5,background:'rgba(255,255,255,0.08)',borderRadius:100,overflow:'hidden',marginBottom:10}}><div style={{height:'100%',width:`${overall}%`,background:`linear-gradient(90deg,${C.blue},${C.green})`,borderRadius:100}}/></div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{LC_STEPS.map(step=>{const p=pct(step);return<div key={step.id} onClick={()=>setExp(exp===step.id?null:step.id)} style={{background:p===100?'rgba(184,255,60,0.1)':C.card,border:`1px solid ${p===100?'rgba(184,255,60,0.4)':C.border}`,borderRadius:6,padding:'3px 7px',cursor:'pointer'}}><div style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:p===100?C.green:step.color}}>{step.label}</div><div style={{fontSize:10,color:C.gray}}>{p}%</div></div>})}</div></div>{LC_STEPS.map(step=>{const p=pct(step);const isO=exp===step.id;return(<div key={step.id} style={{background:C.card,border:`1px solid ${isO?step.color+'66':C.border}`,borderRadius:10,overflow:'hidden',marginBottom:8}}><div onClick={()=>setExp(isO?null:step.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',cursor:'pointer',background:isO?`linear-gradient(135deg,${C.navyLight},#0c1f40)`:'transparent'}}><div style={{fontFamily:fH,fontSize:22,fontWeight:900,color:step.color,minWidth:24,lineHeight:1}}>{step.n}</div><div style={{flex:1}}><div style={{fontFamily:fH,fontSize:14,fontWeight:900,textTransform:'uppercase',color:C.white}}>{step.label} — {step.title}</div><div style={{fontSize:11,color:C.gray,fontStyle:'italic'}}>"{step.focus}"</div></div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:36,height:3,background:'rgba(255,255,255,0.1)',borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:`${p}%`,background:step.color,borderRadius:100}}/></div><div style={{fontFamily:fH,fontSize:11,fontWeight:700,color:p===100?C.green:C.gray}}>{p}%</div><div style={{color:C.gray,fontSize:12}}>{isO?'▲':'▼'}</div></div></div>{isO&&(<div style={{padding:'12px 14px 14px'}}><div style={{marginBottom:10}}>{step.actions.map((a,i)=>{const k=`${step.id}-${i}`;const d=checked[k];return<label key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:6,cursor:'pointer'}}><input type="checkbox" checked={!!d} onChange={()=>tog(step.id,i)} style={{marginTop:2,accentColor:step.color}}/><span style={{fontSize:12,color:d?C.gray:C.lightText,textDecoration:d?'line-through':'none',lineHeight:1.55}}>{a}</span></label>})}</div><div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>{step.metrics.map((m,i)=><div key={i} style={{background:'rgba(26,107,255,0.1)',border:'1px solid rgba(26,107,255,0.2)',borderRadius:100,padding:'2px 8px',fontSize:11,color:C.blueBright,fontFamily:fH,fontWeight:700}}>{m}</div>)}</div><textarea style={{...inp,minHeight:40,resize:'vertical',lineHeight:1.5}} placeholder="Notes..." value={notes[step.id]||''} onChange={e=>setNotes({...notes,[step.id]:e.target.value})}/></div>)}</div>)})}</div>)}

const HUB_MODS=[{id:'shop',label:'Shop Time',icon:'⏱',C:ShopTime},{id:'grid',label:'Leadership Grid',icon:'🎯',C:LeaderGrid},{id:'lifecycle',label:'Lifecycle',icon:'🔄',C:Lifecycle}]
function ManagerHub(){const[active,setActive]=useState('shop');const Mod=HUB_MODS.find(m=>m.id===active)?.C;return(<div style={{padding:'16px 16px 80px'}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><div style={{background:`linear-gradient(135deg,${C.blue},${C.green})`,borderRadius:6,padding:'3px 10px',fontFamily:fH,fontSize:10,fontWeight:900,letterSpacing:2,textTransform:'uppercase',color:C.navy}}>Manager Hub</div></div><div style={{display:'flex',gap:2,marginBottom:20,borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>{HUB_MODS.map(m=>(<button key={m.id} onClick={()=>setActive(m.id)} style={{background:'transparent',border:'none',borderBottom:active===m.id?`2px solid ${C.green}`:'2px solid transparent',color:active===m.id?C.white:C.gray,fontFamily:fH,fontSize:12,fontWeight:active===m.id?900:600,letterSpacing:1,textTransform:'uppercase',padding:'8px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',marginBottom:-1}}><span>{m.icon}</span>{m.label}</button>))}</div>{Mod&&<Mod/>}</div>)}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [dealer,setDealer]     = useState(()=>loadJSON('5md-dealer',null))
  const [tab,setTab]           = useState('home')
  const [results,setResults]   = useState(()=>loadJSON('5md-results',[]))
  const [stats,setStats]       = useState(()=>loadJSON('5md-stats',{drills:0,huddles:0,voices:0}))
  const [streak,setStreak]     = useState(()=>loadJSON('5md-streak',{count:0,lastDay:''}))
  const [milestone,setMilestone] = useState(null)
  const [preloadDrill,setPreloadDrill]   = useState(null)
  const [preloadHuddle,setPreloadHuddle] = useState(null)
  const [preloadTracker,setPreloadTracker] = useState('')
  const [schedule,setSchedule] = useState(()=>loadJSON('5md-schedule',{}))
  const [welcomeMsg,setWelcomeMsg] = useState(null)

  useEffect(()=>{
    if(window.speechSynthesis){
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged=()=>window.speechSynthesis.getVoices()
    }
  },[])

  // Show welcome message once per day
  useEffect(()=>{
    if(dealer){
      const k = `5md-ws-${getTodayKey()}`
      if(!loadJSON(k,false)){
        setWelcomeMsg(pickWelcome(dealer.repName,false))
        saveJSON(k,true)
        setTimeout(()=>setWelcomeMsg(null),5500)
      }
    }
  },[dealer?.repName])

  const handleDealerDone = (info,isNew) => {
    setDealer(info); saveJSON('5md-dealer',info)
    const msg = pickWelcome(info.repName,isNew)
    setWelcomeMsg(msg)
    saveJSON(`5md-ws-${getTodayKey()}`,true)
    setTimeout(()=>setWelcomeMsg(null),6000)
  }

  const handleScheduleChange = updated => { setSchedule(updated); saveJSON('5md-schedule',updated) }
  const handleDrillNow  = script => { setPreloadDrill(script||'random'); setTab('drill') }
  const handleHuddleNow = script => { setPreloadHuddle(script); setTab('huddle') }

  const logResult = entry => {
    const repName = entry.rep || dealer?.repName
    const newEntry = {...entry,date:new Date().toLocaleDateString('en-US'),id:Date.now(),rep:repName}
    const newResults = [newEntry,...results]
    setResults(newResults); saveJSON('5md-results',newResults)
    const prevTotal = stats.drills||0
    const newStats  = {drills:prevTotal+1,huddles:(stats.huddles||0)+(entry.type==='huddle'?1:0),voices:(stats.voices||0)+(entry.type==='voice'?1:0)}
    setStats(newStats); saveJSON('5md-stats',newStats)
    const newStreak = updateStreak(streak)
    setStreak(newStreak); saveJSON('5md-streak',newStreak)
    const ms = getNewMilestone(prevTotal,prevTotal+1)
    if(ms){ setMilestone(ms); setTimeout(()=>setMilestone(null),8000) }
    // Sync ALL activity types to KV so dashboard reflects it
    if(dealer?.dealerId){
      dealerSync('logActivity',dealer.dealerId,repName,{
        type:entry.type||'manual',
        script:entry.script||'',
        result:entry.result||'',
        dept:entry.dept||'sales',
      })
    }
    // Only navigate to dashboard for drill/huddle completions, not manual quick logs
    if(entry.type!=='manual'){
      setPreloadTracker(entry.script||'')
      setTab('tracker')
    }
  }

  const removeResult = id => { const u=results.filter(r=>r.id!==id); setResults(u); saveJSON('5md-results',u) }

  if(!dealer) return <Onboarding onDone={handleDealerDone}/>

  const role  = dealer.role||'sales_rep'
  const isMgr = isManager(role)

  const TABS = [
    {id:'home',    label:'Home',    icon:'🏠'},
    {id:'scripts', label:'Scripts', icon:'📋'},
    {id:'drill',   label:'Drill',   icon:'🎙'},
    ...(isMgr?[{id:'huddle',label:'Huddle',icon:'⏱'}]:[]),
    {id:'tracker', label:'Dashboard',   icon:'📊'},
    ...(isMgr?[{id:'hub',label:'Hub',icon:'🏢'}]:[]),
  ]

  return(
    <div style={{fontFamily:fB,background:C.navy,minHeight:'100vh',color:C.white,maxWidth:480,margin:'0 auto',position:'relative'}}>
      <div style={{paddingBottom:72}}>
        {tab==='home'    &&<Home onNav={setTab} dealer={dealer} stats={stats} results={results} streak={streak} milestone={milestone} onDrillNow={handleDrillNow} onHuddleNow={handleHuddleNow} schedule={schedule} onScheduleChange={handleScheduleChange} welcomeMsg={welcomeMsg}/>}
        {tab==='scripts' &&<ScriptLibrary dealer={dealer}/>}
        {tab==='drill'   &&<VoiceDrill onLog={logResult} dealer={dealer} preloadScript={preloadDrill==='random'?null:preloadDrill} onClearPreload={()=>setPreloadDrill(null)}/>}
        {tab==='huddle'  &&isMgr&&<HuddleTimer onLog={logResult} dealer={dealer} preloadScript={preloadHuddle} onClearPreload={()=>setPreloadHuddle(null)}/>}
        {tab==='tracker' &&<TrackDash results={results} onRemove={removeResult} onLog={logResult} preloadScript={preloadTracker} dealer={dealer}/>}
        {tab==='hub'     &&isMgr&&<ManagerHub/>}
      </div>

      {/* Bottom nav — improved visibility */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:C.navyMid,borderTop:`1px solid ${C.border}`,display:'flex',zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:tab===t.id?'rgba(184,255,60,0.07)':'none',border:'none',borderTop:tab===t.id?`2px solid ${C.green}`:'2px solid transparent',padding:'10px 2px 8px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <span style={{fontSize:16,opacity:tab===t.id?1:0.65}}>{t.icon}</span>
            <span style={{fontFamily:fH,fontSize:9,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:tab===t.id?C.green:C.lightText}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
