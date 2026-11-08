import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/CampoFecha.css";

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];

const ANCHO_CALENDARIO = 292;
const ALTO_CALENDARIO = 352;

function dosDigitos(n) {
    return String(n).padStart(2, "0");
}

function textoDesdeFecha(fecha) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

function fechaDesdeTexto(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || "")) {
        return null;
    }

    const [anio, mes, dia] = texto.split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    const valida =
        fecha.getFullYear() === anio &&
        fecha.getMonth() === mes - 1 &&
        fecha.getDate() === dia;

    return valida ? fecha : null;
}

function textoVisible(texto) {
    const fecha = fechaDesdeTexto(texto);

    if (!fecha) {
        return "";
    }

    return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function nombreMes(fecha) {
    const mes = MESES[fecha.getMonth()];
    return mes.charAt(0).toUpperCase() + mes.slice(1);
}

function primerDiaDelMes(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function CampoFecha({
    value = "",
    onChange,
    name,
    id,
    min,
    max,
    disabled = false,
    className = "",
    placeholder = "dd/mm/aaaa",
    ...resto
}) {
    const entradaRef = useRef(null);
    const calendarioRef = useRef(null);

    const [abierto, setAbierto] = useState(false);
    const [mesVisible, setMesVisible] = useState(() => primerDiaDelMes(new Date()));
    const [posicion, setPosicion] = useState({ top: 0, left: 0 });

    const fechaSeleccionada = fechaDesdeTexto(value);
    const fechaMinima = fechaDesdeTexto(min);
    const fechaMaxima = fechaDesdeTexto(max);

    const hoy = useMemo(() => {
        const ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    }, []);

    function calcularPosicion() {
        const entrada = entradaRef.current;

        if (!entrada) {
            return;
        }

        const caja = entrada.getBoundingClientRect();

        let left = Math.min(caja.left, window.innerWidth - ANCHO_CALENDARIO - 8);
        left = Math.max(8, left);

        const espacioAbajo = window.innerHeight - caja.bottom;

        const top =
            espacioAbajo >= ALTO_CALENDARIO + 8
                ? caja.bottom + 6
                : Math.max(8, caja.top - ALTO_CALENDARIO - 6);

        setPosicion({ top, left });
    }

    function abrir() {
        if (disabled) {
            return;
        }

        setMesVisible(primerDiaDelMes(fechaSeleccionada || hoy));
        calcularPosicion();
        setAbierto(true);
    }

    function cerrar() {
        setAbierto(false);
    }

    function emitir(nuevoValor) {
        if (onChange) {
            onChange({ target: { value: nuevoValor, name, id } });
        }
    }

    function estaDeshabilitado(fecha) {
        return (
            (fechaMinima && fecha < fechaMinima) ||
            (fechaMaxima && fecha > fechaMaxima)
        );
    }

    function seleccionar(fecha) {
        if (estaDeshabilitado(fecha)) {
            return;
        }

        emitir(textoDesdeFecha(fecha));
        cerrar();
        entradaRef.current?.focus();
    }

    function borrar() {
        emitir("");
        cerrar();
    }

    function irAHoy() {
        if (estaDeshabilitado(hoy)) {
            return;
        }

        seleccionar(hoy);
    }

    function cambiarMes(delta) {
        setMesVisible(
            (actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1)
        );
    }

    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        function alHacerClic(evento) {
            if (
                calendarioRef.current?.contains(evento.target) ||
                entradaRef.current?.contains(evento.target)
            ) {
                return;
            }

            cerrar();
        }

        function alPulsarTecla(evento) {
            if (evento.key === "Escape") {
                cerrar();
                entradaRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", alHacerClic);
        document.addEventListener("keydown", alPulsarTecla);
        window.addEventListener("resize", calcularPosicion);
        window.addEventListener("scroll", calcularPosicion, true);

        return () => {
            document.removeEventListener("mousedown", alHacerClic);
            document.removeEventListener("keydown", alPulsarTecla);
            window.removeEventListener("resize", calcularPosicion);
            window.removeEventListener("scroll", calcularPosicion, true);
        };
    }, [abierto]);

    /* 6 semanas completas, empezando en domingo */
    const celdas = useMemo(() => {
        const primero = primerDiaDelMes(mesVisible);
        const inicio = new Date(
            primero.getFullYear(),
            primero.getMonth(),
            1 - primero.getDay()
        );

        return Array.from({ length: 42 }, (_, indice) => {
            return new Date(
                inicio.getFullYear(),
                inicio.getMonth(),
                inicio.getDate() + indice
            );
        });
    }, [mesVisible]);

    const calendario = abierto && (
        <div
            ref={calendarioRef}
            className="campo-fecha-calendario"
            style={{ top: posicion.top, left: posicion.left }}
            role="dialog"
            aria-label="Seleccionar fecha"
        >
            <div className="campo-fecha-encabezado">
                <strong>
                    {nombreMes(mesVisible)} de {mesVisible.getFullYear()}
                </strong>

                <div className="campo-fecha-navegacion">
                    <button
                        type="button"
                        onClick={() => cambiarMes(-1)}
                        aria-label="Mes anterior"
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => cambiarMes(1)}
                        aria-label="Mes siguiente"
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="campo-fecha-semana">
                {DIAS.map((dia) => (
                    <span key={dia}>{dia}</span>
                ))}
            </div>

            <div className="campo-fecha-dias">
                {celdas.map((fecha) => {
                    const fueraDelMes = fecha.getMonth() !== mesVisible.getMonth();
                    const esHoy = fecha.getTime() === hoy.getTime();
                    const esSeleccionado =
                        fechaSeleccionada &&
                        fecha.getTime() === fechaSeleccionada.getTime();
                    const bloqueado = estaDeshabilitado(fecha);

                    const clases = [
                        "campo-fecha-dia",
                        fueraDelMes ? "fuera-del-mes" : "",
                        esHoy ? "es-hoy" : "",
                        esSeleccionado ? "seleccionado" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <button
                            key={fecha.getTime()}
                            type="button"
                            className={clases}
                            disabled={Boolean(bloqueado)}
                            onClick={() => seleccionar(fecha)}
                        >
                            {fecha.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="campo-fecha-pie">
                <button type="button" onClick={borrar}>
                    Borrar
                </button>

                <button type="button" onClick={irAHoy} disabled={Boolean(estaDeshabilitado(hoy))}>
                    Hoy
                </button>
            </div>
        </div>
    );

    return (
        <>
            <input
                {...resto}
                ref={entradaRef}
                id={id}
                name={name}
                type="text"
                readOnly
                disabled={disabled}
                autoComplete="off"
                inputMode="none"
                placeholder={placeholder}
                value={textoVisible(value)}
                className={`campo-fecha-entrada ${className}`.trim()}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                onClick={abrir}
                onKeyDown={(evento) => {
                    if (
                        evento.key === "Enter" ||
                        evento.key === " " ||
                        evento.key === "ArrowDown"
                    ) {
                        evento.preventDefault();
                        abrir();
                    }

                    if (
                        (evento.key === "Backspace" || evento.key === "Delete") &&
                        value
                    ) {
                        evento.preventDefault();
                        emitir("");
                    }
                }}
            />

            {calendario && createPortal(calendario, document.body)}
        </>
    );
}

export default CampoFecha;
