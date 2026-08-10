const API_URL = import.meta.env.VITE_API_URL;

export async function login(correo, contrasena) {

  const respuesta = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        correo,
        contrasena,
      }),
    }
  );


  let datos = null;

  try {

    datos = await respuesta.json();

  } catch {

    datos = null;

  }


  if (!respuesta.ok) {

    const mensaje =
      datos?.error?.mensaje ||
      datos?.mensaje ||
      "No fue posible iniciar sesión.";

    throw new Error(mensaje);

  }


  return datos;
}