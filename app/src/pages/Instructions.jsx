import { useState } from 'react'
import { useApp } from '../store/AppContext.jsx'

export default function Instructions(){
  const { instructionTemplates, setInstructionTemplates, conversations, setConversations, selectedId } = useApp()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const addTemplate = () => {
    if(!name.trim() || !content.trim()) return
    const id = Math.random().toString(36).slice(2)
    setInstructionTemplates(prev=>[...prev, { id, name: name.trim(), content: content.trim() }])
    setName('')
    setContent('')
  }

  const applyToConversation = (tpl) => {
    if(!selectedId) return
    setConversations(prev=>prev.map(c=>c.id===selectedId?{...c, instruction: tpl.content}:c))
  }

  const removeTemplate = (id) => {
    setInstructionTemplates(prev=>prev.filter(t=>t.id!==id))
  }

  const exportTemplates = () => {
    const blob = new Blob([JSON.stringify(instructionTemplates, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `instruction_templates_${new Date().toISOString()}.json`
    a.click()
  }

  const importTemplates = async (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    try{
      const text = await file.text()
      const arr = JSON.parse(text)
      if(Array.isArray(arr)) setInstructionTemplates(arr)
      else alert('Invalid templates file')
    }catch(err){ alert('Failed to import: '+err.message) }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 space-y-4">
        <h2 className="text-2xl font-semibold">Instruction Templates</h2>
        <div className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Template name</label>
              <input className="w-full border rounded p-2 text-sm" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Friendly upsell" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Content</label>
              <textarea className="w-full border rounded p-2 text-sm" rows={4} value={content} onChange={e=>setContent(e.target.value)} placeholder="How AI should think about the client..." />
            </div>
          </div>
          <div className="mt-3"><button className="px-3 py-1 rounded bg-slate-900 text-white text-sm" onClick={addTemplate}>Add template</button></div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded border text-sm" onClick={exportTemplates}>Export templates</button>
          <label className="px-3 py-1 rounded border text-sm cursor-pointer">
            Import templates
            <input type="file" accept="application/json" className="hidden" onChange={importTemplates} />
          </label>
        </div>
        <p className="text-sm text-slate-600">Tip: You can apply a template to the currently selected conversation from the list on the right.</p>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="bg-white rounded-xl border divide-y">
          {instructionTemplates.map(tpl => (
            <div key={tpl.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{tpl.name}</div>
                <div className="flex gap-2">
                  <button className="text-xs underline" onClick={()=>applyToConversation(tpl)}>Apply to current</button>
                  {tpl.id!=='default' && <button className="text-xs text-rose-600 underline" onClick={()=>removeTemplate(tpl.id)}>Delete</button>}
                </div>
              </div>
              <div className="text-sm text-slate-700">
                <div className="text-slate-600 line-clamp-2 whitespace-pre-wrap">{tpl.content}</div>
                <details className="mt-1">
                  <summary className="text-xs underline cursor-pointer select-none">Show full</summary>
                  <div className="mt-1 whitespace-pre-wrap">{tpl.content}</div>
                </details>
              </div>
            </div>
          ))}
          {instructionTemplates.length===0 && <div className="p-3 text-sm text-slate-500">No templates yet.</div>}
        </div>
      </div>
    </div>
  )
}


