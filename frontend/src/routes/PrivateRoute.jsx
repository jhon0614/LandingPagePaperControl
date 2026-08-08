import { Navigate } from "react-router-dom";

function PrivateRoute({ children, rolesPermitidos }) {
    const token = localStorage.getItem("token");
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!token || !usuario) {
        return <Navigate to="/login" replace />;
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
        return <Navigate to="/acceso-denegado" replace />;
    }

    return children;
}

export default PrivateRoute;