import { Navigate } from "react-router-dom";
import { obtenerToken } from "../services/api";

function PrivateRoute({ children, rolesPermitidos }) {

    const token = obtenerToken();

    const usuario = JSON.parse(
        localStorage.getItem("usuario")
    );

    if (!token || !usuario) {
        return <Navigate to="/login" replace />;
    }

    if (
        rolesPermitidos &&
        !rolesPermitidos.includes(usuario.rol)
    ) {
        return (
            <Navigate
                to="/acceso-denegado"
                replace
            />
        );
    }

    return children;
}

export default PrivateRoute;