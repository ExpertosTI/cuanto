import { Link } from 'react-router-dom'
import { Screen } from '../components/Motion'

export function Privacidad() {
  return (
    <Screen className="legal-screen">
      <header className="screen-header row">
        <Link to="/" className="link-btn">
          ← Volver
        </Link>
        <h1>Privacidad</h1>
        <p className="muted small">Última actualización: 22 jul 2026</p>
      </header>

      <article className="legal-body">
        <p>
          Cuanto (operado por Renace Tech) respeta tu privacidad. Esta política explica qué datos
          se usan y para qué.
        </p>

        <h2>1. Datos que manejamos</h2>
        <ul>
          <li>Nombre, espacio, moneda y teléfono que ingresás en la app.</li>
          <li>Categorías, movimientos, metas y aportes de ahorro que registrás.</li>
          <li>Códigos de invitación y eventos de escaneo QR si usás Equipo.</li>
        </ul>

        <h2>2. Dónde se guardan</h2>
        <ul>
          <li>
            Por defecto en este dispositivo (almacenamiento local del navegador).
          </li>
          <li>
            Si la nube está disponible, se sincronizan en InsForge (infraestructura Renace) para
            respaldo y uso en varios equipos.
          </li>
        </ul>

        <h2>3. Para qué se usan</h2>
        <p>
          Solo para operar la app: mostrar balances, metas, invitaciones y soporte de Cuanto Pro.
          No vendemos tus datos.
        </p>

        <h2>4. Cámara</h2>
        <p>
          La cámara se usa únicamente cuando activás el escáner QR. No se graba ni se sube video.
        </p>

        <h2>5. Pagos Pro</h2>
        <p>
          El pago por WhatsApp se coordina fuera de la app. Conservamos el estado Pro en tu
          dispositivo (y en la nube si aplica) para activar funciones.
        </p>

        <h2>6. Tus derechos</h2>
        <p>
          Podés borrar datos locales limpiando el almacenamiento del sitio. Para eliminar datos en
          nube o consultas, escribinos por WhatsApp al soporte de Cuanto.
        </p>

        <h2>7. Contacto</h2>
        <p>
          Renace Tech ·{' '}
          <a href="https://cuanto.renace.tech" rel="noreferrer">
            cuanto.renace.tech
          </a>
        </p>
      </article>
    </Screen>
  )
}

export function Terminos() {
  return (
    <Screen className="legal-screen">
      <header className="screen-header row">
        <Link to="/" className="link-btn">
          ← Volver
        </Link>
        <h1>Términos</h1>
        <p className="muted small">Última actualización: 22 jul 2026</p>
      </header>

      <article className="legal-body">
        <p>
          Al usar Cuanto aceptás estos términos. La app es una herramienta de registro financiero
          personal u organizacional; no es asesoría bancaria ni contable.
        </p>

        <h2>1. Uso permitido</h2>
        <p>
          Podés usar Cuanto para registrar ingresos, gastos, metas y coordinar un equipo pequeño.
          No está permitido abusar de invitaciones, ingeniería inversa maliciosa ni usos ilegales.
        </p>

        <h2>2. Plan gratuito y Pro</h2>
        <ul>
          <li>El plan gratuito cubre el uso local básico.</li>
          <li>
            Cuanto Pro ($1.99 USD / mes o equivalente) desbloquea exportar, equipo ampliado y
            respaldo priorizado, según lo publicado en la app.
          </li>
          <li>La activación puede hacerse tras confirmar el pago por WhatsApp.</li>
        </ul>

        <h2>3. Disponibilidad</h2>
        <p>
          Ofrecemos el servicio “tal cual”. Puede haber interrupciones por mantenimiento o fallas de
          red. Los datos locales siguen disponibles sin conexión.
        </p>

        <h2>4. Responsabilidad</h2>
        <p>
          Sos responsable de revisar tus registros. Renace Tech no responde por decisiones
          financieras tomadas con base en la app ni por pérdida de datos del dispositivo si no hay
          respaldo en nube.
        </p>

        <h2>5. Cambios</h2>
        <p>
          Podemos actualizar estos términos. La versión vigente se publica en esta página.
        </p>

        <h2>6. Contacto</h2>
        <p>Consultas: WhatsApp de soporte Cuanto / Renace Tech.</p>
      </article>
    </Screen>
  )
}
