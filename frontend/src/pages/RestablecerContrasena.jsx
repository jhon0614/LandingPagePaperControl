import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Logo from "../components/Logo";
import "../styles/RestablecerContrasena.css";

import { restablecerContrasena } from "../services/auth.service";

function RestablecerContrasena() {

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");


    const [contrasenaNueva, setContrasenaNueva] =
        useState("");

    const [confirmarContrasena, setConfirmarContrasena] =
        useState("");

    const [mostrarContrasena, setMostrarContrasena] =
        useState(false);

    const [mostrarConfirmacion, setMostrarConfirmacion] =
        useState(false);

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    const [cargando, setCargando] =
        useState(false);

    const [tokenInvalido, setTokenInvalido] =
        useState(false);


    /*
     * =====================================================
     * VALIDACIÓN DE CONTRASEÑA
     * =====================================================
     */

    const validarContrasena = (contrasena) => {

        if (contrasena.length < 12) {
            return "La contraseña debe tener mínimo 12 caracteres.";
        }

        if (contrasena.length > 200) {
            return "La contraseña debe tener máximo 200 caracteres.";
        }

        if (!/[A-Z]/.test(contrasena)) {
            return "La contraseña debe contener al menos una mayúscula.";
        }

        if (!/[a-z]/.test(contrasena)) {
            return "La contraseña debe contener al menos una minúscula.";
        }

        if (!/[0-9]/.test(contrasena)) {
            return "La contraseña debe contener al menos un número.";
        }

        return "";
    };


    /*
     * =====================================================
     * VERIFICAR TOKEN
     * =====================================================
     */

    useEffect(() => {

        if (!token) {

            setTokenInvalido(true);

            setError(
                "El enlace de restablecimiento no es válido o está incompleto."
            );

        }

    }, [token]);


    /*
     * =====================================================
     * ENVIAR FORMULARIO
     * =====================================================
     */

    const manejarSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setMensaje("");


        if (!token) {

            setError(
                "El enlace de restablecimiento no es válido."
            );

            return;
        }


        /*
         * Validar contraseña
         */

        const errorContrasena =
            validarContrasena(contrasenaNueva);


        if (errorContrasena) {

            setError(errorContrasena);

            return;
        }


        /*
         * Confirmar contraseña
         */

        if (
            contrasenaNueva !==
            confirmarContrasena
        ) {

            setError(
                "Las contraseñas no coinciden."
            );

            return;
        }


        try {

            setCargando(true);


            await restablecerContrasena(
                token,
                contrasenaNueva
            );


            setMensaje(
                "Tu contraseña fue restablecida correctamente. Serás redirigido al inicio de sesión."
            );


            /*
             * Después de unos segundos
             * enviamos al login.
             */

            setTimeout(() => {

                navigate("/login", {
                    replace: true,
                    state: {
                        mensaje:
                            "Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña."
                    }
                });

            }, 2500);


        } catch (error) {

            /*
             * Token inválido, vencido
             * o ya utilizado.
             */

            if (
                error.codigo ===
                "TOKEN_RESTABLECIMIENTO_INVALIDO"
            ) {

                setTokenInvalido(true);

                setError(
                    "El enlace de restablecimiento venció, ya fue utilizado o no es válido."
                );

            } else {

                setError(
                    error.message ||
                    "No fue posible restablecer la contraseña."
                );

            }

        } finally {

            setCargando(false);

        }

    };


    /*
     * =====================================================
     * VOLVER A OLVIDÉ MI CONTRASEÑA
     * =====================================================
     */

    const volverRecuperacion = () => {

        navigate(
            "/olvide-contrasena"
        );

    };


    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (

        <main className="auth-page">

            <section className="auth-card restablecer-card">


                {/* LOGO */}

                <div className="auth-logo">

                    <Logo />

                </div>


                {/* ENCABEZADO */}

                <div className="auth-header">

                    <h1>
                        Restablecer contraseña
                    </h1>

                    <p>
                        Ingresa una nueva contraseña para recuperar el acceso a tu cuenta.
                    </p>

                </div>


                {/* TOKEN INVÁLIDO */}

                {tokenInvalido ? (

                    <div className="restablecer-token-error">

                        <div className="restablecer-icono-error">
                            !
                        </div>

                        <h2>
                            Enlace no válido
                        </h2>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            className="auth-button"
                            onClick={volverRecuperacion}
                        >
                            Solicitar un nuevo enlace
                        </button>

                    </div>

                ) : (

                    <form
                        className="auth-form"
                        onSubmit={manejarSubmit}
                    >


                        {/* CONTRASEÑA NUEVA */}

                        <div className="auth-group">

                            <label htmlFor="nueva-contrasena">
                                Contraseña nueva
                            </label>


                            <div className="password-wrapper">

                                <input
                                    id="nueva-contrasena"
                                    type={
                                        mostrarContrasena
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Ingresa tu nueva contraseña"
                                    value={contrasenaNueva}
                                    onChange={(e) =>
                                        setContrasenaNueva(
                                            e.target.value
                                        )
                                    }
                                    disabled={cargando}
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setMostrarContrasena(
                                            !mostrarContrasena
                                        )
                                    }
                                    tabIndex="-1"
                                >
                                    {mostrarContrasena
                                        ? "Ocultar"
                                        : "Mostrar"}
                                </button>

                            </div>


                            <small className="password-help">
                                Mínimo 12 caracteres, una mayúscula,
                                una minúscula y un número.
                            </small>

                        </div>


                        {/* CONFIRMACIÓN */}

                        <div className="auth-group">

                            <label htmlFor="confirmar-contrasena">
                                Confirmar contraseña
                            </label>


                            <div className="password-wrapper">

                                <input
                                    id="confirmar-contrasena"
                                    type={
                                        mostrarConfirmacion
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Repite tu nueva contraseña"
                                    value={confirmarContrasena}
                                    onChange={(e) =>
                                        setConfirmarContrasena(
                                            e.target.value
                                        )
                                    }
                                    disabled={cargando}
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setMostrarConfirmacion(
                                            !mostrarConfirmacion
                                        )
                                    }
                                    tabIndex="-1"
                                >
                                    {mostrarConfirmacion
                                        ? "Ocultar"
                                        : "Mostrar"}
                                </button>

                            </div>

                        </div>


                        {/* ERROR */}

                        {error && (

                            <div className="auth-error">

                                {error}

                            </div>

                        )}


                        {/* MENSAJE ÉXITO */}

                        {mensaje && (

                            <div className="auth-success">

                                {mensaje}

                            </div>

                        )}


                        {/* BOTÓN */}

                        <button
                            type="submit"
                            className="auth-button"
                            disabled={cargando}
                        >

                            {cargando
                                ? "Restableciendo..."
                                : "Restablecer contraseña"}

                        </button>


                        {/* VOLVER */}

                        <button
                            type="button"
                            className="auth-link-button"
                            onClick={() =>
                                navigate("/login")
                            }
                            disabled={cargando}
                        >
                            ← Volver al inicio de sesión
                        </button>

                    </form>

                )}

            </section>

        </main>

    );

}

export default RestablecerContrasena;