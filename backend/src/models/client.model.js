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

  async buscarPorId(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT id, tipo_documento, numero_documento, nombres, apellidos,
              correo, telefono, direccion, esta_activo, creado_en
         FROM clientes
        WHERE id = ? AND eliminado_en IS NULL
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

    const [filas] = await this.conexiones.execute(
      `SELECT id, tipo_documento, numero_documento, nombres, apellidos,
              correo, telefono, direccion, esta_activo, creado_en
         FROM clientes WHERE id = ? LIMIT 1`,
      [resultado.insertId],
    );

    return filas[0];
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

  async buscar(termino, limite = 20) {
    const patron = `%${termino}%`;
    // se convierte limite a número y se aplica límites de 1 a 100
    const limiteSeguro = Math.min(
      Math.max(Number.parseInt(limite, 10) || 20, 1), // si no se envía un número, se toma 20
      100, // 100 es el límite máximo
    );

    const [filas] = await this.conexiones.execute(
      `SELECT id, tipo_documento, numero_documento, nombres, apellidos,
              correo, telefono, direccion, esta_activo, creado_en
         FROM clientes
        WHERE eliminado_en IS NULL
          AND esta_activo = TRUE
          AND (
            numero_documento LIKE ?
            OR nombres LIKE ?
            OR apellidos LIKE ?
            OR telefono LIKE ?
            OR correo LIKE ?
        )
        ORDER BY CASE WHEN numero_documento = ? THEN 0 ELSE 1 END,
                 nombres, apellidos
        LIMIT ${limiteSeguro}`, //se ordena primero por documento, luego nombre y por último apellido
      [patron, patron, patron, patron, patron, termino],
    );

    return filas;
  }
}
