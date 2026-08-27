import Logo from "../components/Logo";
import "../styles/OlvideContrasena.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    solicitarRestablecimiento,
} from "../services/auth.service";

function OlvideContrasena() {

    const navigate = useNavigate();


    const [correo, setCorreo] =
        useState("");

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    const [cargando, setCargando] =
        useState(false);


    /*
    =========================================================
    MENSAJE GENERAL DE SEGURIDAD
    =========================================================

    IMPORTANTE:

    Este mensaje debe mostrarse tanto si el correo existe
    como si no existe.

    Así evitamos revelar información sobre las cuentas
    registradas en el sistema.
    */

    const MENSAJE_EXITOSO =
        "Si el correo pertenece a una cuenta disponible, recibirás las instrucciones.";


    /*
    =========================================================
    SOLICITAR RESTABLECIMIENTO
    =========================================================
    */

    const enviarSolicitud = async (e) => {

        e.preventDefault();


        setError("");
        setMensaje("");


        /*
        =====================================================
        VALIDACIÓN
        =====================================================
        */

        const correoLimpio =
            correo.trim();


        if (!correoLimpio) {

            setError(
                "Ingresa tu correo electrónico."
            );

            return;
        }


        /*
        =====================================================
        VALIDACIÓN BÁSICA DEL CORREO
        =====================================================
        */

        const formatoCorreo =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !formatoCorreo.test(
                correoLimpio
            )
        ) {

            setError(
                "Ingresa un correo electrónico válido."
            );

            return;
        }


        try {

            setCargando(true);


            /*
            =================================================
            LLAMADA AL BACKEND
            =================================================
            */

            const respuesta =
                await solicitarRestablecimiento(
                    correoLimpio
                );


            /*
            =================================================
            RESPUESTA EXITOSA
            =================================================

            El backend puede devolver su propio mensaje.

            Si no lo devuelve, usamos el mensaje establecido
            por el requisito.
            */

            const mensajeBackend =
                respuesta?.mensaje ||
                respuesta?.datos?.mensaje;


            setMensaje(
                mensajeBackend ||
                MENSAJE_EXITOSO
            );


            /*
            =================================================
            LIMPIAR EL CAMPO
            =================================================
            */

            setCorreo("");


        } catch (error) {

            console.error(
                "Error solicitando restablecimiento:",
                error
            );


            /*
            =================================================
            DEMASIADAS SOLICITUDES
            =================================================

            El backend puede responder:

            429
            DEMASIADAS_SOLICITUDES
            */

            const codigo =
                String(
                    error?.codigo || ""
                ).toUpperCase();


            if (
                error?.status === 429 ||
                codigo ===
                    "DEMASIADAS_SOLICITUDES"
            ) {

                setError(
                    "Has realizado demasiadas solicitudes. Espera un momento antes de volver a solicitar otro correo."
                );

                return;
            }


            /*
            =================================================
            OTRO ERROR
            =================================================
            */

            setError(
                error?.message ||
                "No fue posible procesar la solicitud. Intenta nuevamente."
            );

        } finally {

            setCargando(false);

        }

    };


    /*
    =========================================================
    VOLVER AL LOGIN
    =========================================================
    */

    const volverAlLogin = () => {

        navigate("/login");

    };


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

    return (

        <main className="auth-page">

            <section className="auth-card">


                {/* =================================================
                    LOGO
                ================================================= */}

                <div className="auth-logo">

                    <Logo />

                </div>


                {/* =================================================
                    ENCABEZADO
                ================================================= */}

                <div className="auth-header">

                    <h1>
                        ¿Olvidaste tu contraseña?
                    </h1>

                    <p>
                        Ingresa tu correo electrónico y
                        te enviaremos las instrucciones
                        para restablecer tu contraseña.
                    </p>

                </div>


                {/* =================================================
                    FORMULARIO
                ================================================= */}

                <form
                    className="auth-form"
                    onSubmit={enviarSolicitud}
                    noValidate
                >


                    {/* =================================================
                        CORREO
                    ================================================= */}

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
                            autoComplete="email"
                        />

                    </div>


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {error && (

                        <div
                            className="auth-error"
                            role="alert"
                        >

                            <i className="fa-solid fa-circle-exclamation"></i>

                            <span>
                                {error}
                            </span>

                        </div>

                    )}


                    {/* =================================================
                        MENSAJE EXITOSO
                    ================================================= */}

                    {mensaje && (

                        <div
                            className="auth-success"
                            role="status"
                        >

                            <i className="fa-solid fa-circle-check"></i>

                            <span>
                                {mensaje}
                            </span>

                        </div>

                    )}


                    {/* =================================================
                        BOTÓN
                    ================================================= */}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={cargando}
                    >

                        {cargando ? (

                            <>

                                <i className="fa-solid fa-spinner fa-spin"></i>

                                Enviando...

                            </>

                        ) : (

                            <>

                                <i className="fa-solid fa-envelope"></i>

                                Enviar instrucciones

                            </>

                        )}

                    </button>


                    {/* =================================================
                        VOLVER
                    ================================================= */}

                    <button
                        type="button"
                        className="auth-link-button auth-back-button"
                        onClick={volverAlLogin}
                        disabled={cargando}
                    >

                        <i className="fa-solid fa-arrow-left"></i>

                        Volver al inicio de sesión

                    </button>


                </form>


                {/* =================================================
                    FOOTER
                ================================================= */}

                <p className="auth-footer">

                    ¿Necesitas ayuda?

                    {" "}

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


export default OlvideContrasena;