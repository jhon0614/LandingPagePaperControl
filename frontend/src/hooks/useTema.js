import { useState } from "react";
import { aplicarTema, guardarTema, obtenerTemaGuardado } from "../utils/tema";

function useTema() {
    const [tema, setTema] = useState(obtenerTemaGuardado);

    function alternarTema() {
        const nuevo = tema === "dark" ? "light" : "dark";
        aplicarTema(nuevo);
        guardarTema(nuevo);
        setTema(nuevo);
    }

    return { tema, alternarTema };
}

export default useTema;