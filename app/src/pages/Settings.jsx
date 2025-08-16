import { useApp } from '../store/AppContext.jsx'
import { isFileSystemAPISupported, writeAllConversations } from '../lib/fs.js'

export default function Settings(){
  const {
    apiKey, setApiKey,
    model, setModel,
    temperature, setTemperature,
    identity, setIdentity,
    autosaveToFolder, setAutosaveToFolder,
    connectFolder, dirHandleRef,
    conversations,
    provider, setProvider,
    apiKeyOpenAI, setApiKeyOpenAI,
    apiKeyGemini, setApiKeyGemini,
    apiKeyClaude, setApiKeyClaude,
  } = useApp()
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Provider</label>
          <select className="w-full border rounded p-2" value={provider} onChange={e=>setProvider(e.target.value)}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">Choose your AI provider.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Model</label>
          <select className="w-full border rounded p-2" value={model} onChange={e=>setModel(e.target.value)}>
            {provider==='openai' && (
              <>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="o4-mini">o4-mini</option>
              </>
            )}
            {provider==='gemini' && (
              <>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </>
            )}
            {provider==='claude' && (
              <>
                <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                <option value="claude-3-sonnet-20240229">claude-3-sonnet-20240229</option>
                <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
              </>
            )}
            <option value={model}>Custom: {model}</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">Pick a preset or type your own model id.</p>
          <input className="mt-1 w-full border rounded p-2 text-sm" value={model} onChange={e=>setModel(e.target.value)} placeholder="Custom model id" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">OpenAI API Key</label>
          <input type="password" className="w-full border rounded p-2" placeholder="sk-..." value={apiKeyOpenAI} onChange={e=>setApiKeyOpenAI(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Gemini API Key</label>
          <input type="password" className="w-full border rounded p-2" placeholder="AI..." value={apiKeyGemini} onChange={e=>setApiKeyGemini(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Claude API Key</label>
          <input type="password" className="w-full border rounded p-2" placeholder="sk-ant-..." value={apiKeyClaude} onChange={e=>setApiKeyClaude(e.target.value)} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Keys are stored in IndexedDB locally. For production, proxy via your backend.</p>
      <div>
        <label className="text-xs font-medium text-slate-600">Temperature: {temperature}</label>
        <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value))} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">My identity for system prompt</label>
        <textarea className="w-full border rounded p-2 text-sm" rows={3} placeholder="Who am I, what I offer, tone preferences..." value={identity} onChange={e=>setIdentity(e.target.value)} />
      </div>
      <div className="border rounded p-3">
        <div className="font-medium mb-2">File storage (optional)</div>
        {!isFileSystemAPISupported() && <div className="text-sm text-slate-600">Your browser does not support the File System Access API. Use export/import instead.</div>}
        {isFileSystemAPISupported() && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input id="autosave" type="checkbox" checked={autosaveToFolder} onChange={e=>setAutosaveToFolder(e.target.checked)} />
              <label htmlFor="autosave" className="text-sm">Autosave conversations to connected folder</label>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-slate-900 text-white text-sm" onClick={async ()=>{ try{ await connectFolder() }catch(err){ alert(err.message) } }}>Connect folder</button>
              <button className="px-3 py-1 rounded border text-sm" onClick={async ()=>{ try{ await writeAllConversations(dirHandleRef.current, conversations); alert('Saved.') }catch(err){ alert(err.message) } }} disabled={!dirHandleRef.current}>Save all now</button>
            </div>
            {dirHandleRef.current ? <div className="text-xs text-emerald-700">Folder connected</div> : <div className="text-xs text-slate-600">No folder connected</div>}
          </div>
        )}
      </div>
    </div>
  )
}


