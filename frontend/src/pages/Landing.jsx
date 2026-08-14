import Logo from "../components/Logo";
import Swal from "sweetalert2";
import vistaPrevia from "../assets/VistaPreviaPaperControl.png";
import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Landing() {
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
    const { name, value } = e.target; // Obtiene el nombre y valor del input diligenciado

    setFormData((prev) => ({
      ...prev,
      [name]: value, // obtiene el valor del input y lo asigna al estado
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

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); //navega hacía los diferentes anclajes en la página web (inicio, beneficios, funcionalidades, contacto)
  }

  return (
    <main className="landing">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">
          <Logo />
        </div>

        <nav className="nav-menu">
          <button onClick={() => scrollTo("inicio")}>Inicio</button>
          <button onClick={() => scrollTo("beneficios")}>Beneficios</button>
          <button onClick={() => scrollTo("funcionalidades")}>
            Funcionalidades
          </button>
          <button onClick={() => scrollTo("contacto")}>Contacto</button>
        </nav>

        <Link to="/login" className="btn btn-primary">
          Iniciar Sesión
        </Link>
      </header>

      {/* Hero */}
      <section className="hero" id="inicio">
        <div className="hero-content">
          <h1>Gestiona tu inventario y ventas de forma inteligente</h1>

          <p>
            Simplifica la operación de tu negocio con herramientas diseñadas
            para el crecimiento. Control total, reportes en tiempo real y
            administración simplificada.
          </p>

          <div className="hero-actions">
            <button
              onClick={() => scrollTo("contacto")}
              className="btn btn-primary"
            >
              Solicitar información
            </button>

            <button
              onClick={() => scrollTo("funcionalidades")}
              className="btn btn-outline"
            >
              Ver demo
            </button> 
          </div>
        </div>

        <div className="hero-image">
          <img src={vistaPrevia} alt="Vista previa del sistema" />
        </div>
      </section>

      {/* Estadísticas */}
      <section className="estadisticas">
        <h2>Optimización en cada nivel de tu negocio</h2>
        <p>
          PaperControl centraliza las operaciones críticas de tu negocio,
          permitiéndote tomar decisiones basadas en datos y no en suposiciones.
          Diseñado para empresas que buscan eficiencia, crecimiento y control
          total sobre su inventario y ventas.
        </p>

        <div className="estadisticas-content">
          <div className="estadistica">
            <h3>30%</h3>
            <p>Ahorro en tiempos operativos</p>
          </div>

          <div className="estadistica">
            <h3>100%</h3>
            <p>Visibilidad en tiempo real</p>
          </div>

          <div className="estadistica">
            <h3>50%</h3>
            <p>Reducción de errores manuales</p>
          </div>

          <div className="estadistica">
            <h3>24/7</h3>
            <p>Soporte técnico</p>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="beneficios" id="beneficios">
        <h2>Nuestros Beneficios</h2>

        <div className="beneficios-content">
          <div className="beneficio-card">
            <i className="fa-solid fa-graduation-cap"></i>
            <h3>Capacitación</h3>
            <p>Programas de inducción.</p>
          </div>

          <div className="beneficio-card">
            <i className="fa-solid fa-headset"></i>
            <h3>Soporte Técnico</h3>
            <p>Asistencia 24/7 para resolver tus dudas.</p>
          </div>

          <div className="beneficio-card">
            <i className="fa-solid fa-book"></i>
            <h3>Documentación</h3>
            <p>Guías y recursos para maximizar el uso de PaperControl.</p>
          </div>

          <div className="beneficio-card">
            <i className="fa-solid fa-file-export"></i>
            <h3>Exportación</h3>
            <p>
              Exporta tus datos en diferentes formatos para su análisis y
              reportes.
            </p>
          </div>

          <div className="beneficio-card">
            <i className="fa-solid fa-shield-halved"></i>
            <h3>Seguridad</h3>
            <p>
              Protección de datos con encriptación avanzada y autenticación de
              dos factores.
            </p>
          </div>

          <div className="beneficio-card">
            <i className="fa-solid fa-arrows-to-circle"></i>
            <h3>Centralizado</h3>
            <p>Gestiona todas tus operaciones desde una única plataforma.</p>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="funcionalidades" id="funcionalidades">
        <h2>Funcionalidades Potentes</h2>
        <p>
          Herramientas modulares que se adaptan a las necesidades específicas de
          tu sector comercial.
        </p>

        <div className="funcionalidades-content">
          <div className="funcionalidad-card">
            <i className="fa-solid fa-boxes-stacked"></i>
            <h3>Gestión de Inventario</h3>
            <p>
              Control total sobre tu stock con alertas de bajo inventario y
              reportes detallados.
            </p>
          </div>

          <div className="funcionalidad-card">
            <i className="fa-solid fa-cash-register"></i>
            <h3>Gestión de Ventas</h3>
            <p>
              Procesa ventas de manera eficiente con integración de métodos de
              pago y generación de facturas.
            </p>
          </div>

          <div className="funcionalidad-card">
            <i className="fa-solid fa-users"></i>
            <h3>Admin. Clientes</h3>
            <p>
              Organiza y gestiona tu base de datos de clientes con facilidad.
            </p>
          </div>

          <div className="funcionalidad-card">
            <i className="fa-solid fa-building-columns"></i>
            <h3>Gestión de Caja</h3>
            <p>
              Monitorea tus ingresos y egresos con reportes financieros en
              tiempo real.
            </p>
          </div>

          <div className="funcionalidad-card">
            <i className="fa-solid fa-user-lock"></i>
            <h3>Control de Usuarios</h3>
            <p>
              Administra el acceso y permisos de los usuarios dentro de la
              plataforma.
            </p>
          </div>

          <div className="funcionalidad-card">
            <i className="fa-solid fa-chart-line"></i>
            <h3>Reportes y Análisis</h3>
            <p>
              Genera reportes personalizados para tomar decisiones informadas.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="testimonios">
        <h2>Lo que dicen nuestros clientes</h2>

        <div className="testimonios-content">
          <div className="testimonio-card">
            <p>
              "PaperControl ha transformado la forma en que gestionamos nuestro
              inventario. Es fácil de usar y nos ha ahorrado mucho tiempo."
            </p>
            <h3>- Juan Pérez, Gerente de Tienda</h3>
          </div>

          <div className="testimonio-card">
            <p>
              "La integración de ventas y reportes en tiempo real nos ha
              permitido tomar decisiones más informadas y mejorar nuestra
              rentabilidad."
            </p>
            <h3>- María López, Dueña de Negocio</h3>
          </div>

          <div className="testimonio-card">
            <p>
              "El soporte técnico es excelente. Siempre están disponibles para
              ayudarnos con cualquier duda o problema."
            </p>
            <h3>- Carlos García, Administrador de Inventario</h3>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <h2>Preguntas Frecuentes</h2>

        <details>
          <summary>¿Cuánto tiempo toma la implementación?</summary>
          <p>
            La implementación de PaperControl puede variar según el tamaño de tu
            negocio, pero generalmente toma entre 1 y 2 semanas.
          </p>
        </details>

        <details>
          <summary>¿Puedo usarlo sin conexión a internet?</summary>
          <p>
            Actualmente, PaperControl requiere conexión a internet para
            funcionar correctamente.
          </p>
        </details>

        <details>
          <summary>¿Puedo exportar reportes?</summary>
          <p>Sí.</p>
        </details>

        <details>
          <summary>¿Ofrecen soporte técnico?</summary>
          <p>
            Sí, ofrecemos soporte técnico dedicado para ayudarte con cualquier
            pregunta o problema que puedas tener.
          </p>
        </details>

        <details>
          <summary>¿Cómo puedo comenzar a usar PaperControl?</summary>
          <p>
            Puedes registrarte en nuestra plataforma y comenzar a usar las
            funcionalidades básicas de forma gratuita durante un periodo de
            prueba.
          </p>
        </details>
      </section>

      {/* Contacto */}
      <section className="contacto" id="contacto">
        <div className="contacto-header">
          <div className="contacto-container">
            <div className="contacto-info">
              <h2>¿Listo para transformar tu negocio?</h2>
              <p>
                Agenda una llamada de diagnóstico gratuita con nuestros
                especialistas de optimización de procesos.
              </p>

              <div className="contacto-card">
                <i className="fa-solid fa-envelope"></i>
                <p>paper.control2026@gmail.com</p>
              </div>

              <div className="contacto-card">
                <i className="fa-solid fa-phone"></i>
                <p>+57 4563785692</p>
              </div>

              <div className="contacto-card">
                <i className="fa-solid fa-location-dot"></i>
                <p>Medellín, Colombia.</p>
              </div>
            </div>

            {/* Formulario */}
            <form className="contacto-form" onSubmit={handleSubmit}>
              <div className="row">
                <div className="input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                  {error.nombre && (
                    <span className="error">{error.nombre}</span>
                  )}
                </div>

                <div className="input-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    placeholder="Apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                  />
                  {error.apellido && (
                    <span className="error">{error.apellido}</span>
                  )}
                </div>
              </div>

              <div className="input-group">
                <label>Email Corporativo</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@empresa.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {error.email && <span className="error">{error.email}</span>}
              </div>

              <div className="input-group">
                <label>Mensaje</label>
                <textarea
                  name="mensaje"
                  placeholder="Cuéntanos sobre tu negocio..."
                  value={formData.mensaje}
                  onChange={handleChange}
                />
                {error.mensaje && (
                  <span className="error">{error.mensaje}</span>
                )}
              </div>

              <button type="submit" className="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Solicitud"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">
          <Logo />
          <p>© 2026 PaperControl. Todos los derechos reservados. Colombia.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Producto</h4>
            <a href="#Precios">Precios</a>
            <a href="#API">API</a>
            <a href="#Demo">Demo</a>
          </div>

          <div>
            <h4>Empresa</h4>
            <a href="#Nosotros">Sobre nosotros</a>
            <a href="#Blog">Blog</a>
            <a href="#Carreras">Carreras</a>
          </div>

          <div>
            <h4>Legal</h4>
            <a href="#Privacidad">Privacidad</a>
            <a href="#Terminos">Términos</a>
            <a href="#Cookies">Cookies</a>
          </div>

          <div>
            <h4>Redes</h4>

            <div className="footer-social">
              <a href="#Redes" aria-label="Compartir">
                <i className="fa-solid fa-share-nodes"></i>
              </a>

              <a href="#Web" aria-label="Sitio web">
                <i className="fa-solid fa-earth-americas"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
