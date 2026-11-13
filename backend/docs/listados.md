# Paginacion y busqueda de listados

Los endpoints GET `/api/usuarios`, `/api/proveedores`, `/api/productos` y
`/api/clientes` admiten `pagina`, `limite` y `buscar` combinados:

```text
/api/clientes?pagina=1&limite=50&buscar=Laura
/api/productos?pagina=2&limite=50&buscar=cuaderno&categoriaId=3
```

`pagina` va de 1 a 10000; `limite`, de 1 a 500. Los valores predeterminados
son pagina 1 y limite 500. Si se omiten ambos parametros y hay mas de 500
coincidencias, se devuelve HTTP 422 con `PAGINACION_REQUERIDA`.

La respuesta conserva el arreglo en `datos.usuarios`, `datos.proveedores`,
`datos.productos` o `datos.clientes`, y agrega:

```json
{ "pagina": 1, "limite": 50, "hayMas": true }
```

Este objeto esta en `datos.paginacion`; no representa un conteo total.
Al cambiar la busqueda o los filtros, el frontend debe volver a pagina 1.

`buscar` admite hasta 100 caracteres y busca coincidencias parciales antes
de paginar. Un texto vacio no filtra; `%` y `_` se buscan literalmente.
Mayusculas y tildes siguen la intercalacion de MySQL de las columnas.

| Listado | Campos buscados |
| --- | --- |
| Usuarios | Nombre completo, correo |
| Proveedores | Nombre, contacto, documento, correo, telefono |
| Productos | Nombre, SKU, codigo de barras, descripcion, categoria |
| Clientes | Nombre completo, documento, telefono, correo |

Se mantienen los permisos existentes y la exclusion de registros eliminados.
Productos conserva `categoriaId` e `incluirInactivos`. Clientes conserva
`incluirInactivos=true` solo para ADMINISTRADOR y DUENO; VENDEDOR consulta
unicamente clientes activos. Clientes ya no tiene el tope anterior de 100.

No requiere migraciones ni cambios de esquema.
