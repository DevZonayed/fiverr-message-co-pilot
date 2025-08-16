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
    <div className="min-h-screen w-full grid grid-cols-12 bg-gradient-to-br from-white via-emerald-50 to-white text-slate-900">
      <aside className="col-span-3 lg:col-span-2 border-r border-slate-200/60 p-4 flex flex-col gap-4 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-slate-900 bg-clip-text text-transparent">Fiverr AI Chat</h1>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <NavLink to="/" end className={({isActive})=>`px-3 py-2 rounded-lg transition-colors ${isActive? 'bg-emerald-600 text-white shadow-sm':'hover:bg-white/70'}`}>Chat</NavLink>
          <NavLink to="/instructions" className={({isActive})=>`px-3 py-2 rounded-lg transition-colors ${isActive? 'bg-emerald-600 text-white shadow-sm':'hover:bg-white/70'}`}>Instructions</NavLink>
          <NavLink to="/settings" className={({isActive})=>`px-3 py-2 rounded-lg transition-colors ${isActive? 'bg-emerald-600 text-white shadow-sm':'hover:bg-white/70'}`}>Settings</NavLink>
        </nav>
      </aside>

      <main className="col-span-9 lg:col-span-10 p-6">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} />
    </div>
  )
}


