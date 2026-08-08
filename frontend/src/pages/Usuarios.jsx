import Layout from "../components/Layout";
import "../styles/Dashboard.css";

function Usuarios() {
    return (
        <Layout>
        <h1>Usuarios</h1>

        <p className="dashboard-subtitle">
            Gestiona todos los usuarios del inventario.
        </p>
        </Layout>
    );
}

export default Usuarios;