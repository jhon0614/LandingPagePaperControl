const CLAVE_TEMA = "papercontrol-tema";

export function obtenerTemaGuardado() {
    try {
        const guardado = localStorage.getItem(CLAVE_TEMA);
        if (guardado === "dark" || guardado === "light") return guardado;
    } catch {
        // Sin acceso al almacenamiento: se usa el tema claro.
    }
    return "light";
}

export function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
}

export function guardarTema(tema) {
    try {
        localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
        // El tema sigue aplicado aunque no se pueda guardar.
    }
}