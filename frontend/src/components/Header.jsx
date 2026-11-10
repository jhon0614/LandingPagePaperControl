import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import useTema from "../hooks/useTema";
import { cerrarSesion } from "../services/auth.service";

function Header() {

    const navigate = useNavigate();
    const { tema, alternarTema } = useTema();

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const manejarCerrarSesion = async () => {

        await cerrarSesion();

        navigate("/login");

    };

    return (

        <header className="header">

        <div>

            <h2>Panel de Control</h2>

            <p>Bienvenido, {usuario?.nombres}</p>

        </div>

        <div className="header-acciones">
            <button
                type="button"
                className="btn-tema"
                onClick={alternarTema}
                title={tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                aria-label={tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            >
                <i className={tema === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
            </button>

            <button className="logout-button" onClick={manejarCerrarSesion}>
                Cerrar sesión
            </button>
        </div>

        </header>

    );

}

export default Header;