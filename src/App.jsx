import { useState } from "react";
import Logo from "./components/Logo";
import Swal from "sweetalert2";
import "./App.css";

function App() {
  // Estado principal del formulario de contacto
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    mensaje: "",
  });
  // Estado para almacenar los errores de validación por campo
  const [error, setError] = useState({});
  // Controla el estado del botón mientras se procesa el envío
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpia el error del campo cuando el usuario vuelve a escribir
    setError((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  function validate() {
    const newError = {};

    if (!formData.nombre.trim()) {
      newError.nombre = "Ingresa tu nombre";
    }

    if (!formData.apellido.trim()) {
      newError.apellido = "Ingresa tu apellido";
    }

    if (!formData.email.trim()) {
      newError.email = "Ingresa tu correo";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newError.email = "Correo inválido";
    }

    if (!formData.mensaje.trim()) {
      newError.mensaje = "Cuéntanos sobre tu negocio";
    }

    setError(newError);
    // Retorna true solo cuando no existen errores
    return Object.keys(newError).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Detiene el envío si algún campo no cumple las validaciones
    if (!validate()) {
      Swal.fire({
        icon: "error",
        title: "Ups...",
        text: "Completa correctamente todos los campos.",
        confirmButtonColor: "#05788a",
        background: "#ffffff",
        color: "#062f3d",
      });

      return;
    }

    setLoading(true);
    // Simulación de envío mientras no exista conexión con backend
    setTimeout(() => {
      setLoading(false);

      Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: "Gracias por contactarnos. Te responderemos pronto.",
        confirmButtonText: "Continuar",
        confirmButtonColor: "#05788a",

        background: "#ffffff",

        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },

        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
      });
      // Limpia el formulario después del envío exitoso
      setFormData({
        nombre: "",
        apellido: "",
        email: "",
        mensaje: "",
      });
    }, 1200);
  }
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
              predecir qué productos comprar antes de que se agoten, optimizando
              mi flujo de caja."
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
            Agenda una llamada de diagnóstico gratuita con nuestros
            especialistas en optimización de procesos.
          </p>

          <ul>
            <li>✉ contacto@papercontrol.com</li>
            <li>☎ +56 9 1234 5678</li>
            <li>⌖ Distrito Tecnológico, Santiago, Chile</li>
          </ul>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="nombre"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={handleChange}
              />
              {error.nombre && <small className="error">{error.nombre}</small>}
            </div>

            <div className="form-group">
              <input
                type="text"
                name="apellido"
                placeholder="Tu apellido"
                value={formData.apellido}
                onChange={handleChange}
              />
              {error.apellido && (
                <small className="error">{error.apellido}</small>
              )}
            </div>
          </div>

          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="email@empresa.com"
              value={formData.email}
              onChange={handleChange}
            />
            {error.email && <small className="error">{error.email}</small>}
          </div>

          <div className="form-group">
            <textarea
              name="mensaje"
              placeholder="Cuéntanos sobre tu negocio..."
              value={formData.mensaje}
              onChange={handleChange}
            ></textarea>
            {error.mensaje && <small className="error">{error.mensaje}</small>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>

        </form>
      </section>

      <footer className="footer">
        <div>
          <Logo />
          <p>
            © 2026 PaperControl. Todos los derechos reservados. Tecnología para
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
