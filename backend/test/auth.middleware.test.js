import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { crearMiddlewareAutenticacion } from "../src/middleware/auth.middleware.js";

const secreto = "a-secure-test-secret-with-more-than-32-characters";

// Simula una solicitud autenticada para probar el cambio obligatorio sin servidor.
async function ejecutar({ originalUrl, debeCambiarContrasena }) {
  const token = jwt.sign({}, secreto, { subject: "2", expiresIn: "15m" });
  const solicitud = {
    originalUrl,
    get: (nombre) => nombre === "authorization" ? `Bearer ${token}` : undefined,
  };
  let errorRecibido;
  let permitioContinuar = false;
  const autenticar = crearMiddlewareAutenticacion({
    secretoAcceso: secreto,
    modeloUsuario: {
      buscarPorId: async () => ({
        id: 2,
        correo: "user@papercontrol.local",
        rol: "VENDEDOR",
        esta_activo: true,
        debe_cambiar_contrasena: debeCambiarContrasena,
      }),
    },
  });

  await autenticar(solicitud, {}, (error) => {
    errorRecibido = error;
    permitioContinuar = !error;
  });

  return { solicitud, errorRecibido, permitioContinuar };
}

test("una contraseña temporal bloquea los demás módulos protegidos", async () => {
  const resultado = await ejecutar({
    originalUrl: "/api/usuarios",
    debeCambiarContrasena: true,
  });

  assert.equal(resultado.permitioContinuar, false);
  assert.equal(resultado.errorRecibido.estadoHttp, 403);
  assert.equal(resultado.errorRecibido.codigo, "CAMBIO_CONTRASENA_REQUERIDO");
});

test("una contraseña temporal permite entrar a la ruta para cambiarla", async () => {
  const resultado = await ejecutar({
    originalUrl: "/api/auth/contrasena",
    debeCambiarContrasena: true,
  });

  assert.equal(resultado.permitioContinuar, true);
  assert.equal(resultado.solicitud.usuario.id, 2);
});
