import { useEffect, useState } from "react";

import Layout from "../components/Layout";

import {
    obtenerUsuarios,
    obtenerRoles,
    crearUsuario as crearUsuarioApi,
    actualizarUsuario as actualizarUsuarioApi,
    cambiarEstadoUsuario as cambiarEstadoUsuarioApi,
    desbloquearUsuario as desbloquearUsuarioApi,
    enviarRestablecimientoUsuario as enviarRestablecimientoUsuarioApi,
    eliminarUsuario as eliminarUsuarioApi,
} from "../services/usuarios.service";

import "../styles/Dashboard.css";
import "../styles/Usuarios.css";


function Usuarios() {

    /*
     * USUARIO EN SESIÓN
     */

    const usuarioEnSesion = JSON.parse(
        localStorage.getItem("usuario")
    );

    const idUsuarioEnSesion =
        usuarioEnSesion?.id ?? null;


    /*
     * ESTADOS
     */

    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [usuarioEditando, setUsuarioEditando] =
        useState(null);

    const [modalNuevoUsuario, setModalNuevoUsuario] =
        useState(false);

    const [formulario, setFormulario] = useState({
        nombres: "",
        apellidos: "",
        correo: "",
        contrasenaTemporal: "",
        rolId: "",
    });

    const [guardando, setGuardando] =
        useState(false);

    const [cambiandoEstado, setCambiandoEstado] =
        useState(null);

    const [desbloqueandoUsuario, setDesbloqueandoUsuario] =
        useState(null);


    /*
     * CARGAR DATOS
     */

    useEffect(() => {

        cargarDatos();

    }, []);


    async function cargarDatos() {

        try {

            setCargando(true);
            setError("");

            const [
                usuariosObtenidos,
                rolesObtenidos,
            ] = await Promise.all([
                obtenerUsuarios(),
                obtenerRoles(),
            ]);

            setUsuarios(
                usuariosObtenidos || []
            );

            setRoles(
                rolesObtenidos || []
            );

        } catch (error) {

            console.error(
                "Error cargando usuarios:",
                error
            );

            manejarError(error);

        } finally {

            setCargando(false);

        }

    }


    /*
     * MANEJO DE ERRORES
     */

    function manejarError(error) {

        if (error?.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.hash = "#/login";

            return;

        }


        if (error?.status === 403) {

            setError(
                error.message ||
                "No tienes permisos para realizar esta acción."
            );

            return;

        }


        setError(
            error?.message ||
            "Ocurrió un error al realizar la operación."
        );

    }


    /*
     * VERIFICAR SI ES EL USUARIO EN SESIÓN
     */

    function esUsuarioEnSesion(usuario) {

        return (
            idUsuarioEnSesion !== null &&
            usuario?.id === idUsuarioEnSesion
        );

    }


    function usuarioEstaBloqueado(usuario) {

        if (!usuario?.bloqueadoHasta) {
            return false;
        }

        return new Date(usuario.bloqueadoHasta) > new Date();

    }


    /*
     * ABRIR NUEVO USUARIO
     */

    function abrirNuevoUsuario() {

        setError("");

        setUsuarioEditando(null);

        setFormulario({
            nombres: "",
            apellidos: "",
            correo: "",
            contrasenaTemporal: "",
            rolId: "",
        });

        setModalNuevoUsuario(true);

    }


    /*
     * CERRAR NUEVO USUARIO
     */

    function cerrarNuevoUsuario() {

        if (guardando) {
            return;
        }

        setModalNuevoUsuario(false);

        setFormulario({
            nombres: "",
            apellidos: "",
            correo: "",
            contrasenaTemporal: "",
            rolId: "",
        });

    }


    /*
     * ABRIR EDITAR USUARIO
     */

    function abrirEditarUsuario(usuario) {

        setError("");

        setModalNuevoUsuario(false);

        setUsuarioEditando(usuario);

        setFormulario({
            nombres:
                usuario?.nombres || "",

            apellidos:
                usuario?.apellidos || "",

            correo:
                usuario?.correo || "",

            contrasenaTemporal:
                "",

            rolId:
                usuario?.rol?.id || "",
        });

    }


    /*
     * CERRAR EDITAR USUARIO
     */

    function cerrarEditarUsuario() {

        if (guardando) {
            return;
        }

        setUsuarioEditando(null);

        setFormulario({
            nombres: "",
            apellidos: "",
            correo: "",
            contrasenaTemporal: "",
            rolId: "",
        });

    }


    /*
     * CAMBIO DEL FORMULARIO
     */

    function manejarCambioFormulario(e) {

        const {
            name,
            value,
        } = e.target;


        setFormulario(
            (formularioActual) => ({
                ...formularioActual,
                [name]: value,
            })
        );

    }


    /*
     * CREAR USUARIO
     */

    async function guardarNuevoUsuario(e) {

        e.preventDefault();

        setError("");


        if (!formulario.nombres.trim()) {

            setError(
                "El nombre es obligatorio."
            );

            return;

        }


        if (!formulario.apellidos.trim()) {

            setError(
                "Los apellidos son obligatorios."
            );

            return;

        }


        if (!formulario.correo.trim()) {

            setError(
                "El correo es obligatorio."
            );

            return;

        }


        if (!formulario.contrasenaTemporal) {

            setError(
                "La contraseña temporal es obligatoria."
            );

            return;

        }


        if (!formulario.rolId) {

            setError(
                "Debes seleccionar un rol."
            );

            return;

        }


        try {

            setGuardando(true);


            const usuarioCreado =
                await crearUsuarioApi({

                    nombres:
                        formulario.nombres.trim(),

                    apellidos:
                        formulario.apellidos.trim(),

                    correo:
                        formulario.correo.trim(),

                    contrasenaTemporal:
                        formulario.contrasenaTemporal,

                    rolId:
                        formulario.rolId,

                });


            setUsuarios(
                (usuariosActuales) => [
                    ...usuariosActuales,
                    usuarioCreado,
                ]
            );


            cerrarNuevoUsuario();


        } catch (error) {

            console.error(
                "Error creando usuario:",
                error
            );

            manejarError(error);

        } finally {

            setGuardando(false);

        }

    }


    /*
     * EDITAR USUARIO
     */

    async function guardarCambios(e) {

        e.preventDefault();

        setError("");


        if (!usuarioEditando) {
            return;
        }


        if (!formulario.nombres.trim()) {

            setError(
                "El nombre es obligatorio."
            );

            return;

        }


        if (!formulario.apellidos.trim()) {

            setError(
                "Los apellidos son obligatorios."
            );

            return;

        }


        if (!formulario.correo.trim()) {

            setError(
                "El correo es obligatorio."
            );

            return;

        }


        if (!formulario.rolId) {

            setError(
                "Debes seleccionar un rol."
            );

            return;

        }


        const editandoPropiaCuenta =
            esUsuarioEnSesion(
                usuarioEditando
            );


        try {

            setGuardando(true);


            const datosActualizar = {

                nombres:
                    formulario.nombres.trim(),

                apellidos:
                    formulario.apellidos.trim(),

                correo:
                    formulario.correo.trim(),

            };


            /*
             * No permitimos enviar rolId cuando
             * se está editando la propia cuenta.
             */

            if (!editandoPropiaCuenta) {

                datosActualizar.rolId =
                    formulario.rolId;

            }


            const usuarioActualizado =
                await actualizarUsuarioApi(
                    usuarioEditando.id,
                    datosActualizar
                );


            setUsuarios(
                (usuariosActuales) =>
                    usuariosActuales.map(
                        (usuario) =>
                            usuario.id ===
                            usuarioEditando.id
                                ? usuarioActualizado
                                : usuario
                    )
            );


            cerrarEditarUsuario();


        } catch (error) {

            console.error(
                "Error actualizando usuario:",
                error
            );

            manejarError(error);

        } finally {

            setGuardando(false);

        }

    }


    /*
     * ACTIVAR / DESACTIVAR USUARIO
     */

    async function cambiarEstadoUsuario(usuario) {

        if (esUsuarioEnSesion(usuario)) {
            return;
        }


        const nuevoEstado =
            !usuario.estaActivo;


        const accion =
            nuevoEstado
                ? "reactivar"
                : "desactivar";


        const confirmar =
            window.confirm(
                `¿Seguro que deseas ${accion} a ${usuario.nombres} ${usuario.apellidos}?`
            );


        if (!confirmar) {
            return;
        }


        try {

            setError("");

            setCambiandoEstado(
                usuario.id
            );


            const usuarioActualizado =
                await cambiarEstadoUsuarioApi(
                    usuario.id,
                    nuevoEstado
                );


            setUsuarios(
                (usuariosActuales) =>
                    usuariosActuales.map(
                        (usuarioActual) =>
                            usuarioActual.id ===
                            usuario.id
                                ? usuarioActualizado
                                : usuarioActual
                    )
            );


        } catch (error) {

            console.error(
                "Error cambiando estado:",
                error
            );

            manejarError(error);

        } finally {

            setCambiandoEstado(null);

        }

    }


    /*
     * DESBLOQUEAR CUENTA
     *
     * Esta función solamente cambia el estado de
     * bloqueo de la cuenta.
     *
     * El backend es quien realmente debe ejecutar
     * el desbloqueo y reiniciar los datos de seguridad.
     */

    async function desbloquearUsuario(usuario) {

        if (esUsuarioEnSesion(usuario)) {

            /*
             * Aunque técnicamente el administrador podría
             * desbloquear su propia cuenta, no tiene sentido
             * hacerlo desde esta pantalla porque si está
             * conectado su cuenta ya está permitiendo acceso.
             */

            return;

        }


        const confirmar =
            window.confirm(
                `¿Seguro que deseas desbloquear la cuenta de ${usuario.nombres} ${usuario.apellidos}?`
            );


        if (!confirmar) {
            return;
        }


        try {

            setError("");

            setDesbloqueandoUsuario(
                usuario.id
            );


            const usuarioActualizado =
                await desbloquearUsuarioApi(
                    usuario.id
                );


            setUsuarios(
                (usuariosActuales) =>
                    usuariosActuales.map(
                        (usuarioActual) =>
                            usuarioActual.id ===
                            usuario.id
                                ? usuarioActualizado
                                : usuarioActual
                    )
            );


        } catch (error) {

            console.error(
                "Error desbloqueando usuario:",
                error
            );

            manejarError(error);

        } finally {

            setDesbloqueandoUsuario(null);

        }

    }

    /*
    =========================================================
    ENVIAR RESTABLECIMIENTO DE CONTRASEÑA
    =========================================================
    */

    async function enviarRestablecimiento(usuario) {

        const confirmar = window.confirm(
            `Se enviará un correo de restablecimiento a ${usuario.correo}. ¿Deseas continuar?`
        );

        if (!confirmar) return;

        try {

            await enviarRestablecimientoUsuarioApi(usuario.id);

            alert(
                "Las instrucciones fueron enviadas al correo registrado."
            );

        } catch (error) {

            console.error(error);
            manejarError(error);

        }

    }


    /*
     * ELIMINAR USUARIO
     */

    async function eliminarUsuario(usuario) {

        if (esUsuarioEnSesion(usuario)) {
            return;
        }


        const confirmar =
            window.confirm(
                `¿Seguro que deseas eliminar a ${usuario.nombres} ${usuario.apellidos}?`
            );


        if (!confirmar) {
            return;
        }


        try {

            setError("");


            await eliminarUsuarioApi(
                usuario.id
            );


            setUsuarios(
                (usuariosActuales) =>
                    usuariosActuales.filter(
                        (usuarioActual) =>
                            usuarioActual.id !==
                            usuario.id
                    )
            );


        } catch (error) {

            console.error(
                "Error eliminando usuario:",
                error
            );

            manejarError(error);

        }

    }


    /*
     * LISTAS
     */

    const usuariosActivos =
        usuarios.filter(
            (usuario) =>
                usuario.estaActivo
        );


    const usuariosInactivos =
        usuarios.filter(
            (usuario) =>
                !usuario.estaActivo
        );


    const usuariosBloqueados =
        usuarios.filter(
            (usuario) =>
                usuarioEstaBloqueado(usuario)
        );


    const modalAbierto =
        modalNuevoUsuario ||
        usuarioEditando;


    const editandoPropiaCuentaEnModal =
        usuarioEditando &&
        esUsuarioEnSesion(
            usuarioEditando
        );


    return (

        <Layout>

            {/* HEADER */}

            <div className="usuarios-header">

                <div>

                    <h1>
                        Usuarios
                    </h1>

                    <p className="dashboard-subtitle">
                        Gestiona los usuarios de PaperControl.
                    </p>

                </div>


                <button
                    className="btn-nuevo"
                    type="button"
                    onClick={abrirNuevoUsuario}
                >

                    <i className="fa-solid fa-user-plus"></i>

                    Nuevo usuario

                </button>

            </div>


            {/* ERROR */}

            {error && (

                <div className="usuarios-error">

                    <i className="fa-solid fa-circle-exclamation"></i>

                    {error}

                </div>

            )}


            {cargando ? (

                <div className="usuarios-cargando">

                    <i className="fa-solid fa-spinner fa-spin"></i>

                    Cargando usuarios...

                </div>

            ) : (

                <>

                    {/* ESTADÍSTICAS */}

                    <div className="usuarios-info">

                        <div className="card-estadistica">

                            <i className="fa-solid fa-users"></i>

                            <h3>
                                {usuarios.length}
                            </h3>

                            <p>
                                Usuarios
                            </p>

                        </div>


                        <div className="card-estadistica">

                            <i className="fa-solid fa-user-check"></i>

                            <h3>
                                {usuariosActivos.length}
                            </h3>

                            <p>
                                Usuarios activos
                            </p>

                        </div>


                        <div className="card-estadistica">

                            <i className="fa-solid fa-user-slash"></i>

                            <h3>
                                {usuariosInactivos.length}
                            </h3>

                            <p>
                                Usuarios inactivos
                            </p>

                        </div>


                        <div className="card-estadistica">

                            <i className="fa-solid fa-user-shield"></i>

                            <h3>
                                {roles.length}
                            </h3>

                            <p>
                                Roles disponibles
                            </p>

                        </div>


                        <div className="card-estadistica">

                            <i className="fa-solid fa-lock"></i>

                            <h3>
                                {usuariosBloqueados.length}
                            </h3>

                            <p>
                                Cuentas bloqueadas
                            </p>

                        </div>

                    </div>


                    {/* USUARIOS ACTIVOS */}

                    <div className="usuarios-seccion">

                        <div className="usuarios-seccion-header">

                            <div>

                                <h2>

                                    <span className="usuarios-titulo-activos">

                                        <span className="usuarios-punto activo"></span>

                                        Usuarios activos

                                    </span>

                                </h2>

                                <p>
                                    Usuarios que pueden acceder al sistema.
                                </p>

                            </div>


                            <span className="usuarios-contador activo">

                                {usuariosActivos.length}

                            </span>

                        </div>


                        <div className="tabla-usuarios-container">

                            <table className="tabla-usuarios">

                                <thead>

                                    <tr>

                                        <th>
                                            Nombre
                                        </th>

                                        <th>
                                            Correo
                                        </th>

                                        <th>
                                            Rol
                                        </th>

                                        <th>
                                            Intentos
                                        </th>

                                        <th>
                                            Estado
                                        </th>

                                        <th>
                                            Acciones
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {usuariosActivos.length === 0 ? (

                                        <tr>

                                            <td
                                                colSpan="6"
                                                className="usuarios-vacio"
                                            >
                                                No hay usuarios activos.
                                            </td>

                                        </tr>

                                    ) : (

                                        usuariosActivos.map(
                                            (usuario) => {

                                                const esPropia =
                                                    esUsuarioEnSesion(
                                                        usuario
                                                    );

                                                const bloqueado =
                                                    usuarioEstaBloqueado(
                                                        usuario
                                                    );


                                                return (

                                                    <tr
                                                        key={
                                                            usuario.id
                                                        }
                                                    >

                                                        <td>

                                                            <div className="usuario-nombre">

                                                                <div className="usuario-avatar">

                                                                    {usuario.nombres
                                                                        ?.charAt(0)
                                                                        ?.toUpperCase()}

                                                                </div>


                                                                <div>

                                                                    <strong>

                                                                        {usuario.nombres}{" "}

                                                                        {usuario.apellidos}


                                                                        {esPropia && (

                                                                            <span className="usuario-tu-cuenta">

                                                                                (Tú)

                                                                            </span>

                                                                        )}

                                                                    </strong>

                                                                </div>

                                                            </div>

                                                        </td>


                                                        <td>
                                                            {usuario.correo}
                                                        </td>


                                                        <td>

                                                            <span className="badge-rol">

                                                                {usuario.rol?.nombre}

                                                            </span>

                                                        </td>
                                                        
                                                            <td>
                                                                <span className="badge-intentos">
                                                                    {usuario.intentosAccesoFallidos ?? 0}
                                                                </span>
                                                            </td>

                                                        <td>

                                                            {bloqueado ? (

                                                                <span className="estado-bloqueado">

                                                                    <i className="fa-solid fa-lock"></i>

                                                                    Bloqueado

                                                                </span>

                                                            ) : (

                                                                <span className="estado-activo">

                                                                    Activo

                                                                </span>

                                                            )}

                                                        </td>


                                                        <td>

                                                            <div className="acciones-usuario">

                                                                <button
                                                                    type="button"
                                                                    className="btn-editar"
                                                                    title="Editar usuario"
                                                                    onClick={() =>
                                                                        abrirEditarUsuario(
                                                                            usuario
                                                                        )
                                                                    }
                                                                >

                                                                    <i className="fa-solid fa-pen"></i>

                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn-restablecer"
                                                                    title="Enviar restablecimiento"
                                                                    onClick={() => enviarRestablecimiento(usuario)}
                                                                >
                                                                    <i className="fa-solid fa-key"></i>
                                                                </button>


                                                                {bloqueado ? (

                                                                    <button
                                                                        type="button"
                                                                        className="btn-desbloquear"
                                                                        title={
                                                                            esPropia
                                                                                ? "No puedes desbloquear tu propia cuenta desde aquí"
                                                                                : "Desbloquear usuario"
                                                                        }
                                                                        disabled={
                                                                            esPropia ||
                                                                            desbloqueandoUsuario ===
                                                                            usuario.id
                                                                        }
                                                                        onClick={() =>
                                                                            desbloquearUsuario(
                                                                                usuario
                                                                            )
                                                                        }
                                                                    >

                                                                        {desbloqueandoUsuario ===
                                                                        usuario.id ? (

                                                                            <i className="fa-solid fa-spinner fa-spin"></i>

                                                                        ) : (

                                                                            <i className="fa-solid fa-lock-open"></i>

                                                                        )}

                                                                    </button>

                                                                ) : (

                                                                    <button
                                                                        type="button"
                                                                        className="btn-desactivar"
                                                                        title={
                                                                            esPropia
                                                                                ? "No puedes desactivar tu propia cuenta"
                                                                                : "Desactivar usuario"
                                                                        }
                                                                        disabled={
                                                                            esPropia ||
                                                                            cambiandoEstado ===
                                                                            usuario.id
                                                                        }
                                                                        onClick={() =>
                                                                            cambiarEstadoUsuario(
                                                                                usuario
                                                                            )
                                                                        }
                                                                    >

                                                                        {cambiandoEstado ===
                                                                        usuario.id ? (

                                                                            <i className="fa-solid fa-spinner fa-spin"></i>

                                                                        ) : (

                                                                            <i className="fa-solid fa-user-slash"></i>

                                                                        )}

                                                                    </button>

                                                                )}


                                                                <button
                                                                    type="button"
                                                                    className="btn-eliminar"
                                                                    title={
                                                                        esPropia
                                                                            ? "No puedes eliminar tu propia cuenta"
                                                                            : "Eliminar usuario"
                                                                    }
                                                                    disabled={
                                                                        esPropia
                                                                    }
                                                                    onClick={() =>
                                                                        eliminarUsuario(
                                                                            usuario
                                                                        )
                                                                    }
                                                                >

                                                                    <i className="fa-solid fa-trash"></i>

                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>

                                                );

                                            }
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>


                    {/* USUARIOS INACTIVOS */}

                    <div className="usuarios-seccion usuarios-seccion-inactivos">

                        <div className="usuarios-seccion-header">

                            <div>

                                <h2>

                                    <span className="usuarios-titulo-inactivos">

                                        <span className="usuarios-punto inactivo"></span>

                                        Usuarios inactivos

                                    </span>

                                </h2>

                                <p>
                                    Usuarios que no pueden acceder al sistema.
                                </p>

                            </div>


                            <span className="usuarios-contador inactivo">

                                {usuariosInactivos.length}

                            </span>

                        </div>


                        <div className="tabla-usuarios-container">

                            <table className="tabla-usuarios">

                                <thead>

                                    <tr>

                                        <th>
                                            Nombre
                                        </th>

                                        <th>
                                            Correo
                                        </th>

                                        <th>
                                            Rol
                                        </th>

                                        <th>
                                            Estado
                                        </th>

                                        <th>
                                            Acciones
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {usuariosInactivos.length === 0 ? (

                                        <tr>

                                            <td
                                                colSpan="6"
                                                className="usuarios-vacio"
                                            >
                                                No hay usuarios inactivos.
                                            </td>

                                        </tr>

                                    ) : (

                                        usuariosInactivos.map(
                                            (usuario) => (

                                                <tr
                                                    key={
                                                        usuario.id
                                                    }
                                                >

                                                    <td>

                                                        <div className="usuario-nombre">

                                                            <div className="usuario-avatar inactivo">

                                                                {usuario.nombres
                                                                    ?.charAt(0)
                                                                    ?.toUpperCase()}

                                                            </div>


                                                            <div>

                                                                <strong>

                                                                    {usuario.nombres}{" "}

                                                                    {usuario.apellidos}

                                                                </strong>

                                                            </div>

                                                        </div>

                                                    </td>


                                                    <td>
                                                        {usuario.correo}
                                                    </td>


                                                    <td>

                                                        <span className="badge-rol">

                                                            {usuario.rol?.nombre}

                                                        </span>

                                                    </td>

                                                        <td>
                                                            <span className="badge-intentos">
                                                                {usuario.intentosAccesoFallidos ?? 0}
                                                            </span>
                                                        </td>

                                                    <td>

                                                        <span className="estado-inactivo">

                                                            Inactivo

                                                        </span>

                                                    </td>


                                                    <td>

                                                        <div className="acciones-usuario">

                                                            <button
                                                                type="button"
                                                                className="btn-reactivar"
                                                                title="Reactivar usuario"
                                                                disabled={
                                                                    cambiandoEstado ===
                                                                    usuario.id
                                                                }
                                                                onClick={() =>
                                                                    cambiarEstadoUsuario(
                                                                        usuario
                                                                    )
                                                                }
                                                            >

                                                                {cambiandoEstado ===
                                                                usuario.id ? (

                                                                    <i className="fa-solid fa-spinner fa-spin"></i>

                                                                ) : (

                                                                    <i className="fa-solid fa-user-check"></i>

                                                                )}

                                                            </button>


                                                            <button
                                                                type="button"
                                                                className="btn-eliminar"
                                                                title="Eliminar usuario"
                                                                onClick={() =>
                                                                    eliminarUsuario(
                                                                        usuario
                                                                    )
                                                                }
                                                            >

                                                                <i className="fa-solid fa-trash"></i>

                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            )
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </>

            )}


            {/* MODAL NUEVO / EDITAR */}

            {modalAbierto && (

                <div
                    className="modal-usuario-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget &&
                            !guardando
                        ) {

                            if (modalNuevoUsuario) {

                                cerrarNuevoUsuario();

                            } else {

                                cerrarEditarUsuario();

                            }

                        }

                    }}
                >

                    <div className="modal-usuario">

                        <div className="modal-usuario-header">

                            <div>

                                <h2>

                                    {modalNuevoUsuario
                                        ? "Nuevo usuario"
                                        : "Editar usuario"}

                                </h2>


                                <p>

                                    {modalNuevoUsuario
                                        ? "Crea un nuevo usuario para PaperControl."
                                        : "Actualiza la información del usuario."}

                                </p>

                            </div>


                            <button
                                type="button"
                                className="modal-usuario-cerrar"
                                onClick={
                                    modalNuevoUsuario
                                        ? cerrarNuevoUsuario
                                        : cerrarEditarUsuario
                                }
                                disabled={
                                    guardando
                                }
                                title="Cerrar"
                            >

                                <i className="fa-solid fa-xmark"></i>

                            </button>

                        </div>


                        <form
                            className="modal-usuario-form"
                            onSubmit={
                                modalNuevoUsuario
                                    ? guardarNuevoUsuario
                                    : guardarCambios
                            }
                        >

                            <div className="modal-usuario-grupo">

                                <label htmlFor="usuario-nombres">
                                    Nombres
                                </label>

                                <input
                                    id="usuario-nombres"
                                    name="nombres"
                                    type="text"
                                    value={
                                        formulario.nombres
                                    }
                                    onChange={
                                        manejarCambioFormulario
                                    }
                                    required
                                    disabled={
                                        guardando
                                    }
                                    maxLength="80"
                                />

                            </div>


                            <div className="modal-usuario-grupo">

                                <label htmlFor="usuario-apellidos">
                                    Apellidos
                                </label>

                                <input
                                    id="usuario-apellidos"
                                    name="apellidos"
                                    type="text"
                                    value={
                                        formulario.apellidos
                                    }
                                    onChange={
                                        manejarCambioFormulario
                                    }
                                    required
                                    disabled={
                                        guardando
                                    }
                                    maxLength="80"
                                />

                            </div>


                            <div className="modal-usuario-grupo">

                                <label htmlFor="usuario-correo">
                                    Correo electrónico
                                </label>

                                <input
                                    id="usuario-correo"
                                    name="correo"
                                    type="email"
                                    value={
                                        formulario.correo
                                    }
                                    onChange={
                                        manejarCambioFormulario
                                    }
                                    required
                                    disabled={
                                        guardando
                                    }
                                    maxLength="191"
                                />

                            </div>


                            {modalNuevoUsuario && (

                                <div className="modal-usuario-grupo">

                                    <label htmlFor="usuario-contrasena">

                                        Contraseña temporal

                                    </label>


                                    <input
                                        id="usuario-contrasena"
                                        name="contrasenaTemporal"
                                        type="password"
                                        value={
                                            formulario.contrasenaTemporal
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        disabled={
                                            guardando
                                        }
                                        minLength="12"
                                        maxLength="200"
                                        placeholder="Mínimo 12 caracteres"
                                    />


                                    <small className="modal-usuario-ayuda">

                                        Debe contener mayúsculas,
                                        minúsculas y números.

                                    </small>

                                </div>

                            )}


                            <div className="modal-usuario-grupo">

                                <label htmlFor="usuario-rol">

                                    Rol

                                </label>


                                <select
                                    id="usuario-rol"
                                    name="rolId"
                                    value={
                                        formulario.rolId
                                    }
                                    onChange={
                                        manejarCambioFormulario
                                    }
                                    required
                                    disabled={
                                        guardando ||
                                        editandoPropiaCuentaEnModal
                                    }
                                >

                                    <option value="">

                                        Selecciona un rol

                                    </option>


                                    {roles.map(
                                        (rol) => (

                                            <option
                                                key={
                                                    rol.id
                                                }
                                                value={
                                                    rol.id
                                                }
                                            >

                                                {rol.nombre}

                                            </option>

                                        )
                                    )}

                                </select>


                                {editandoPropiaCuentaEnModal && (

                                    <small className="modal-usuario-ayuda">

                                        No puedes cambiar tu propio rol.

                                    </small>

                                )}

                            </div>


                            <div className="modal-usuario-acciones">

                                <button
                                    type="button"
                                    className="btn-cancelar-usuario"
                                    onClick={
                                        modalNuevoUsuario
                                            ? cerrarNuevoUsuario
                                            : cerrarEditarUsuario
                                    }
                                    disabled={
                                        guardando
                                    }
                                >

                                    Cancelar

                                </button>


                                <button
                                    type="submit"
                                    className="btn-guardar-usuario"
                                    disabled={
                                        guardando
                                    }
                                >

                                    {guardando ? (

                                        <>

                                            <i className="fa-solid fa-spinner fa-spin"></i>

                                            Guardando...

                                        </>

                                    ) : (

                                        <>

                                            <i className="fa-solid fa-floppy-disk"></i>

                                            {modalNuevoUsuario
                                                ? "Crear usuario"
                                                : "Guardar cambios"}

                                        </>

                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </Layout>

    );

}


export default Usuarios;