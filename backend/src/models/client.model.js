import { limiteSql, busquedaSql } from "../utils/query.js";
// Consultas de persistencia del módulo de clientes.
export class ModeloCliente {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async buscarPorDocumento(tipoDocumento, numeroDocumento) {
    const [filas] = await this.conexiones.execute(
      `SELECT id, tipo_documento, numero_documento, nombres, apellidos,
              correo, telefono, direccion, esta_activo, creado_en
         FROM clientes
        WHERE tipo_documento = ? AND numero_documento = ?
          AND eliminado_en IS NULL
        LIMIT 1`,
      [tipoDocumento, numeroDocumento],
    );

    return filas[0] ?? null;
  }

  async buscarOtroPorDocumento(tipoDocumento, numeroDocumento, clienteId) {
    // Excluye al cliente editado, pero incluye eliminados porque estos todavía
    // participan en la restricción única definida en MySQL.
    const [filas] = await this.conexiones.execute(
      `SELECT id, eliminado_en
         FROM clientes
        WHERE tipo_documento = ?
          AND numero_documento = ?
          AND id <> ?
        LIMIT 1`,
      [tipoDocumento, numeroDocumento, clienteId],
    );

    return filas[0] ?? null;
  }

  async buscarPorId(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT c.id, c.tipo_documento, c.numero_documento, c.nombres,
              c.apellidos, c.correo, c.telefono, c.direccion,
              c.esta_activo, c.creado_en,
              COUNT(v.id) AS cantidad_compras,
              COALESCE(SUM(v.monto_total), 0) AS total_comprado,
              MAX(v.confirmado_en) AS ultima_compra
         FROM clientes c
         LEFT JOIN ventas v
           ON v.cliente_id = c.id AND v.estado = 'CONFIRMADA'
        WHERE c.id = ? AND c.eliminado_en IS NULL
        GROUP BY c.id
        LIMIT 1`,
      [id],
    );

    return filas[0] ?? null;
  }

  async crear({
    tipoDocumento,
    numeroDocumento,
    nombres,
    apellidos,
    correo,
    telefono,
    direccion,
  }) {
    const [resultado] = await this.conexiones.execute(
      `INSERT INTO clientes
         (tipo_documento, numero_documento, nombres, apellidos,
          correo, telefono, direccion, esta_activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        tipoDocumento,
        numeroDocumento,
        nombres,
        apellidos,
        correo,
        telefono,
        direccion,
      ],
    );

    return this.buscarPorId(resultado.insertId);
  }

  async actualizarEstado(id, estaActivo) {
    await this.conexiones.execute(
      `UPDATE clientes
          SET esta_activo = ?
        WHERE id = ? AND eliminado_en IS NULL`,
      [estaActivo, id],
    );

    return this.buscarPorId(id);
  }

  async buscar(termino, limite = 500, incluirInactivos = false, filtros = {}) {
    const busqueda = busquedaSql(termino, ["c.numero_documento", "CONCAT_WS(' ', c.nombres, c.apellidos)", "c.telefono", "c.correo"]);

    const [filas] = await this.conexiones.execute(
      `SELECT c.id, c.tipo_documento, c.numero_documento, c.nombres,
              c.apellidos, c.correo, c.telefono, c.direccion,
              c.esta_activo, c.creado_en,
              COUNT(v.id) AS cantidad_compras,
              COALESCE(SUM(v.monto_total), 0) AS total_comprado,
              MAX(v.confirmado_en) AS ultima_compra
         FROM clientes c
         LEFT JOIN ventas v
           ON v.cliente_id = c.id AND v.estado = 'CONFIRMADA'
        WHERE c.eliminado_en IS NULL
          ${incluirInactivos ? "" : "AND c.esta_activo = TRUE"}
          ${busqueda.sql}
        GROUP BY c.id
        ORDER BY CASE WHEN c.numero_documento = ? THEN 0 ELSE 1 END,
                 c.nombres, c.apellidos, c.id
        ${limiteSql({ ...filtros, limite })}`,
      [...busqueda.parametros, termino ?? ""],
    );

    return filas;
  }

  async actualizar(
    id,
    {
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidos,
      correo,
      telefono,
      direccion,
    },
  ) {
    // El contrato JavaScript usa camelCase; aquí se traduce a las columnas
    // snake_case definidas en MySQL.
    await this.conexiones.execute(
      `UPDATE clientes
          SET tipo_documento = ?,
              numero_documento = ?,
              nombres = ?,
              apellidos = ?,
              correo = ?,
              telefono = ?,
              direccion = ?
        WHERE id = ?
          AND eliminado_en IS NULL`,
      [
        tipoDocumento,
        numeroDocumento,
        nombres,
        apellidos,
        correo,
        telefono,
        direccion,
        id,
      ],
    );
    // Devuelve la fila persistida para construir la respuesta de la API.
    return this.buscarPorId(id);
  }

  async eliminarLogicamente(id) {
    // Los clientes pueden estar referenciados por ventas históricas. Por eso
    // se ocultan del uso operativo sin eliminar físicamente la fila.
    const [resultado] = await this.conexiones.execute(
      `UPDATE clientes
          SET esta_activo = FALSE,
              eliminado_en = CURRENT_TIMESTAMP
        WHERE id = ?
          AND eliminado_en IS NULL`,
      [id],
    );

    return resultado.affectedRows > 0;
  }
}
