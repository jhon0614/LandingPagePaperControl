import Layout from "../components/Layout";
import "../styles/Dashboard.css";

function Admin() {
    return (
        <Layout>
        <h1>Panel Administrador</h1>
        <p className="dashboard-subtitle">
            Bienvenido al sistema de gestión de PaperControl.
        </p>

        <section className="cards">

            <div className="card">
            <i className="fa-solid fa-box"></i>
            <h2>Productos</h2>
            <span>125</span>
            </div>

            <div className="card">
            <i className="fa-solid fa-cart-shopping"></i>
            <h2>Ventas</h2>
            <span>38</span>
            </div>

            <div className="card">
            <i className="fa-solid fa-users"></i>
            <h2>Usuarios</h2>
            <span>3</span>
            </div>

            <div className="card">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h2>Stock Bajo</h2>
            <span>7</span>
            </div>

        </section>

        <section className="dashboard-panels">

            <div className="panel">
            <h2>Últimos movimientos</h2>
            <p>Aquí se mostrarán los movimientos de inventario.</p>
            </div>

            <div className="panel">
            <h2>Ventas recientes</h2>
            <p>Aquí se mostrarán las últimas ventas realizadas.</p>
            </div>

        </section>
        </Layout>
    );
}

export default Admin;