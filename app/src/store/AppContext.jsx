import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isFileSystemAPISupported, pickDirectory, writeAllConversations } from '../lib/fs.js'
import { bulkPut, getAll, getSettings, saveSettings, stores } from '../lib/db.js'

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
  // Provider and API keys
  const [provider, setProvider] = useState('openai')
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState('')
  const [apiKeyGemini, setApiKeyGemini] = useState('')
  const [apiKeyClaude, setApiKeyClaude] = useState('')

  useEffect(()=>{
    (async ()=>{
      try{
        const [dbConvs, dbSettings, dbTemplates] = await Promise.all([
          getAll(stores.conversations),
          getSettings(),
          getAll(stores.templates),
        ])
        if(Array.isArray(dbConvs) && dbConvs.length){ setConversations(dbConvs.sort((a,b)=>b.createdAt-a.createdAt)) }
        if(dbSettings){
          if(dbSettings.model) setModel(dbSettings.model)
          if(typeof dbSettings.temperature==='number') setTemperature(dbSettings.temperature)
          if(typeof dbSettings.identity==='string') setIdentity(dbSettings.identity)
          if(typeof dbSettings.autosaveToFolder==='boolean') setAutosaveToFolder(dbSettings.autosaveToFolder)
          if(typeof dbSettings.provider==='string') setProvider(dbSettings.provider)
          if(typeof dbSettings.apiKeyOpenAI==='string') setApiKeyOpenAI(dbSettings.apiKeyOpenAI)
          if(typeof dbSettings.apiKeyGemini==='string') setApiKeyGemini(dbSettings.apiKeyGemini)
          if(typeof dbSettings.apiKeyClaude==='string') setApiKeyClaude(dbSettings.apiKeyClaude)
        }
        if(Array.isArray(dbTemplates) && dbTemplates.length){ setInstructionTemplates(dbTemplates) }

        // Fallback migration from localStorage if DB is empty
        if((!dbConvs || dbConvs.length===0)){
          const raw = localStorage.getItem(LS_KEYS.conversations)
          if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) setConversations(parsed) }
        }
        if(!dbSettings){
          const sraw = localStorage.getItem(LS_KEYS.settings)
          if(sraw){
            const s = JSON.parse(sraw)||{}
            if(s.model) setModel(s.model)
            if(typeof s.temperature==='number') setTemperature(s.temperature)
            if(typeof s.identity==='string') setIdentity(s.identity)
            if(typeof s.autosaveToFolder==='boolean') setAutosaveToFolder(s.autosaveToFolder)
          }
        }
        if((!dbTemplates || dbTemplates.length===0)){
          const iraw = localStorage.getItem(LS_KEYS.instructions)
          if(iraw){ const arr = JSON.parse(iraw); if(Array.isArray(arr)) setInstructionTemplates(arr) }
        }
      }catch{}
    })()
  },[])

  useEffect(()=>{ (async ()=>{ try{ await bulkPut(stores.conversations, conversations) }catch{} })() },[conversations])
  useEffect(()=>{ (async ()=>{ try{ await saveSettings({ model, temperature, identity, autosaveToFolder, provider, apiKeyOpenAI, apiKeyGemini, apiKeyClaude }) }catch{} })() },[model, temperature, identity, autosaveToFolder, provider, apiKeyOpenAI, apiKeyGemini, apiKeyClaude])
  useEffect(()=>{ (async ()=>{ try{ await bulkPut(stores.templates, instructionTemplates) }catch{} })() },[instructionTemplates])

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
    provider, setProvider,
    apiKeyOpenAI, setApiKeyOpenAI,
    apiKeyGemini, setApiKeyGemini,
    apiKeyClaude, setApiKeyClaude,
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


