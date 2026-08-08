import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

function Header() {

    const navigate = useNavigate();

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const cerrarSesion = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        navigate("/login");

    };

    return (

        <header className="header">

        <div>

            <h2>Panel de Control</h2>

            <p>Bienvenido, {usuario.nombres}</p>

        </div>

        <button
            className="logout-button"
            onClick={cerrarSesion}
        >
            Cerrar sesión
        </button>

        </header>

    );

}

export default Header;