import { useState } from "react";
import "../styles/Caja.css";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_LIMITE = 7;

function AvisoTurnoLargo({ turno }) {

    const [ahora] = useState(() => Date.now());

    if (!turno?.abiertoEn) return null;

    const dias = Math.floor(
        (ahora - new Date(turno.abiertoEn).getTime()) / MS_POR_DIA
    );

    if (dias < 1) return null;

    const vencido = dias >= DIAS_LIMITE;

    const desde = new Date(turno.abiertoEn).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (

        <div
            className={
                vencido
                    ? "caja-aviso-turno caja-aviso-turno-vencido"
                    : "caja-aviso-turno"
            }
            role="alert"
        >

            <i className="fa-solid fa-triangle-exclamation"></i>

            <p>
                <strong>
                    El turno de caja lleva {dias} {dias === 1 ? "día" : "días"} abierto
                </strong>
                {" "}
                (abierto por {turno.usuarioNombre || "—"} el {desde}).
                {vencido
                    ? " Superó el máximo de 7 días: ciérralo cuanto antes."
                    : " Recuerda cerrar la caja al terminar el turno; no debe pasar de 7 días."}
                {" "}
                Mientras siga abierto, las ventas y los gastos de todos los
                usuarios se acumulan en él.
            </p>

        </div>

    );

}

export default AvisoTurnoLargo;