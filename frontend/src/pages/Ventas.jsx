import Layout from "../components/Layout";
import "../styles/Dashboard.css";

function Ventas() {
    return (
        <Layout>
        <h1>Ventas</h1>

        <p className="dashboard-subtitle">
            Gestiona todas las ventas del inventario.
        </p>
        </Layout>
    );
}

export default Ventas;