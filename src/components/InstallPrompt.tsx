import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

/** Chrome / Edge / Samsung: prompt nativo de instalación PWA */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('cuanto-install-dismissed') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!deferred || dismissed) return null

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem('cuanto-install-dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="install-banner" role="status">
      <div className="install-copy">
        <strong>Instalá Cuanto</strong>
        <span>Abrila como app, sin navegador.</span>
      </div>
      <button type="button" className="btn-secondary install-btn" onClick={install}>
        <Download size={16} />
        Instalar
      </button>
      <button type="button" className="icon-ghost" aria-label="Cerrar" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
