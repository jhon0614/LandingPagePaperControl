import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

import { cerrarSesion } from "../services/auth.service";

function Header() {

    const navigate = useNavigate();

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

        <button
            className="logout-button"
            onClick={manejarCerrarSesion}
        >
            Cerrar sesión
        </button>

        </header>

    );

}

export default Header;