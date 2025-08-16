import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function CommandPalette({ open, onClose }){
  const { conversations, setSelectedId } = useApp()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(()=>{ if(open){ setQuery(''); setTimeout(()=>inputRef.current?.focus(), 0) } },[open])

  const results = useMemo(()=>{
    const q = query.trim().toLowerCase()
    if(!q) return conversations.slice(0, 20)
    return conversations.filter(c =>
      c.clientName.toLowerCase().includes(q) ||
      c.projectTitle.toLowerCase().includes(q) ||
      (c.brief||'').toLowerCase().includes(q)
    ).slice(0, 30)
  },[query, conversations])

  const handleSelect = (id) => {
    setSelectedId(id)
    navigate('/')
    onClose()
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-black/60 via-black/40 to-black/60 flex items-start justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-2xl border border-white/60" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b">
          <input ref={inputRef} className="w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by client or brief…" value={query} onChange={e=>setQuery(e.target.value)} />
          <div className="text-[11px] text-slate-500 mt-1">Press Ctrl/⌘ + Space to toggle</div>
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {results.map(c => (
            <div key={c.id} className="p-4 cursor-pointer hover:bg-emerald-50/60 transition-colors" onClick={()=>handleSelect(c.id)}>
              <div className="font-medium">{c.clientName}</div>
              <div className="text-xs text-slate-600 line-clamp-1">{c.projectTitle}</div>
              {c.brief && <div className="text-xs text-slate-500 line-clamp-1 mt-1">Brief: {c.brief}</div>}
            </div>
          ))}
          {results.length===0 && <div className="p-4 text-sm text-slate-500">No matches</div>}
        </div>
      </div>
    </div>
  )
}


