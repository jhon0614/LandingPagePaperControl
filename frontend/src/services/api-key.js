// VITE_API_KEY es publica: identifica el cliente, no autentica al usuario.
export function cabecerasApi(headers = {}) {
    const clave = import.meta.env.VITE_API_KEY;
    return { ...headers, ...(clave ? { "X-API-Key": clave } : {}) };
}
