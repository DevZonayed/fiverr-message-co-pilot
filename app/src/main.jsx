import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Chat from './pages/Chat.jsx'
import Settings from './pages/Settings.jsx'
import Instructions from './pages/Instructions.jsx'
import AppShell from './ui/AppShell.jsx'
import { AppProvider } from './store/AppContext.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Chat /> },
      { path: 'settings', element: <Settings /> },
      { path: 'instructions', element: <Instructions /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)
