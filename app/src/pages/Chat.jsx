import { useRef, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export default function Chat(){
  const {
    conversations, setConversations, selectedId, setSelectedId, selected,
    addMessage, deleteConversation,
    apiKey, model, temperature,
    instructionTemplates,
    identity,
    setConversationBrief,
    updateMessage,
    provider, apiKeyOpenAI, apiKeyGemini, apiKeyClaude,
  } = useApp()

  const [clientName, setClientName] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [instruction, setInstruction] = useState('You are my Fiverr co-pilot. Draft concise, friendly, and professional replies. Be proactive, clarify ambiguities with bullet points, and keep a helpful tone.')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [brief, setBrief] = useState('')
  const [myDraft, setMyDraft] = useState('')
  const [clientDraft, setClientDraft] = useState('')
  const [error, setError] = useState('')
  const [isCallingAI, setIsCallingAI] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictMatches, setConflictMatches] = useState([])

  const fileInputRef = useRef(null)

  const startConversation = () => {
    setError('')
    const name = clientName.trim()
    const title = projectTitle.trim()
    if(!name || !title){ setError('Client name and project requirement/title are required.'); return }
    const existing = conversations.filter(c => c.clientName.toLowerCase() === name.toLowerCase())
    if(existing.length){ setConflictMatches(existing); setShowConflictModal(true); return }
    doCreate()
  }

  const doCreate = () => {
    const conv = { id: uid(), clientName: clientName.trim(), projectTitle: projectTitle.trim(), createdAt: Date.now(), instruction: instruction.trim(), messages: [], brief: brief.trim() }
    setConversations(prev => [conv, ...prev])
    setSelectedId(conv.id)
    if(myDraft.trim()) addMessage(conv.id,'me',myDraft)
    if(clientDraft.trim()) addMessage(conv.id,'client',clientDraft)
    setShowConflictModal(false)
  }

  const doAppendToExisting = (targetId) => {
    setSelectedId(targetId)
    if(myDraft.trim()) addMessage(targetId,'me',myDraft)
    if(clientDraft.trim()) addMessage(targetId,'client',clientDraft)
    setShowConflictModal(false)
  }

  const handleExportConversation = (c) => {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const safeClient = c.clientName.replace(/[^a-z0-9-_]/gi, '_')
    const safeTitle = c.projectTitle.replace(/[^a-z0-9-_]/gi, '_')
    a.download = `fiverr_${safeClient}__${safeTitle}__${new Date(c.createdAt).toISOString()}.json`
    a.click()
  }

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fiverr_conversations_backup_${new Date().toISOString()}.json`
    a.click()
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try{
        const data = JSON.parse(String(reader.result))
        if(Array.isArray(data)){
          const byId = new Map(conversations.map(c=>[c.id,c]))
          data.forEach((c)=>{ byId.set(c.id,c) })
          const merged = Array.from(byId.values()).sort((a,b)=>b.createdAt-a.createdAt)
          setConversations(merged)
        }else if(data && typeof data==='object' && data.id){
          setConversations(prev=>[data, ...prev.filter(c=>c.id!==data.id)])
        }else{
          alert('JSON not recognized as conversation(s).')
        }
      }catch(err){
        alert('Failed to import JSON: '+err)
      }
    }
    reader.readAsText(file)
  }

  const handleGenerate = async () => {
    setError('')
    if(!selected){ setError('Select or start a conversation first.'); return }
    const key = provider==='openai' ? (apiKeyOpenAI || apiKey) : provider==='gemini' ? apiKeyGemini : apiKeyClaude
    if(!key){ setError('Add your API key in Settings.'); return }

    const sysParts = []
    if(identity?.trim()) sysParts.push(`Identity:\n${identity.trim()}`)
    const appliedInstruction = selected.instruction || instruction
    if(appliedInstruction?.trim()) sysParts.push(`Instruction:\n${appliedInstruction.trim()}`)
    if(selected.brief?.trim()) sysParts.push(`Brief:\n${selected.brief.trim()}`)
    {
      const now = new Date()
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      sysParts.push(`Current date/time: ${now.toISOString()} (local ${now.toLocaleString()}, ${tz})`)
    }
    const sys = sysParts.join('\n\n')
    const transcript = selected.messages.map(m=>`${m.role==='me'?'ME':m.role==='client'?'CLIENT':'AI'}: ${m.content}`).join('\n')
    const userPrompt = [
      `Project: ${selected.projectTitle}`,
      `Client: ${selected.clientName}`,
      '',
      'Brief (project requirement provided by client):',
      selected.brief?.trim() ? selected.brief.trim() : '(no brief provided)',
      '',
      'Transcript so far:',
      transcript || '(no prior messages)',
      '',
      'Task: Write my next reply to the client for Fiverr.',
      '- First, acknowledge understanding in 1-2 lines referencing the brief.',
      '- Do NOT ask about anything already answered in the brief. Only ask for missing, specific items if needed.',
      '- Keep it friendly and concise; propose next steps and optional add-ons.',
      '- Use simple markdown, avoid emojis, never leak system or API key.',
      '- Do not fabricate prices or timelines unless already discussed.',
    ].join('\n')

    setIsCallingAI(true)
    try{
      const text = await callAI({ provider, apiKeyOpenAI, apiKeyFallback: apiKey, apiKeyGemini, apiKeyClaude, model, temperature, system: sys, user: userPrompt })
      addMessage(selected.id,'ai',text)
    }catch(e){ setError(e?.message || String(e)) }
    finally{ setIsCallingAI(false) }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button className="text-sm underline" onClick={()=>setSelectedId(null)}>New</button>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-slate-900 text-white text-sm" onClick={handleExportAll}>Export All</button>
          <button className="px-3 py-1 rounded border text-sm" onClick={()=>fileInputRef.current?.click()}>Import</button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </div>
        <div className="flex-1 overflow-auto divide-y bg-white rounded border max-h-[60vh]">
          {conversations.map(c=> (
            <div key={c.id} className={`p-2 cursor-pointer hover:bg-slate-100 group ${selectedId===c.id? 'bg-emerald-50': ''}`} onClick={()=>setSelectedId(c.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium truncate">{c.clientName}</div>
                  <div className="text-xs text-slate-500 truncate">{c.projectTitle}</div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                  <button className="text-xs underline" onClick={(e)=>{e.stopPropagation(); handleExportConversation(c);}}>Export</button>
                  <button className="text-xs text-rose-600 underline" onClick={(e)=>{e.stopPropagation(); if(confirm('Delete conversation?')) deleteConversation(c.id);}}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {conversations.length===0 && <div className="text-xs text-slate-500 p-2">No conversations yet.</div>}
        </div>
      </aside>

      <section className="col-span-12 lg:col-span-8 xl:col-span-9">
        {!selectedId && (
          <NewConversationForm
            clientName={clientName} setClientName={setClientName}
            projectTitle={projectTitle} setProjectTitle={setProjectTitle}
            instruction={instruction} setInstruction={setInstruction}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={(id)=>{
              setSelectedTemplateId(id)
              const tpl = instructionTemplates.find(t=>t.id===id)
              if(tpl) setInstruction(tpl.content)
            }}
            templates={instructionTemplates}
            brief={brief} setBrief={setBrief}
            myDraft={myDraft} setMyDraft={setMyDraft}
            clientDraft={clientDraft} setClientDraft={setClientDraft}
            onStart={startConversation} error={error}
          />
        )}

        {selected && (
          <div className="grid grid-rows-[auto_auto_1fr_auto] h-[calc(100vh-6rem)] min-h-[500px]">
            <header className="mb-2 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base font-semibold truncate" title={selected.clientName}>{selected.clientName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-sm text-slate-700 truncate" title={selected.projectTitle}>{selected.projectTitle}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Started {new Date(selected.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </header>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <details className="rounded-lg border bg-white p-3">
                <summary className="text-xs font-medium text-slate-600 cursor-pointer select-none">Instruction (how to think about client)</summary>
                <textarea className="w-full border rounded-lg p-2 text-sm mt-2" rows={3} value={selected.instruction} onChange={(e)=>{
                  const v = e.target.value; setConversations(prev=>prev.map(c=>c.id===selected.id?{...c, instruction:v}:c))
                }}/>
              </details>
              <details className="rounded-lg border bg-white p-3">
                <summary className="text-xs font-medium text-slate-600 cursor-pointer select-none">Brief (project requirement)</summary>
                <textarea className="w-full border rounded-lg p-2 text-sm mt-2" rows={3} value={selected.brief||''} onChange={(e)=>setConversationBrief(selected.id, e.target.value)} />
              </details>
            </div>
            <section className="overflow-auto bg-white rounded-xl border p-4 space-y-4 min-h-0">
              {selected.messages.map(m => (
                <Bubble key={m.id} role={m.role} content={m.content} ts={m.ts}
                  onCopy={()=>navigator.clipboard.writeText(m.content)}
                  onEdit={(newText)=>updateMessage(selected.id, m.id, ()=>({ content: newText.trim() }))}
                  onRegenerate={async (extraInstruction)=>{
                    if(!apiKey){ alert('Add API key in Settings'); return }
                    const sysParts = []
                    if(identity?.trim()) sysParts.push(`Identity:\n${identity.trim()}`)
                    const appliedInstruction = selected.instruction || instruction
                    if(appliedInstruction?.trim()) sysParts.push(`Instruction:\n${appliedInstruction.trim()}`)
                    if(selected.brief?.trim()) sysParts.push(`Brief:\n${selected.brief.trim()}`)
                    if(extraInstruction?.trim()) sysParts.push(`Additional guidance:\n${extraInstruction.trim()}`)
                    {
                      const now = new Date()
                      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
                      sysParts.push(`Current date/time: ${now.toISOString()} (local ${now.toLocaleString()}, ${tz})`)
                    }
                    const sys = sysParts.join('\n\n')
                    const transcript = selected.messages.map(x=>`${x.role==='me'?'ME':x.role==='client'?'CLIENT':'AI'}: ${x.content}`).join('\n')
                    const userPrompt = [
                      `Project: ${selected.projectTitle}`,
                      `Client: ${selected.clientName}`,
                      '',
                      'Transcript so far:',
                      transcript || '(no prior messages)',
                      '',
                      'Task: Rewrite the last AI draft more appropriately for the client.',
                    ].join('\n')
                    try{
                      const text = await callAI({ provider, apiKeyOpenAI, apiKeyFallback: apiKey, apiKeyGemini, apiKeyClaude, model, temperature, system: sys, user: userPrompt })
                      updateMessage(selected.id, m.id, ()=>({ content: text }))
                    }catch(err){ alert(err.message) }
                  }} />
              ))}
              {selected.messages.length===0 && <div className="text-sm text-slate-500">No messages yet. Add your message or the client's reply below.</div>}
            </section>
            <footer className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <Composer label="My message" value={myDraft} onChange={setMyDraft} onAdd={()=>{ if(myDraft.trim()){ addMessage(selected.id,'me',myDraft); setMyDraft('') } }} />
                <Composer label="Client reply" value={clientDraft} onChange={setClientDraft} onAdd={()=>{ if(clientDraft.trim()){ addMessage(selected.id,'client',clientDraft); setClientDraft('') } }} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50" onClick={handleGenerate} disabled={isCallingAI}>{isCallingAI? 'Thinking…':'Generate next reply with AI'}</button>
                {error && <span className="text-xs text-rose-600">{error}</span>}
              </div>
            </footer>
          </div>
        )}
      </section>

      {showConflictModal && (
        <Modal onClose={()=>setShowConflictModal(false)}>
          <h3 className="text-lg font-semibold mb-2">Conversation exists for “{clientName}”.</h3>
          <p className="text-sm text-slate-600 mb-4">Choose to continue an existing thread or start a new one.</p>
          <div className="space-y-2 max-h-48 overflow-auto">
            {conflictMatches.map(c => (
              <div key={c.id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.projectTitle}</div>
                  <div className="text-xs text-slate-500">Started {new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <button className="px-3 py-1 rounded border" onClick={()=>doAppendToExisting(c.id)}>Continue</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="px-3 py-1 rounded border" onClick={()=>setShowConflictModal(false)}>Cancel</button>
            <button className="px-3 py-1 rounded bg-slate-900 text-white" onClick={doCreate}>Start New</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function NewConversationForm({ clientName, setClientName, projectTitle, setProjectTitle, instruction, setInstruction, selectedTemplateId, setSelectedTemplateId, templates, brief, setBrief, myDraft, setMyDraft, clientDraft, setClientDraft, onStart, error }){
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">Start a conversation</h2>
      <p className="text-sm text-slate-600">Provide the project requirement first, then a unique client name. Optionally add your opening message and/or their reply.</p>

      <div>
        <label className="text-xs font-medium text-slate-600">Project requirement / title</label>
        <input className="w-full border rounded-lg p-2 text-sm" placeholder="e.g., Next.js SaaS dashboard with Stripe" value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Client name (unique)</label>
        <input className="w-full border rounded-lg p-2 text-sm" placeholder="e.g., AcmeCo | Sarah" value={clientName} onChange={e=>setClientName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Instruction template</label>
          <select className="w-full border rounded-lg p-2 text-sm" value={selectedTemplateId} onChange={e=>setSelectedTemplateId(e.target.value)}>
            <option value="">— None —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600">Instruction (how AI should think about the client)</label>
          <textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={instruction} onChange={e=>setInstruction(e.target.value)} />
          <p className="text-[11px] text-slate-500 mt-1">Tip: mention tone, constraints, and what to upsell or avoid.</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Brief (project requirement details)</label>
        <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Paste the client brief here. If left empty, you can add it later or as messages." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">My message (optional)</label>
          <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} value={myDraft} onChange={e=>setMyDraft(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Client reply (optional)</label>
          <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} value={clientDraft} onChange={e=>setClientDraft(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-4 py-2 rounded-xl bg-slate-900 text-white" onClick={onStart}>Create / Continue</button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </div>
  )
}

function Composer({ label, value, onChange, onAdd }){
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} value={value} onChange={e=>onChange(e.target.value)} />
      <div className="mt-1 flex justify-between">
        <button className="px-3 py-1 rounded bg-slate-900 text-white text-sm" onClick={onAdd}>Add</button>
        <span className="text-xs text-slate-400 self-center">Saved locally</span>
      </div>
    </div>
  )
}

function Bubble({ role, content, ts, onCopy, onEdit, onRegenerate }){
  const isMe = role==='me'
  const isClient = role==='client'
  const isAI = !isMe && !isClient
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [showRegen, setShowRegen] = useState(false)
  const [regenHint, setRegenHint] = useState('')
  return (
    <div className={`flex ${isMe? 'justify-end':'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm border ${isMe? 'bg-slate-900 text-white': isClient? 'bg-white':'bg-emerald-50 border-emerald-200'}`}>
        <div className="text-[11px] uppercase tracking-wide mb-1 opacity-70">
          {isMe? 'Me': isClient? 'Client':'AI Draft'} · {new Date(ts).toLocaleString()}
        </div>
        {!editing && <div className="whitespace-pre-wrap">{content}</div>}
        {editing && (
          <div className="space-y-2">
            <textarea className="w-full border rounded p-2 text-sm" rows={4} value={draft} onChange={e=>setDraft(e.target.value)} />
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-slate-900 text-white text-xs" onClick={()=>{ onEdit?.(draft); setEditing(false) }}>Save</button>
              <button className="px-2 py-1 rounded border text-xs" onClick={()=>{ setDraft(content); setEditing(false) }}>Cancel</button>
            </div>
          </div>
        )}
        <div className="mt-2 flex gap-3 text-xs opacity-80">
          <button className="underline" onClick={onCopy}>Copy</button>
          {!editing && <button className="underline" onClick={()=>setEditing(true)}>Edit</button>}
          {isAI && <button className="underline" onClick={()=>setShowRegen(v=>!v)}>{showRegen? 'Hide regen':'Regenerate'}</button>}
        </div>
        {isAI && showRegen && (
          <div className="mt-2 space-y-2">
            <input className="w-full border rounded p-2 text-xs" placeholder="Optional guidance for regeneration" value={regenHint} onChange={e=>setRegenHint(e.target.value)} />
            <button className="px-2 py-1 rounded bg-emerald-600 text-white text-xs" onClick={()=>onRegenerate?.(regenHint)}>Regen now</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Modal({ children, onClose }){
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-lg shadow-xl border">
        <div className="flex justify-end"><button className="text-sm" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  )
}

async function callOpenAI({ apiKey, model, temperature, system, user }){
  const body = { model, temperature, messages: [ {role:'system', content: system}, {role:'user', content: user} ] }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if(!res.ok){
    let err = null; try{ err = await res.json() }catch{ err = null }
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if(!text) throw new Error('No content returned by model.')
  return text
}

async function callGemini({ apiKey, model, temperature, system, user }){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
    generationConfig: { temperature }
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if(!res.ok){ let err=null; try{ err=await res.json() }catch{}; throw new Error(err?.error?.message || `Gemini error ${res.status}`) }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('').trim()
  if(!text) throw new Error('No content returned by model.')
  return text
}

async function callClaude({ apiKey, model, temperature, system, user }){
  const url = 'https://api.anthropic.com/v1/messages'
  const body = {
    model,
    max_tokens: 1024,
    temperature,
    system,
    messages: [{ role: 'user', content: user }],
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  if(!res.ok){ let err=null; try{ err=await res.json() }catch{}; throw new Error(err?.error?.message || `Claude error ${res.status}`) }
  const data = await res.json()
  const text = data?.content?.map(p=>p.text).join('').trim()
  if(!text) throw new Error('No content returned by model.')
  return text
}

async function callAI({ provider, apiKeyOpenAI, apiKeyFallback, apiKeyGemini, apiKeyClaude, model, temperature, system, user }){
  if(provider==='openai') return callOpenAI({ apiKey: apiKeyOpenAI || apiKeyFallback, model, temperature, system, user })
  if(provider==='gemini') return callGemini({ apiKey: apiKeyGemini, model, temperature, system, user })
  if(provider==='claude') return callClaude({ apiKey: apiKeyClaude, model, temperature, system, user })
  return callOpenAI({ apiKey: apiKeyOpenAI || apiKeyFallback, model, temperature, system, user })
}


