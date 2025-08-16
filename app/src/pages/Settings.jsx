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
  } = useApp()
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div>
        <label className="text-xs font-medium text-slate-600">OpenAI API Key</label>
        <input type="password" className="w-full border rounded p-2" placeholder="sk-... (stored only in memory)" value={apiKey} onChange={e=>setApiKey(e.target.value)} />
        <p className="text-[11px] text-slate-500 mt-1">For production, proxy requests via your backend. Do not expose keys in client code.</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Model</label>
        <input className="w-full border rounded p-2" value={model} onChange={e=>setModel(e.target.value)} />
        <p className="text-[11px] text-slate-500 mt-1">Use a low-cost model (e.g., gpt-4o-mini). If a GPT‑5 mini model is available in your account, paste its exact id here.</p>
      </div>
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


