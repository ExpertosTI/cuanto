import type { MoneyGoals, Transaction } from '../types'

export const CUANTO_AGENT_NAME = 'Cuanto Guide'

export const CUANTO_KNOWLEDGE = `
Eres Cuanto Guide, el asistente oficial de Cuanto (Renace Tech).
Ayudás a controlar ingresos, gastos, metas y ahorro en República Dominicana y LATAM.
Español claro y cercano. Máximo 3 párrafos cortos. No inventés saldos ni montos: usá el contexto que te pasan.

## Qué hace la app
- Resumen: balance, ingresos/gastos del período, metas y gráfico por categoría
- Lista: movimientos por período; Pro exporta CSV
- Agregar: registrar ingreso o gasto con categoría
- Metas: ingresos del mes, tope diario, tope mensual, plan de ahorro
- Equipo: invitaciones WhatsApp/QR (QR admin es Pro)
- Pro ($1.99 USD/mes): exportar, QR admin, respaldo priorizado — pago por WhatsApp + código

## Cómo orientar
1. Si no hay movimientos: sugerí agregar el primer gasto o ingreso
2. Si preguntan por metas: guiá a Metas y explicar topes día/mes
3. Si preguntan por Pro: explicar beneficios y WhatsApp
4. Si preguntan por nube: InsForge Renace; si falla, datos locales siguen
5. Nunca pedís tarjetas ni claves bancarias
`.trim()

const FAQ: { keys: string[]; reply: string }[] = [
  {
    keys: ['hola', 'buenas', 'ayuda', 'help'],
    reply:
      '¡Hola! Soy **Cuanto Guide**. Puedo ayudarte con ingresos, gastos, metas, ahorro, Equipo y Pro.\n\nProbá: “¿Cómo pongo una meta?” o “¿Qué incluye Pro?”',
  },
  {
    keys: ['meta', 'metas', 'ahorro', 'tope'],
    reply:
      'En **Metas** definís:\n- Meta de ingresos del mes\n- Tope de gastos del día y del mes\n- Plan de ahorro (nombre + meta + aportes)\n\nEn Resumen ves las barras de progreso.',
  },
  {
    keys: ['pro', 'premium', 'export', 'csv', '1.99', 'pagar'],
    reply:
      '**Cuanto Pro** ($1.99 USD/mes) incluye exportar CSV, QR admin y respaldo priorizado.\n\nPagás por WhatsApp y activás con el código que te enviamos. Entrá desde Más → Cuanto Pro.',
  },
  {
    keys: ['equipo', 'invitar', 'whatsapp', 'qr'],
    reply:
      'En **Más → Equipo** creás QR/cliente y compartís por WhatsApp.\n\nEl **QR admin** requiere Pro. Los miembros muestran su código para check-in.',
  },
  {
    keys: ['gasto', 'ingreso', 'agregar', 'registrar'],
    reply:
      'Tocá **Agregar** (o los chips de Ingresos/Gastos en Resumen). Elegí tipo, categoría, monto y fecha.\n\nTodo queda en Lista filtrado por día/semana/mes.',
  },
  {
    keys: ['nube', 'sync', 'sincron', 'insforge', 'respaldo'],
    reply:
      'Si InsForge Renace responde, tus datos se sincronizan en la nube. Si ves “Sin conexión a la nube”, seguís trabajando en local sin perder lo del teléfono.',
  },
  {
    keys: ['instalar', 'pwa', 'inicio', 'offline'],
    reply:
      'Cuanto es una PWA: en Android/Chrome podés **Instalar** y usarla como app. El service worker guarda el shell para uso básico sin red.',
  },
  {
    keys: ['tema', 'color', 'oscuro', 'noche', 'apariencia'],
    reply:
      'En **Más** podés cambiar el **tema**: Bosque, Océano, Arena o Noche. Se guarda en este dispositivo.',
  },
]

export function localAgentReply(
  message: string,
  ctx?: { balance?: number; currency?: string; goals?: MoneyGoals; txCount?: number },
): string {
  const q = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const hit = FAQ.find((f) => f.keys.some((k) => q.includes(k)))
  if (hit) return hit.reply

  if (q.includes('balance') || q.includes('saldo') || q.includes('cuanto tengo')) {
    if (typeof ctx?.balance === 'number' && ctx.currency) {
      return `Tu balance actual es **${ctx.balance.toLocaleString('es-DO')} ${ctx.currency}** (${ctx.txCount ?? 0} movimientos).\n\nPara detalle tocá Resumen o Lista.`
    }
    return 'Abrí **Resumen** para ver tu balance e ingresos/gastos del período.'
  }

  return (
    'Puedo ayudarte con metas, gastos, Pro, Equipo o temas.\n\n' +
    'Escribí una pregunta corta, por ejemplo: “¿Cómo exporto?” o “¿Cómo invito al equipo?”'
  )
}

export function agentContextPayload(input: {
  balance: number
  currency: string
  goals: MoneyGoals
  transactions: Transaction[]
  orgName: string
  isPro: boolean
}) {
  return {
    orgName: input.orgName,
    balance: input.balance,
    currency: input.currency,
    isPro: input.isPro,
    txCount: input.transactions.length,
    goals: input.goals,
  }
}
