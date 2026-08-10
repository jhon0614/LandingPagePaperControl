import Logo from "../components/Logo";
import "../styles/AuthLayout.css";
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


      if (!correo.trim() || !contrasena) {

        setError("Todos los campos son obligatorios");

        return;
      }


      try {


        const datos = await login(
          correo.trim(),
          contrasena
        );


        const usuario = datos.datos.usuario;
        const token = datos.datos.tokenAcceso;

        localStorage.setItem(
          "usuario",
          JSON.stringify(usuario)
        );

        localStorage.setItem(
          "token",
          token
        );


        console.log("Usuario autenticado:", usuario);


        const rol = usuario.rol;


        if (rol === "ADMINISTRADOR") {

          navigate("/admin");

        } else if (rol === "VENDEDOR") {

          navigate("/vendedor");

        } else if (rol === "DUENO") {

          navigate("/dueno");

        } else {

          setError(
            "El usuario no tiene un rol válido."
          );

        }


      } catch (error) {

        setError(
          error.message || "No fue posible iniciar sesión."
        );

      }

    };


    return (
      <main className="auth-page">

        <section className="auth-card">

          <div className="auth-logo">
            <Logo />
          </div>


          <div className="auth-header">

            <h1>
              Iniciar sesión
            </h1>

            <p>
              Ingresa tus credenciales para acceder a PaperControl
            </p>

          </div>


          <form
            className="auth-form"
            onSubmit={iniciarSesion}
          >

            <div className="auth-group">

              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                placeholder="correo@empresa.com"
                value={correo}
                onChange={(e) =>
                  setCorreo(e.target.value)
                }
              />

            </div>


            <div className="auth-group">

              <label htmlFor="password">
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={contrasena}
                onChange={(e) =>
                  setContrasena(e.target.value)
                }
              />

            </div>


            <div className="auth-options">

              <label>

                <input type="checkbox" />

                Recordarme

              </label>


              <a href="#recuperar">
                ¿Olvidaste tu contraseña?
              </a>

            </div>


            {error && (

              <p className="auth-error">
                {error}
              </p>

            )}


            <button
              type="submit"
              className="auth-button"
            >
              Iniciar sesión
            </button>

          </form>


          <p className="auth-footer">

            ¿No tienes una cuenta?

            {" "}

            <a href="#contacto">
              Contáctanos
            </a>

          </p>

        </section>

      </main>
    );
}

export default Login;