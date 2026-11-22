import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AlertaStockBajo from "../components/AlertaStockBajo";
import ProductosMasVendidos from "../components/ProductosMasVendidos";
import "../styles/Dashboard.css";
import GraficasDashboard from "../components/graficas/GraficasDashboard";
import { obtenerResumenDashboard } from "../services/dashboard.service";
import BotonActualizar from "../components/BotonActualizar";

function Admin() {

    const [actualizando, setActualizando] = useState(false);
    const [errorResumen, setErrorResumen] = useState("");

    async function actualizarResumen() {

        try {

            setActualizando(true);
            setErrorResumen("");

            const resumen = await obtenerResumenDashboard({ refrescar: true });

            setTotales(resumen);

        } catch (error) {

            setErrorResumen(
                error.message ||
                "No fue posible actualizar los indicadores."
            );

        } finally {

            setActualizando(false);

        }

    }

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
            <div className="encabezado-con-accion">
                <div>
                    <h1>Panel Administrador</h1>
                    <p className="dashboard-subtitle">
                        Bienvenido al sistema de gestión de PaperControl.
                    </p>
                </div>

                <BotonActualizar onClick={actualizarResumen} actualizando={actualizando} />
            </div>

            {errorResumen && <div className="caja-error">{errorResumen}</div>}

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
            <GraficasDashboard />
        </Layout>
    );
}

export default Admin;