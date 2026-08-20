import Logo from "../components/Logo";
import "../styles/AuthLayout.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    login,
} from "../services/auth.service";

import {
    establecerToken,
    limpiarToken,
} from "../services/api";


function Login() {

    const navigate = useNavigate();


    const [correo, setCorreo] = useState(
    localStorage.getItem("correoRecordado") || ""
    );

    const [recordarme, setRecordarme] = useState(
        localStorage.getItem("recordarme") === "true"
    );

    const [contrasena, setContrasena] =
        useState("");

    const [error, setError] =
        useState("");

    const [cargando, setCargando] =
        useState(false);

    const [cuentaBloqueada, setCuentaBloqueada] =
        useState(false);


    /*
    =========================================================
    INICIAR SESIÓN
    =========================================================
    */

    const iniciarSesion = async (e) => {

        e.preventDefault();


        setError("");
        setCuentaBloqueada(false);


        /*
        =====================================================
        VALIDACIÓN BÁSICA
        =====================================================
        */

        if (
            !correo.trim() ||
            !contrasena
        ) {

            setError(
                "Todos los campos son obligatorios."
            );

            return;
        }


        try {

            setCargando(true);


            /*
            =================================================
            LOGIN
            =================================================
            */

            const datos =
                await login(
                    correo.trim(),
                    contrasena
                );


            /*
            =================================================
            DATOS DE AUTENTICACIÓN
            =================================================
            */

            const usuario =
                datos?.datos?.usuario;

            const token =
                datos?.datos?.tokenAcceso;


            if (
                !usuario ||
                !token
            ) {

                throw new Error(
                    "La respuesta del servidor no contiene los datos de autenticación."
                );

            }

            if (recordarme) {

                localStorage.setItem(
                    "correoRecordado",
                    correo.trim()
                );

                localStorage.setItem(
                    "recordarme",
                    "true"
                );

            } else {

                localStorage.removeItem(
                    "correoRecordado"
                );

                localStorage.removeItem(
                    "recordarme"
                );

            }

            /*
            =================================================
            TOKEN EN MEMORIA
            =================================================

            IMPORTANTE:

            NO utilizamos localStorage para guardar
            el token.
            */

            establecerToken(token);


            /*
            =================================================
            USUARIO
            =================================================

            Conservamos temporalmente los datos del usuario
            para la interfaz.

            El token NO se guarda aquí.
            */

            localStorage.setItem(
                "usuario",
                JSON.stringify(usuario)
            );


            console.log(
                "Usuario autenticado:",
                usuario
            );


            /*
            =================================================
            CAMBIO OBLIGATORIO DE CONTRASEÑA
            =================================================

            El backend devuelve:

            usuario.debeCambiarContrasena

            Si es true:

            - No entra al dashboard.
            - Va directamente a cambiar contraseña.
            */

            if (
                usuario.debeCambiarContrasena === true
            ) {

                navigate(
                    "/cambiar-contrasena"
                );

                return;
            }


            /*
            =================================================
            ROL DEL USUARIO
            =================================================
            */

            const rol =
                usuario.rol;


            /*
            =================================================
            ADMINISTRADOR
            =================================================
            */

            if (
                rol === "ADMINISTRADOR"
            ) {

                navigate(
                    "/admin"
                );

                return;
            }


            /*
            =================================================
            VENDEDOR
            =================================================
            */

            if (
                rol === "VENDEDOR"
            ) {

                navigate(
                    "/vendedor"
                );

                return;
            }


            /*
            =================================================
            DUEÑO
            =================================================
            */

            if (
                rol === "DUENO"
            ) {

                navigate(
                    "/dueno"
                );

                return;
            }


            /*
            =================================================
            ROL NO VÁLIDO
            =================================================
            */

            limpiarToken();

            localStorage.removeItem(
                "usuario"
            );


            setError(
                "El usuario no tiene un rol válido."
            );


        } catch (error) {

            console.error(
                "Error iniciando sesión:",
                error
            );


            /*
            =================================================
            INFORMACIÓN DEL ERROR
            =================================================
            */

            const codigo =
                String(
                    error?.codigo || ""
                ).toUpperCase();


            const mensajeBackend =
                String(
                    error?.message || ""
                ).toLowerCase();


            /*
            =================================================
            DETECTAR CUENTA BLOQUEADA
            =================================================
            */

            const bloqueoPorCodigo =
                codigo.includes(
                    "BLOQUE"
                ) ||
                codigo.includes(
                    "LOCK"
                );


            const bloqueoPorMensaje =
                mensajeBackend.includes(
                    "bloqueada"
                ) ||
                mensajeBackend.includes(
                    "bloqueado"
                ) ||
                mensajeBackend.includes(
                    "demasiados intentos"
                ) ||
                mensajeBackend.includes(
                    "intentos fallidos"
                );


            const bloqueoPorEstado =
                error?.status === 423 ||
                error?.status === 429;


            if (
                bloqueoPorCodigo ||
                bloqueoPorMensaje ||
                bloqueoPorEstado
            ) {

                setCuentaBloqueada(
                    true
                );


                setError(
                    error.message ||
                    "Tu cuenta está bloqueada temporalmente. Intenta nuevamente más tarde o contacta al administrador."
                );


                return;
            }


            /*
            =================================================
            ERROR NORMAL DE LOGIN
            =================================================
            */

            setError(
                error.message ||
                "No fue posible iniciar sesión."
            );


        } finally {

            setCargando(false);

        }

    };


    /*
    =========================================================
    IR A OLVIDÉ MI CONTRASEÑA
    =========================================================
    */

    function irARecuperarContrasena() {

        navigate(
            "/olvide-contrasena"
        );

    }

    /*
    =========================================================
    IR A CONTACTO
    =========================================================
    */
    function irAContacto() {

    navigate("/");

    setTimeout(() => {

        document
            .getElementById("contacto")
            ?.scrollIntoView({
                behavior: "smooth",
            });

    }, 150);

}


    /*
    =========================================================
    RENDER
    =========================================================
    */

    function volverAlInicio() {navigate("/");}

    return (

        <main className="auth-page">

            <section className="auth-card">


                {/* LOGO */}

                <div className="auth-logo">

                    <Logo />

                </div>


                {/* ENCABEZADO */}

                <div className="auth-header">

                    <h1>
                        Iniciar sesión
                    </h1>

                    <p>
                        Ingresa tus credenciales
                        para acceder a PaperControl
                    </p>

                </div>

                {/* FORMULARIO */}

                <form
                    className="auth-form"
                    onSubmit={iniciarSesion}
                    noValidate
                >


                    {/* CORREO */}

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
                                setCorreo(
                                    e.target.value
                                )
                            }
                            disabled={cargando}
                            autoComplete="username"
                        />

                    </div>


                    {/* CONTRASEÑA */}

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
                                setContrasena(
                                    e.target.value
                                )
                            }
                            disabled={cargando}
                            autoComplete="current-password"
                        />

                    </div>


                    {/* OPCIONES */}

                    <div className="auth-options">


                        <label>
                            <input
                                type="checkbox"
                                checked={recordarme}
                                onChange={(e) =>
                                    setRecordarme(e.target.checked)
                                }
                                disabled={cargando}
                            />
                            Recordarme
                        </label>


                        <button
                            type="button"
                            className="auth-link-button"
                            onClick={
                                irARecuperarContrasena
                            }
                            disabled={cargando}
                        >

                            ¿Olvidaste tu contraseña?

                        </button>


                    </div>


                    {/* CUENTA BLOQUEADA */}

                    {cuentaBloqueada && (

                        <div
                            className="auth-error auth-error-bloqueo"
                        >

                            <i className="fa-solid fa-lock"></i>

                            <div>

                                <strong>
                                    Cuenta bloqueada
                                </strong>

                                <p>
                                    {error}
                                </p>

                            </div>

                        </div>

                    )}


                    {/* ERROR NORMAL */}

                    {error &&
                        !cuentaBloqueada && (

                            <p className="auth-error">

                                {error}

                            </p>

                        )}


                    {/* BOTÓN INICIAR SESIÓN */}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={cargando}
                    >

                        {cargando ? (

                            <>

                                <i className="fa-solid fa-spinner fa-spin"></i>

                                Verificando...

                            </>

                        ) : (

                            <>

                                <i className="fa-solid fa-right-to-bracket"></i>

                                Iniciar sesión

                            </>

                        )}

                    </button>

                    {/* VOLVER AL INICIO */}

                    <button
                        type="button"
                        className="btn-volver-inicio"
                        onClick={volverAlInicio}
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        Volver al inicio
                    </button>


                </form>


                {/* FOOTER */}

                <p className="auth-footer">

                    ¿Necesitas ayuda?{" "}

                    <button
                        type="button"
                        className="auth-link-button"
                        onClick={irAContacto}
                    >
                        Contáctanos
                    </button>

                </p>


            </section>

        </main>

    );

}


export default Login;