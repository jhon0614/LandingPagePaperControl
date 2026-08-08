import Layout from "../components/Layout";
import "../styles/Dashboard.css";

function Clientes() {
    return (
        <Layout>
        <h1>Clientes</h1>

        <p className="dashboard-subtitle">
            Gestiona todos los clientes del sistema.
        </p>
        </Layout>
    );
}

export default Clientes;