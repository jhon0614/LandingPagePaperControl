import "../styles/BotonActualizar.css";

function BotonActualizar({ onClick, actualizando = false }) {

    return (
        <button
            type="button"
            className="btn-actualizar"
            onClick={onClick}
            disabled={actualizando}
        >
            <i className={`fa-solid fa-rotate${actualizando ? " fa-spin" : ""}`}></i>
            {actualizando ? "Actualizando…" : "Actualizar"}
        </button>
    );

}

export default BotonActualizar;