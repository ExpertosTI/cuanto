import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { useStore } from '../store'
import {
  CUANTO_AGENT_NAME,
  agentContextPayload,
  localAgentReply,
} from '../lib/agentKnowledge'

type Msg = { role: 'user' | 'assistant'; content: string; ai?: boolean }

const QUICK = [
  '¿Cómo pongo una meta?',
  '¿Qué incluye Pro?',
  '¿Cómo invito al equipo?',
  '¿Cuál es mi balance?',
]

function renderText(content: string) {
  return content.split('\n').map((line, j, arr) => (
    <span key={j}>
      {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
        part.startsWith('**') ? <strong key={k}>{part.slice(2, -2)}</strong> : part,
      )}
      {j < arr.length - 1 ? <br /> : null}
    </span>
  ))
}

function agentEndpoint() {
  const configured = (import.meta.env.VITE_AGENT_URL || '').trim()
  if (configured) return configured.replace(/\/$/, '')
  // Same-origin API on VPS
  return '/api/agent'
}

export function CuantoAgent() {
  const { balance, settings, goals, transactions, isPro } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAi, setLastAi] = useState<boolean | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const remote = agentEndpoint()

  function resetWelcome() {
    setMessages([
      {
        role: 'assistant',
        content:
          `¡Hola! Soy **${CUANTO_AGENT_NAME}**.\n\nTe ayudo con metas, gastos, Pro y Equipo. Escribí o usá un acceso rápido.`,
      },
    ])
    setLastAi(null)
  }

  useEffect(() => {
    if (open && messages.length === 0) resetWelcome()
  }, [open, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const history = [...messages, { role: 'user' as const, content: msg }]
    setMessages(history)
    setLoading(true)

    const ctx = agentContextPayload({
      balance,
      currency: settings.currency,
      goals,
      transactions,
      orgName: settings.orgName,
      isPro,
    })

    try {
      if (remote) {
        const res = await fetch(remote, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            history: history.map((m) => ({ role: m.role, content: m.content })),
            context: ctx,
          }),
        })
        if (!res.ok) throw new Error(`agent_${res.status}`)
        const data = (await res.json()) as { reply?: string; ai?: boolean }
        const reply = data.reply?.trim() || localAgentReply(msg, ctx)
        setLastAi(Boolean(data.ai))
        setMessages((m) => [...m, { role: 'assistant', content: reply, ai: Boolean(data.ai) }])
      } else {
        const reply = localAgentReply(msg, ctx)
        setLastAi(false)
        setMessages((m) => [...m, { role: 'assistant', content: reply, ai: false }])
      }
    } catch {
      const reply = localAgentReply(msg, ctx)
      setLastAi(false)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `${reply}\n\n_(Sin conexión al agente en la nube; respondí en modo local.)_`,
          ai: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="agent-fab"
          onClick={() => setOpen(true)}
          aria-label={`Abrir ${CUANTO_AGENT_NAME}`}
        >
          <Sparkles size={20} />
          <span>Guía</span>
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            className="agent-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            role="dialog"
            aria-label={CUANTO_AGENT_NAME}
          >
            <header className="agent-head">
              <div className="agent-head-title">
                <span className="agent-avatar">
                  <Bot size={18} />
                </span>
                <div>
                  <strong>{CUANTO_AGENT_NAME}</strong>
                  <span className="muted small">
                    {lastAi === true
                      ? 'IA en vivo'
                      : remote
                        ? 'Nube + local'
                        : 'Modo local'}
                  </span>
                </div>
              </div>
              <div className="agent-head-actions">
                <button type="button" className="icon-ghost" aria-label="Reiniciar" onClick={resetWelcome}>
                  <RotateCcw size={16} />
                </button>
                <button type="button" className="icon-ghost" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="agent-messages">
              {messages.map((m, i) => (
                <div key={i} className={`agent-bubble ${m.role}`}>
                  {renderText(m.content)}
                </div>
              ))}
              {loading ? <div className="agent-typing">…</div> : null}
              <div ref={bottomRef} />
            </div>

            <div className="agent-quick">
              {QUICK.map((q) => (
                <button key={q} type="button" disabled={loading} onClick={() => void send(q)}>
                  {q}
                </button>
              ))}
            </div>

            <form
              className="agent-input"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntame…"
                disabled={loading}
              />
              <button type="submit" className="btn-primary" disabled={loading || !input.trim()} aria-label="Enviar">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
