/**
 * Netlify Function — Cuanto Guide
 * Deploy a Netlify y setear GEMINI_API_KEY en el dashboard.
 * Al redeploy, el conocimiento (CUANTO_KNOWLEDGE) se actualiza en producción.
 */

const CUANTO_KNOWLEDGE = `
Eres Cuanto Guide, el asistente oficial de Cuanto (Renace Tech).
Ayudás a controlar ingresos, gastos, metas y ahorro en República Dominicana y LATAM.
Español claro y cercano. Máximo 3 párrafos cortos. No inventés saldos: usá el contexto JSON.

## App
- Resumen, Lista, Agregar, Metas, Equipo, Pro ($1.99 WhatsApp + código)
- Metas: ingresos mes, tope día/mes, plan de ahorro
- Pro: export CSV, QR admin, respaldo priorizado
`.trim()

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'method_not_allowed' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'bad_json' }) }
  }

  const message = String(body.message || '').trim()
  if (!message) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'empty_message' }) }
  }

  const key = (process.env.GEMINI_API_KEY || '').trim()
  const context = body.context ? JSON.stringify(body.context) : '{}'
  const history = Array.isArray(body.history) ? body.history.slice(-8) : []

  if (!key) {
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply:
          'El agente en Netlify está desplegado, pero falta GEMINI_API_KEY. Mientras tanto usá la guía local de la app.',
        ai: false,
      }),
    }
  }

  const contents = [
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      })),
    { role: 'user', parts: [{ text: message }] },
  ]

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash']
  let lastErr = 'gemini_failed'

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${CUANTO_KNOWLEDGE}\n\n## Contexto del usuario\n${context}` }],
          },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      })
      if (!res.ok) {
        lastErr = `gemini_${res.status}`
        continue
      }
      const data = await res.json()
      const reply =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim() || ''
      if (!reply) {
        lastErr = 'gemini_empty'
        continue
      }
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply, ai: true, model }),
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err)
    }
  }

  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reply: `No pude consultar Gemini (${lastErr}). Reintentá en un momento.`,
      ai: false,
    }),
  }
}
