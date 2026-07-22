import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  MessageCircle,
  QrCode,
  ScanLine,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { QrScanner } from '../components/QrScanner'
import { FadeIn, Screen } from '../components/Motion'
import { useStore } from '../store'
import {
  inviteWhatsAppMessage,
  memberQrPayload,
  parseQrPayload,
  whatsappChatUrl,
} from '../lib/whatsapp'

interface EquipoProps {
  onBack?: () => void
  onOpenPro?: () => void
}

export function Equipo({ onBack, onOpenPro }: EquipoProps) {
  const {
    settings,
    invites,
    scans,
    memberCode,
    isAdmin,
    isPro,
    createInvite,
    revokeInvite,
    getInviteUrl,
    logScan,
  } = useStore()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const clientInvite = useMemo(
    () => invites.find((i) => i.kind === 'client_join') ?? null,
    [invites],
  )

  const shownToken = activeInviteToken || clientInvite?.token || ''
  const joinUrl = shownToken ? getInviteUrl(shownToken) : ''
  const memberPayload = memberQrPayload('local', memberCode)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  function ensureClientInvite() {
    if (clientInvite) {
      setActiveInviteToken(clientInvite.token)
      return clientInvite
    }
    const invite = createInvite({
      kind: 'client_join',
      role: 'member',
      label: 'Invitación WhatsApp',
    })
    setActiveInviteToken(invite.token)
    return invite
  }

  function createAdminInvite() {
    if (!isPro) {
      flash('QR admin es Pro')
      onOpenPro?.()
      return
    }
    const invite = createInvite({
      kind: 'admin_join',
      role: 'admin',
      label: 'Invitación admin',
    })
    setActiveInviteToken(invite.token)
    flash('QR de admin listo')
  }

  async function shareInvite() {
    const invite = ensureClientInvite()
    const url = getInviteUrl(invite.token)
    const text = inviteWhatsAppMessage(settings.orgName, url)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Únete a Cuanto', text, url })
        return
      } catch {
        /* fall through */
      }
    }
    const business = import.meta.env.VITE_WHATSAPP_BUSINESS as string | undefined
    if (business) {
      window.open(whatsappChatUrl(business, text), '_blank')
    } else if (settings.phoneWhatsapp) {
      window.open(whatsappChatUrl(settings.phoneWhatsapp, text), '_blank')
    } else {
      await navigator.clipboard.writeText(url)
      flash('Link copiado')
    }
  }

  function handleScan(raw: string) {
    setScannerOpen(false)
    const parsed = parseQrPayload(raw)
    if (parsed.type === 'member') {
      logScan({
        payload: raw,
        source: 'qr',
        label: `Check-in miembro · ${parsed.code}`,
      })
      flash('Miembro escaneado')
      return
    }
    if (parsed.type === 'invite') {
      logScan({
        payload: raw,
        source: 'qr',
        label: `Invite escaneado · ${parsed.token}`,
      })
      flash('Invitación leída')
      return
    }
    logScan({ payload: raw, source: 'qr', label: 'QR desconocido' })
    flash('QR registrado')
  }

  if (!isAdmin) {
    return (
      <Screen>
        <header className="screen-header row">
          {onBack ? (
            <button type="button" className="link-btn" onClick={onBack}>
              ← Volver
            </button>
          ) : null}
          <h1>Tu código</h1>
          <p className="muted">Muéstralo para que un admin te escanee.</p>
        </header>
        <FadeIn className="qr-card">
          <QRCodeSVG value={memberPayload} size={220} level="M" includeMargin />
          <p className="qr-caption">{settings.userName || 'Miembro'}</p>
          <code className="code-pill">{memberCode}</code>
        </FadeIn>
      </Screen>
    )
  }

  return (
    <Screen>
      <header className="screen-header row">
        {onBack ? (
          <button type="button" className="link-btn" onClick={onBack}>
            ← Volver
          </button>
        ) : null}
        <h1>Equipo</h1>
        <p className="muted small">Invita y registra con WhatsApp o QR.</p>
      </header>

      <div className="action-grid">
        <button type="button" className="action-card" onClick={() => { ensureClientInvite(); flash('QR de cliente listo') }}>
          <UserPlus size={22} />
          <span>QR cliente</span>
        </button>
        <button
          type="button"
          className={`action-card ${isPro ? '' : 'locked'}`}
          onClick={createAdminInvite}
        >
          <QrCode size={22} />
          <span>{isPro ? 'QR admin' : 'QR admin · Pro'}</span>
        </button>
        <button type="button" className="action-card" onClick={shareInvite}>
          <MessageCircle size={22} />
          <span>WhatsApp</span>
        </button>
        <button type="button" className="action-card accent" onClick={() => setScannerOpen(true)}>
          <ScanLine size={22} />
          <span>Escanear</span>
        </button>
      </div>

      {joinUrl ? (
        <FadeIn className="qr-card">
          <p className="eyebrow dark">Invitación activa</p>
          <QRCodeSVG value={joinUrl} size={210} level="M" includeMargin />
          <p className="qr-caption">El cliente escanea y se registra</p>
          <button type="button" className="btn-secondary" onClick={shareInvite}>
            <Share2 size={16} />
            Compartir por WhatsApp
          </button>
          <code className="code-pill wrap">{joinUrl}</code>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.08} className="qr-card compact">
        <p className="eyebrow dark">Tu código de admin</p>
        <QRCodeSVG value={memberPayload} size={140} level="M" includeMargin />
        <p className="qr-caption">Para que otros admins te verifiquen</p>
      </FadeIn>

      <section className="cat-list">
        <h2 className="section-title">Invitaciones</h2>
        {invites.length === 0 ? (
          <p className="empty-hint">Crea un QR para empezar a registrar clientes.</p>
        ) : (
          invites.map((inv) => (
            <div key={inv.id} className="cat-list-row">
              <span className="cat-badge" style={{ background: inv.role === 'admin' ? '#8B5CF6' : '#1B7A55' }}>
                <QrCode size={16} color="#fff" />
              </span>
              <div className="tx-info">
                <p className="tx-name">{inv.label}</p>
                <p className="tx-note">
                  {inv.role} · {inv.useCount}/{inv.maxUses} usos
                </p>
              </div>
              <button type="button" className="link-btn" onClick={() => setActiveInviteToken(inv.token)}>
                Ver
              </button>
              <button type="button" className="icon-btn danger" onClick={() => revokeInvite(inv.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </section>

      <section className="cat-list">
        <h2 className="section-title">Escaneos recientes</h2>
        {scans.length === 0 ? (
          <p className="empty-hint">Aún no hay escaneos.</p>
        ) : (
          scans.slice(0, 8).map((s) => (
            <div key={s.id} className="cat-list-row">
              <span className="cat-badge" style={{ background: '#0EA5E9' }}>
                <ScanLine size={16} color="#fff" />
              </span>
              <div className="tx-info">
                <p className="tx-name">{s.label}</p>
                <p className="tx-note">{new Date(s.createdAt).toLocaleString('es-DO')}</p>
              </div>
            </div>
          ))
        )}
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
      {scannerOpen ? <QrScanner onResult={handleScan} onClose={() => setScannerOpen(false)} /> : null}
    </Screen>
  )
}
