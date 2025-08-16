import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isFileSystemAPISupported, pickDirectory, writeAllConversations } from '../lib/fs.js'

const LS_KEYS = {
  conversations: 'fiverr_ai_conversations_v1',
  settings: 'fiverr_ai_settings_v1',
  instructions: 'fiverr_ai_instruction_templates_v1',
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const AppContext = createContext(null)

export function AppProvider({ children }){
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [identity, setIdentity] = useState('')
  const [autosaveToFolder, setAutosaveToFolder] = useState(false)
  const dirHandleRef = useRef(null) // not persisted

  const [instructionTemplates, setInstructionTemplates] = useState([
    {
      id: 'default',
      name: 'Default Fiverr Tone',
      content: 'You are my Fiverr co-pilot. Draft concise, friendly, and professional replies. Be proactive, clarify ambiguities with bullet points, and keep a helpful tone.'
    }
  ])

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(LS_KEYS.conversations)
      if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) setConversations(parsed) }
      const sraw = localStorage.getItem(LS_KEYS.settings)
      if(sraw){
        const s = JSON.parse(sraw)||{}
        if(s.model) setModel(s.model)
        if(typeof s.temperature==='number') setTemperature(s.temperature)
        if(typeof s.identity==='string') setIdentity(s.identity)
        if(typeof s.autosaveToFolder==='boolean') setAutosaveToFolder(s.autosaveToFolder)
      }
      const iraw = localStorage.getItem(LS_KEYS.instructions)
      if(iraw){ const arr = JSON.parse(iraw); if(Array.isArray(arr)) setInstructionTemplates(arr) }
    }catch{}
  },[])

  useEffect(()=>{ try{ localStorage.setItem(LS_KEYS.conversations, JSON.stringify(conversations)) }catch{} },[conversations])
  useEffect(()=>{ try{ localStorage.setItem(LS_KEYS.settings, JSON.stringify({model, temperature, identity, autosaveToFolder})) }catch{} },[model, temperature, identity, autosaveToFolder])
  useEffect(()=>{ try{ localStorage.setItem(LS_KEYS.instructions, JSON.stringify(instructionTemplates)) }catch{} },[instructionTemplates])

  // Optional autosave to folder via File System Access API
  useEffect(()=>{
    (async ()=>{
      if(!autosaveToFolder) return
      if(!dirHandleRef.current) return
      try{ await writeAllConversations(dirHandleRef.current, conversations) }catch{}
    })()
  },[conversations, autosaveToFolder])

  const selected = useMemo(()=>conversations.find(c=>c.id===selectedId)||null, [conversations, selectedId])

  const addMessage = (convId, role, content) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: [...c.messages, { id: uid(), role, content: content.trim(), ts: Date.now() }]
    } : c))
  }

  const createConversation = ({ clientName, projectTitle, instruction, myDraft, clientDraft }) => {
    const conv = { id: uid(), clientName: clientName.trim(), projectTitle: projectTitle.trim(), createdAt: Date.now(), instruction: instruction.trim(), messages: [], brief: '' }
    setConversations(prev => [conv, ...prev])
    setSelectedId(conv.id)
    if(myDraft?.trim()) addMessage(conv.id, 'me', myDraft)
    if(clientDraft?.trim()) addMessage(conv.id, 'client', clientDraft)
    return conv
  }

  const deleteConversation = (id) => {
    const next = conversations.filter(c=>c.id!==id)
    setConversations(next)
    if(selectedId===id) setSelectedId(next[0]?.id||null)
  }

  const setConversationBrief = (id, brief) => {
    setConversations(prev => prev.map(c => c.id===id ? { ...c, brief } : c))
  }

  const updateMessage = (convId, messageId, updater) => {
    setConversations(prev => prev.map(c => c.id===convId ? {
      ...c,
      messages: c.messages.map(m => m.id===messageId ? { ...m, ...updater(m) } : m)
    } : c))
  }

  const connectFolder = async () => {
    if(!isFileSystemAPISupported()) throw new Error('This browser does not support pick a folder.')
    const handle = await pickDirectory()
    dirHandleRef.current = handle
    return handle
  }

  const value = {
    // state
    conversations, setConversations,
    selectedId, setSelectedId,
    selected,
    apiKey, setApiKey,
    model, setModel,
    temperature, setTemperature,
    identity, setIdentity,
    instructionTemplates, setInstructionTemplates,
    autosaveToFolder, setAutosaveToFolder,
    // fs handle kept in memory
    dirHandleRef,
    connectFolder,
    // helpers
    addMessage, createConversation, deleteConversation, setConversationBrief, updateMessage,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if(!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}


