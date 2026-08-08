import Logo from "./Logo";
import { NavLink } from "react-router-dom";
import "../styles/Dashboard.css";

function Sidebar() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    return (
        <aside className="sidebar">

        <div className="sidebar-logo">
            <Logo />
        </div>

        <div className="sidebar-user">
            <h3>{usuario.nombres}</h3>
            <p>{usuario.rol}</p>
        </div>

        <nav className="sidebar-menu">

            {/* ADMINISTRADOR */}
            {usuario.rol === "ADMINISTRADOR" && (
            <>
                <NavLink to="/admin">
                <i className="fa-solid fa-house"></i> Dashboard
                </NavLink>

                <NavLink to="/productos">
                <i className="fa-solid fa-box"></i> Productos
                </NavLink>

                <NavLink to="/usuarios">
                <i className="fa-solid fa-users"></i> Usuarios
                </NavLink>

                <NavLink to="/ventas">
                <i className="fa-solid fa-cart-shopping"></i> Ventas
                </NavLink>

                <NavLink to="/reportes">
                <i className="fa-solid fa-chart-column"></i> Reportes
                </NavLink>
            </>
            )}

            {/* VENDEDOR */}
            {usuario.rol === "VENDEDOR" && (
            <>
                <NavLink to="/vendedor">
                <i className="fa-solid fa-house"></i> Dashboard
                </NavLink>

                <NavLink to="/ventas">
                <i className="fa-solid fa-cart-shopping"></i> Ventas
                </NavLink>

                <NavLink to="/clientes">
                <i className="fa-solid fa-user-group"></i> Clientes
                </NavLink>
            </>
            )}

            {/* DUEÑO */}
            {usuario.rol === "DUENO" && (
            <>
                <NavLink to="/dueno">
                <i className="fa-solid fa-house"></i> Dashboard
                </NavLink>

                <NavLink to="/inventario">
                <i className="fa-solid fa-box"></i> Inventario
                </NavLink>

                <NavLink to="/ventas">
                <i className="fa-solid fa-cart-shopping"></i> Ventas
                </NavLink>

                <NavLink to="/reportes">
                <i className="fa-solid fa-chart-line"></i> Reportes
                </NavLink>
            </>
            )}

        </nav>

        </aside>
    );
}

export default Sidebar;