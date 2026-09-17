import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AlertaStockBajo from "../components/AlertaStockBajo";
import ProductosMasVendidos from "../components/ProductosMasVendidos";
import "../styles/Dashboard.css";

import { obtenerResumenDashboard } from "../services/dashboard.service";

function Admin() {

    const [totales, setTotales] = useState({
        productos: 0,
        ventas: 0,
        usuarios: 0,
        stockBajo: 0,
    });

    useEffect(() => {

    async function cargar() {

        try {

            const resumen = await obtenerResumenDashboard();

            setTotales(resumen);

        } catch {

            // Si falla, se dejan los valores en 0 por defecto.

        }

    }

    cargar();

}, []);

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
                    <span>{totales.productos}</span>
                </div>

                <div className="card">
                    <i className="fa-solid fa-cart-shopping"></i>
                    <h2>Ventas</h2>
                    <span>{totales.ventas}</span>
                </div>

                <div className="card">
                    <i className="fa-solid fa-users"></i>
                    <h2>Usuarios</h2>
                    <span>{totales.usuarios}</span>
                </div>

                <div className="card">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <h2>Stock Bajo</h2>
                    <span>{totales.stockBajo}</span>
                </div>

            </section>

            <section className="dashboard-panels">

                <AlertaStockBajo />

                <ProductosMasVendidos />

            </section>
        </Layout>
    );
}

export default Admin;