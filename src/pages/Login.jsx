import Logo from "../components/Logo";
import "../styles/Login.css";

function Login() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <Logo />
        </div>

        <div className="login-header">
          <h1>Iniciar sesión</h1>
          <p>Ingresa tus credenciales para acceder a PaperControl</p>
        </div>

        <form className="login-form">
          <div className="login-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="login-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Recordarme
            </label>

            <a href="#recuperar">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" className="login-button">
            Iniciar sesión
          </button>
        </form>

        <p className="login-footer">
          ¿No tienes una cuenta? <a href="#contacto">Contáctanos</a>
        </p>
      </section>
    </main>
  );
}

export default Login;