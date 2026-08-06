import Logo from "../components/Logo";
import "../styles/Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth.service";

function Login() {

  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const iniciarSesion = async (e) => {
  e.preventDefault();

  setError("");

  if (!correo || !contrasena) {
    setError("Todos los campos son obligatorios");
    return;
  }

  try {
    const datos = await login(correo, contrasena);

    console.log(datos.datos.usuario);

    alert("Inicio de sesión correcto");

    // Más adelante redirigiremos al dashboard
    // navigate("/dashboard");

  } catch (error) {
    setError(error.message);
  }
};

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

        <form className="login-form" onSubmit={iniciarSesion}>
          <div className="login-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="correo@empresa.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>

          <div className="login-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Recordarme
            </label>

            <a href="#recuperar">¿Olvidaste tu contraseña?</a>
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

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