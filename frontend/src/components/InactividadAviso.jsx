import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { cerrarSesion } from "../services/auth.service";

import "../styles/InactividadAviso.css";


/*
=========================================================
CONFIGURACIÓN
=========================================================

Tiempo de inactividad antes de MOSTRAR el aviso.
Ajusta este número según lo que necesites.
*/

const MINUTOS_ANTES_DE_AVISAR = 15;

const SEGUNDOS_CUENTA_REGRESIVA = 120; // 2 minutos, máximo pedido


const EVENTOS_ACTIVIDAD = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
];


function InactividadAviso() {

    const navigate = useNavigate();

    const [mostrarAviso, setMostrarAviso] = useState(false);

    const [segundosRestantes, setSegundosRestantes] =
        useState(SEGUNDOS_CUENTA_REGRESIVA);

    const temporizadorInactividad = useRef(null);

    const intervaloCuentaRegresiva = useRef(null);


    const limpiarIntervalo = useCallback(() => {

        if (intervaloCuentaRegresiva.current) {

            clearInterval(intervaloCuentaRegresiva.current);

            intervaloCuentaRegresiva.current = null;

        }

    }, []);


    const cerrarPorInactividad = useCallback(async () => {

        limpiarIntervalo();

        setMostrarAviso(false);

        await cerrarSesion();

        navigate("/login", {
            replace: true,
            state: {
                mensaje:
                    "Tu sesión se cerró automáticamente por inactividad.",
            },
        });

    }, [limpiarIntervalo, navigate]);


    const iniciarCuentaRegresiva = useCallback(() => {

        setSegundosRestantes(SEGUNDOS_CUENTA_REGRESIVA);

        setMostrarAviso(true);

        limpiarIntervalo();

        intervaloCuentaRegresiva.current = setInterval(() => {

            setSegundosRestantes((actual) => {

                if (actual <= 1) {

                    limpiarIntervalo();

                    cerrarPorInactividad();

                    return 0;

                }

                return actual - 1;

            });

        }, 1000);

    }, [limpiarIntervalo, cerrarPorInactividad]);


    const reiniciarTemporizadorInactividad = useCallback(() => {

        if (temporizadorInactividad.current) {

            clearTimeout(temporizadorInactividad.current);

        }

        temporizadorInactividad.current = setTimeout(

            iniciarCuentaRegresiva,

            MINUTOS_ANTES_DE_AVISAR * 60 * 1000

        );

    }, [iniciarCuentaRegresiva]);


    /*
     * Mientras el aviso está visible, se ignora la actividad
     * pasiva: el usuario debe confirmar explícitamente con
     * el botón "Sigo aquí" para reiniciar el conteo.
     */

    useEffect(() => {

        if (mostrarAviso) {

            return;

        }

        reiniciarTemporizadorInactividad();

        EVENTOS_ACTIVIDAD.forEach((evento) =>

            window.addEventListener(
                evento,
                reiniciarTemporizadorInactividad
            )

        );

        return () => {

            if (temporizadorInactividad.current) {

                clearTimeout(temporizadorInactividad.current);

            }

            EVENTOS_ACTIVIDAD.forEach((evento) =>

                window.removeEventListener(
                    evento,
                    reiniciarTemporizadorInactividad
                )

            );

        };

    }, [mostrarAviso, reiniciarTemporizadorInactividad]);


    function seguirEnSesion() {

        limpiarIntervalo();

        setMostrarAviso(false);

    }


    async function cerrarSesionManual() {

        limpiarIntervalo();

        setMostrarAviso(false);

        await cerrarSesion();

        navigate("/login", { replace: true });

    }


    if (!mostrarAviso) {

        return null;

    }


    const minutos = Math.floor(segundosRestantes / 60);

    const segundos = String(segundosRestantes % 60).padStart(2, "0");


    return (

        <div className="inactividad-overlay">

            <div className="inactividad-modal">

                <div className="inactividad-icono">
                    <i className="fa-solid fa-clock"></i>
                </div>

                <h2>¿Sigues ahí?</h2>

                <p>
                    Por seguridad, tu sesión se cerrará
                    automáticamente por inactividad en:
                </p>

                <div className="inactividad-contador">
                    {minutos}:{segundos}
                </div>

                <div className="inactividad-acciones">

                    <button
                        type="button"
                        className="inactividad-btn-cerrar"
                        onClick={cerrarSesionManual}
                    >
                        Cerrar sesión
                    </button>

                    <button
                        type="button"
                        className="inactividad-btn-seguir"
                        onClick={seguirEnSesion}
                    >
                        Sigo aquí
                    </button>

                </div>

            </div>

        </div>

    );

}

export default InactividadAviso;