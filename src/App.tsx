import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { LayoutDashboard, List, PlusCircle, Tags } from 'lucide-react'
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
  const { settings, cloudConnected } = useStore()
  const [tab, setTab] = useState<Tab>('resumen')
  const [returnTab, setReturnTab] = useState<Tab>('resumen')
  const [addType, setAddType] = useState<'expense' | 'income'>('expense')

  if (!settings.onboardingDone) {
    return <Onboarding />
  }

  const hideNav = tab === 'categorias' || tab === 'equipo'
  const showCloudWarn = isInsForgeConfigured && cloudConnected === false

  function openAdd(type: 'expense' | 'income' = 'expense') {
    setAddType(type)
    setTab('agregar')
  }

  return (
    <div className="app-shell">
      {showCloudWarn ? (
        <div className="mode-banner" title="InsForge no respondió; usando almacenamiento local">
          Sin conexión a la nube · datos locales
        </div>
      ) : null}

      <main className="app-main">
        <AnimatePresence mode="wait">
          {tab === 'resumen' && <Resumen key="resumen" onAdd={openAdd} />}
          {tab === 'movimientos' && <Movimientos key="movimientos" />}
          {tab === 'agregar' && (
            <Agregar
              key={`agregar-${addType}`}
              initialType={addType}
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
              onOpenEquipo={() => setTab('equipo')}
            />
          )}
          {tab === 'equipo' && <Equipo key="equipo" onBack={() => setTab('categorias')} />}
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
            onClick={() => openAdd('expense')}
          >
            <PlusCircle size={22} />
            <span>Agregar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReturnTab('resumen')
              setTab('categorias')
            }}
          >
            <Tags size={22} />
            <span>Categorías</span>
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
