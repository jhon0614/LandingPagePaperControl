import { apiFetch } from "./api";

const REGISTROS_POR_PAGINA = 500;
const MAXIMO_PAGINAS = 100;

export async function obtenerTodasLasPaginas(ruta, clave, parametros = {}) {

    const registros = [];

    for (let pagina = 1; pagina <= MAXIMO_PAGINAS; pagina++) {

        const consulta = new URLSearchParams({
            ...parametros,
            pagina: String(pagina),
            limite: String(REGISTROS_POR_PAGINA),
        });

        const respuesta = await apiFetch(`${ruta}?${consulta}`);

        registros.push(...(respuesta.datos[clave] || []));

        if (!respuesta.datos.paginacion?.hayMas) {
            break;
        }

    }

    return registros;

}