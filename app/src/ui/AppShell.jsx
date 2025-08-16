import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette.jsx'

export default function AppShell(){
  const [paletteOpen, setPaletteOpen] = useState(false)
  useEffect(()=>{
    const onKey = (e) => {
      if((e.ctrlKey || e.metaKey) && e.code === 'Space'){
        e.preventDefault()
        setPaletteOpen(prev=>!prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  },[])
  return (
    <div className="min-h-screen w-full grid grid-cols-12 bg-slate-50 text-slate-900">
      <aside className="col-span-3 lg:col-span-2 border-r border-slate-200 p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Fiverr AI Chat</h1>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <NavLink to="/" end className={({isActive})=>`px-3 py-2 rounded ${isActive? 'bg-slate-900 text-white':'hover:bg-white'}`}>Chat</NavLink>
          <NavLink to="/instructions" className={({isActive})=>`px-3 py-2 rounded ${isActive? 'bg-slate-900 text-white':'hover:bg-white'}`}>Instructions</NavLink>
          <NavLink to="/settings" className={({isActive})=>`px-3 py-2 rounded ${isActive? 'bg-slate-900 text-white':'hover:bg-white'}`}>Settings</NavLink>
        </nav>
      </aside>

      <main className="col-span-9 lg:col-span-10 p-4">
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} />
    </div>
  )
}


