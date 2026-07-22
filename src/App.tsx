import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  List,
  PlusCircle,
  Tags,
  Users,
} from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { Onboarding } from './screens/Onboarding'
import { Resumen } from './screens/Resumen'
import { Movimientos } from './screens/Movimientos'
import { Agregar } from './screens/Agregar'
import { Categorias } from './screens/Categorias'
import { Equipo } from './screens/Equipo'
import { Unirse } from './screens/Unirse'
import { isInsForgeConfigured } from './lib/insforge'
import './App.css'

type Tab = 'resumen' | 'movimientos' | 'agregar' | 'categorias' | 'equipo'

function AppShell() {
  const { settings } = useStore()
  const [tab, setTab] = useState<Tab>('resumen')
  const [returnTab, setReturnTab] = useState<Tab>('resumen')

  if (!settings.onboardingDone) {
    return <Onboarding />
  }

  const hideNav = tab === 'categorias'

  return (
    <div className="app-shell">
      {!isInsForgeConfigured ? (
        <div className="mode-banner">Modo local · conecta InsForge para SaaS en la nube</div>
      ) : null}

      <main className="app-main">
        <AnimatePresence mode="wait">
          {tab === 'resumen' && <Resumen key="resumen" onAdd={() => setTab('agregar')} />}
          {tab === 'movimientos' && <Movimientos key="movimientos" />}
          {tab === 'agregar' && (
            <Agregar
              key="agregar"
              onDone={() => setTab('movimientos')}
              onManageCategories={() => {
                setReturnTab('agregar')
                setTab('categorias')
              }}
            />
          )}
          {tab === 'categorias' && (
            <Categorias
              key="categorias"
              onBack={() => setTab(returnTab === 'agregar' ? 'agregar' : 'resumen')}
            />
          )}
          {tab === 'equipo' && <Equipo key="equipo" />}
        </AnimatePresence>
      </main>

      {!hideNav ? (
        <nav className="tab-bar" aria-label="Navegación principal">
          <button
            type="button"
            className={tab === 'resumen' ? 'active' : ''}
            onClick={() => setTab('resumen')}
          >
            <LayoutDashboard size={22} />
            <span>Resumen</span>
          </button>
          <button
            type="button"
            className={tab === 'movimientos' ? 'active' : ''}
            onClick={() => setTab('movimientos')}
          >
            <List size={22} />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={tab === 'agregar' ? 'active' : ''}
            onClick={() => setTab('agregar')}
          >
            <PlusCircle size={22} />
            <span>Agregar</span>
          </button>
          <button
            type="button"
            className={tab === 'equipo' ? 'active' : ''}
            onClick={() => setTab('equipo')}
          >
            <Users size={22} />
            <span>Equipo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReturnTab('resumen')
              setTab('categorias')
            }}
          >
            <Tags size={22} />
            <span>Más</span>
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/unirse/:token" element={<Unirse />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </StoreProvider>
  )
}
