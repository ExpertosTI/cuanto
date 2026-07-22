import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'

interface QrScannerProps {
  onResult: (text: string) => void
  onClose: () => void
}

export function QrScanner({ onResult, onClose }: QrScannerProps) {
  const regionId = useId().replace(/:/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (!active) return
          active = false
          onResult(decoded)
          void scanner.stop().catch(() => undefined)
        },
        () => undefined,
      )
      .catch(() => {
        setError('No pudimos abrir la cámara. Revisa los permisos del navegador.')
      })

    return () => {
      active = false
      void scanner.stop().catch(() => undefined)
      scannerRef.current = null
    }
  }, [onResult, regionId])

  return (
    <div className="scanner-overlay">
      <div className="scanner-sheet">
        <div className="scanner-head">
          <div>
            <p className="eyebrow dark">Escanear QR</p>
            <h2>Apunta al código</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div id={regionId} className="scanner-view" />
        {error ? (
          <p className="empty-hint">{error}</p>
        ) : (
          <p className="scanner-hint">
            <Camera size={16} /> Cámara trasera recomendada
          </p>
        )}
      </div>
    </div>
  )
}
