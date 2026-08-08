import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/AuthLayout.css";

function AccesoDenegado() {
    return (
        <main className="auth-page">
        <section className="auth-card">

            <div className="auth-logo">
            <Logo />
            </div>

            <div className="auth-header">

            <div className="auth-error-code">
                403
            </div>

            <h2 className="auth-error-title">
                Acceso denegado
            </h2>
                
            <p>
                No tienes permisos para acceder a esta página.
                <br />
                <br />
                Contacta al administrador si consideras que esto es un error.
            </p>

            </div>

            <Link to="/">
            <button className="auth-button">
                Volver al inicio
            </button>
            </Link>

        </section>
        </main>
    );
    }

export default AccesoDenegado;