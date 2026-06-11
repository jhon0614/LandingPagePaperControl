import "./App.css";

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 350"
      className="logo-svg"
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0080b0" />
          <stop offset="60%" stopColor="#26a99a" />
          <stop offset="100%" stopColor="#7ad080" />
        </linearGradient>
      </defs>

      <g transform="translate(50, 50)">
        <path
          d="M 40,20 
             L 110,20 
             A 15,15 0 0 1 125,35 
             L 125,130 
             A 15,15 0 0 1 110,145 
             L 40,145 
             A 15,15 0 0 1 25,130 
             L 25,35 
             A 15,15 0 0 1 40,20 Z"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        <circle
          cx="135"
          cy="135"
          r="28"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="7"
        />

        <line
          x1="155"
          y1="155"
          x2="175"
          y2="175"
          stroke="url(#gradient)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <text
          x="210"
          y="112"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="62"
          fontWeight="700"
          fill="#0092c5"
          letterSpacing="-1"
        >
          PaperControl
        </text>

        <text
          x="210"
          y="162"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="34"
          fontWeight="400"
          fill="#6b7280"
        >
          inventario y ventas
        </text>
      </g>
    </svg>
  );
}

function App() {
  return (
    <main className="landing">
      <header className="navbar">
        <a href="#inicio" className="brand">
          <Logo />
        </a>

        <nav className="nav-menu">
          <a href="#inicio">Inicio</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <a href="#login" className="btn btn-primary small-btn">
          Iniciar Sesión
        </a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-content">
          <h1>Gestiona tu inventario y ventas de forma inteligente</h1>
          <p>
            Simplifica la operación de tu negocio con herramientas diseñadas
            para el crecimiento. Control total, reportes en tiempo real y
            administración simplificada.
          </p>

          <div className="hero-actions">
            <a href="#contacto" className="btn btn-primary">
              Solicitar información
            </a>

            <a href="#funcionalidades" className="btn btn-outline">
              Ver Demo
            </a>
          </div>
        </div>

        <div className="hero-image">
          <div className="monitor">
            <div className="monitor-screen">
              <div className="chart large"></div>
              <div className="chart small"></div>
              <div className="table-lines">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="monitor-base"></div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <h2>Optimización en cada nivel de tu negocio</h2>
        <p>
          PaperControl centraliza tus operaciones críticas, permitiéndote tomar
          decisiones basadas en datos y no en suposiciones.
        </p>

        <div className="stats-grid">
          <article>
            <strong>30%</strong>
            <span>Ahorro en tiempos operativos</span>
          </article>

          <article>
            <strong>100%</strong>
            <span>Visibilidad de stock real</span>
          </article>

          <article>
            <strong>+15k</strong>
            <span>Usuarios activos mensuales</span>
          </article>

          <article>
            <strong>24/7</strong>
            <span>Soporte técnico premium</span>
          </article>
        </div>
      </section>

      <section className="section benefits-section" id="beneficios">
        <h2>Nuestros Beneficios</h2>

        <div className="benefits-grid">
          <article>
            <div className="icon">🎓</div>
            <h3>Capacitación</h3>
            <p>
              Programas de inducción personalizados para que tu equipo domine la
              plataforma desde el primer día.
            </p>
          </article>

          <article>
            <div className="icon">🎧</div>
            <h3>Soporte</h3>
            <p>
              Equipo técnico disponible en múltiples canales para resolver
              cualquier duda o incidencia operativa.
            </p>
          </article>

          <article>
            <div className="icon">📖</div>
            <h3>Guías</h3>
            <p>
              Biblioteca completa de recursos y documentación técnica
              actualizada mensualmente.
            </p>
          </article>

          <article>
            <div className="icon">📤</div>
            <h3>Exportación</h3>
            <p>
              Exporta tus reportes de ventas e inventario en múltiples formatos:
              Excel, PDF, CSV o nube.
            </p>
          </article>

          <article>
            <div className="icon">🧩</div>
            <h3>Centralizado</h3>
            <p>
              Controla múltiples sucursales y bodegas desde una sola interfaz
              administrativa central.
            </p>
          </article>

          <article>
            <div className="icon">🛡️</div>
            <h3>Seguridad</h3>
            <p>
              Respaldo automático de datos y encriptación de grado empresarial
              para tu información.
            </p>
          </article>
        </div>
      </section>

      <section className="section features-section" id="funcionalidades">
        <h2>Funcionalidades Potentes</h2>
        <p>
          Herramientas modulares que se adaptan a las necesidades específicas de
          tu sector comercial.
        </p>

        <div className="features-grid">
          <article>
            <span>▣</span>
            <h3>Gestión de Inventario</h3>
            <p>
              Control de SKU, alertas de stock bajo y trazabilidad de productos
              por lote y fecha.
            </p>
          </article>

          <article>
            <span>▥</span>
            <h3>Registro de Ventas</h3>
            <p>
              Punto de venta intuitivo con múltiples métodos de pago y
              facturación electrónica integrada.
            </p>
          </article>

          <article>
            <span>♟</span>
            <h3>Adm. Clientes</h3>
            <p>
              CRM integrado para historial de compras, programas de lealtad y
              perfiles de consumo.
            </p>
          </article>

          <article>
            <span>▤</span>
            <h3>Gestión de Caja</h3>
            <p>
              Cierre de caja, control de ingresos/egresos y conciliación
              bancaria automatizada.
            </p>
          </article>

          <article>
            <span>♧</span>
            <h3>Control de Usuarios</h3>
            <p>
              Permisos granulares, logs de actividad y roles configurables para
              cada empleado.
            </p>
          </article>

          <article>
            <span>⌁</span>
            <h3>Analítica Avanzada</h3>
            <p>
              Paneles visuales con KPIs clave para medir el rendimiento de tu
              negocio en tiempo real.
            </p>
          </article>
        </div>
      </section>

      <section className="section testimonials-section">
        <h2>Lo que dicen nuestros clientes</h2>

        <div className="testimonials-grid">
          <article>
            <span className="quote">”</span>
            <p>
              "Desde que implementamos PaperControl, nuestros discrepancias de
              inventario se redujeron a cero. La interfaz es tan limpia que mi
              equipo no necesitó más de un día de capacitación."
            </p>
            <div className="person">
              <strong>RC</strong>
              <div>
                <h4>Ricardo Castro</h4>
                <small>Gerente de Retail</small>
              </div>
            </div>
          </article>

          <article>
            <span className="quote">”</span>
            <p>
              "La capacidad de gestionar múltiples puntos de venta desde una
              sola pantalla cambió nuestro modelo de negocio. Ahora escalamos
              sin el caos operativo previo."
            </p>
            <div className="person">
              <strong>MS</strong>
              <div>
                <h4>Mariana Soto</h4>
                <small>Fundadora de Distribuidora Sol</small>
              </div>
            </div>
          </article>

          <article>
            <span className="quote">”</span>
            <p>
              "Los reportes de ventas son increíblemente detallados. Me permite
              predecir qué productos comprar antes de que se agoten,
              optimizando mi flujo de caja."
            </p>
            <div className="person">
              <strong>AL</strong>
              <div>
                <h4>Andrés López</h4>
                <small>Director de Operaciones</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section faq-section">
        <h2>Preguntas Frecuentes</h2>

        <div className="faq-list">
          <details>
            <summary>¿Cuánto tiempo toma la implementación?</summary>
            <p>
              La implementación básica se realiza en menos de 24 horas. Si
              requiere migración de datos, el tiempo puede variar según el caso.
            </p>
          </details>

          <details>
            <summary>¿Puedo usarlo sin conexión a internet?</summary>
            <p>
              PaperControl cuenta con un modo offline robusto que permite seguir
              operando y sincronizar información al recuperar conexión.
            </p>
          </details>

          <details>
            <summary>¿Existe un límite de usuarios o sucursales?</summary>
            <p>
              Ofrecemos planes escalables desde operación pequeña hasta empresas
              con múltiples sucursales.
            </p>
          </details>
        </div>
      </section>

      <section className="contact-section" id="contacto">
        <div className="contact-info">
          <h2>¿Listo para transformar tu negocio?</h2>
          <p>
            Agenda una llamada de diagnóstico gratuita con nuestros especialistas
            en optimización de procesos.
          </p>

          <ul>
            <li>✉ contacto@papercontrol.com</li>
            <li>☎ +56 9 1234 5678</li>
            <li>⌖ Distrito Tecnológico, Santiago, Chile</li>
          </ul>
        </div>

        <form className="contact-form">
          <div className="form-row">
            <input type="text" placeholder="Tu nombre" />
            <input type="text" placeholder="Tu apellido" />
          </div>

          <input type="email" placeholder="email@empresa.com" />

          <textarea placeholder="Cuéntanos sobre tu negocio..."></textarea>

          <button type="submit" className="btn btn-primary">
            Enviar Solicitud
          </button>
        </form>
      </section>

      <footer className="footer">
        <div>
          <Logo />
          <p>
            © 2024 PaperControl. Todos los derechos reservados. Tecnología para
            el control total.
          </p>
        </div>

        <div>
          <h4>Producto</h4>
          <a href="#beneficios">Precios</a>
          <a href="#funcionalidades">API</a>
          <a href="#demo">Demo</a>
        </div>

        <div>
          <h4>Empresa</h4>
          <a href="#contacto">Sobre nosotros</a>
          <a href="#testimonios">Blog</a>
          <a href="#contacto">Carreras</a>
        </div>

        <div>
          <h4>Legal</h4>
          <a href="#privacidad">Privacidad</a>
          <a href="#terminos">Términos</a>
          <a href="#cookies">Cookies</a>
        </div>

        <div>
          <h4>Redes</h4>
          <div className="socials">
            <span>↗</span>
            <span>◉</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;