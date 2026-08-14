import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo";

import "../styles/AuthLayout.css";
import "../styles/CambiarContrasena.css";

import {
  cambiarContrasena,
  cerrarSesion,
} from "../services/auth.service";

function CambiarContrasena() {

  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({
    contrasenaActual: "",
    contrasenaNueva: "",
    confirmarContrasena: "",
  });

  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const manejarCambio = (e) => {

    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));

    if (errores[name]) {
      setErrores((actual) => ({
        ...actual,
        [name]: "",
      }));
    }

    setMensaje("");

  };

  function validar() {

    const nuevosErrores = {};

    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,200}$/;

    if (!formulario.contrasenaActual) {
      nuevosErrores.contrasenaActual =
        "Ingresa tu contraseña actual.";
    }

    if (!formulario.contrasenaNueva) {
      nuevosErrores.contrasenaNueva =
        "La nueva contraseña es obligatoria.";
    } else if (!regex.test(formulario.contrasenaNueva)) {
      nuevosErrores.contrasenaNueva =
        "Debe tener entre 12 y 200 caracteres, una mayúscula, una minúscula y un número.";
    }

    if (!formulario.confirmarContrasena) {
      nuevosErrores.confirmarContrasena =
        "Confirma la nueva contraseña.";
    } else if (
      formulario.contrasenaNueva !==
      formulario.confirmarContrasena
    ) {
      nuevosErrores.confirmarContrasena =
        "Las contraseñas no coinciden.";
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;

  }

  const guardar = async (e) => {

    e.preventDefault();

    if (!validar()) return;

    try {

      setGuardando(true);

      await cambiarContrasena({
        contrasenaActual:
          formulario.contrasenaActual,
        contrasenaNueva:
          formulario.contrasenaNueva,
      });

      cerrarSesion();

      setMensaje(
        "Contraseña actualizada correctamente. Inicia sesión nuevamente."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1800);

    } catch (error) {

      setErrores({
        general:
          error.message ||
          "No fue posible cambiar la contraseña.",
      });

    } finally {

      setGuardando(false);

    }

  };

  return (
    <main className="auth-page">
      <section className="auth-card cambiar-card">

        <div className="auth-logo">
          <Logo />
        </div>

        <div className="auth-header">
          <h1>Cambiar contraseña</h1>
          <p>
            Por seguridad debes actualizar tu contraseña antes de continuar.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={guardar}
          noValidate
        >

          {errores.general && (
            <div className="auth-error">
              {errores.general}
            </div>
          )}

          {mensaje && (
            <div className="auth-success">
              {mensaje}
            </div>
          )}

          <div className="auth-group">
            <label>Contraseña actual</label>

            <input
              type="password"
              name="contrasenaActual"
              value={formulario.contrasenaActual}
              onChange={manejarCambio}
              disabled={guardando}
            />

            {errores.contrasenaActual && (
              <small className="campo-error">
                {errores.contrasenaActual}
              </small>
            )}
          </div>

          <div className="auth-group">
            <label>Nueva contraseña</label>

            <input
              type="password"
              name="contrasenaNueva"
              value={formulario.contrasenaNueva}
              onChange={manejarCambio}
              disabled={guardando}
            />

            <small className="password-help">
              Mínimo 12 caracteres, una mayúscula,
              una minúscula y un número.
            </small>

            {errores.contrasenaNueva && (
              <small className="campo-error">
                {errores.contrasenaNueva}
              </small>
            )}
          </div>

          <div className="auth-group">
            <label>Confirmar contraseña</label>

            <input
              type="password"
              name="confirmarContrasena"
              value={formulario.confirmarContrasena}
              onChange={manejarCambio}
              disabled={guardando}
            />

            {errores.confirmarContrasena && (
              <small className="campo-error">
                {errores.confirmarContrasena}
              </small>
            )}
          </div>

          <button
            className="auth-button"
            disabled={guardando}
            type="submit"
          >
            {guardando
              ? "Actualizando..."
              : "Cambiar contraseña"}
          </button>

        </form>
      </section>
    </main>
  );

}

export default CambiarContrasena;