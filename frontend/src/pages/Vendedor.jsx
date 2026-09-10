import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AlertaStockBajo from "../components/AlertaStockBajo";
import "../styles/Dashboard.css";
import { obtenerProductos } from "../services/productos.service";
import { obtenerVentas } from "../services/ventas.service";

function Vendedor() {
    const [resumen, setResumen] = useState({ productos: 0, ventas: 0 });
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        async function cargarResumen() {
            try {
                const [productos, ventas] = await Promise.all([
                    obtenerProductos(),
                    obtenerVentas(),
                ]);

                setResumen({ productos: productos.length, ventas: ventas.length });
            } finally {
                setCargando(false);
            }
        }

        cargarResumen();
    }, []);

    return (
        <Layout>
            <h1>Panel Vendedor</h1>
            <p className="dashboard-subtitle">
                Consulta los productos, tus ventas y las alertas de inventario.
            </p>

            <section className="cards">
                <div className="card">
                    <i className="fa-solid fa-box"></i>
                    <h2>Productos</h2>
                    <span>{cargando ? "—" : resumen.productos}</span>
                </div>

                <div className="card">
                    <i className="fa-solid fa-cart-shopping"></i>
                    <h2>Mis ventas</h2>
                    <span>{cargando ? "—" : resumen.ventas}</span>
                </div>
            </section>

            <section className="dashboard-panels">
                <AlertaStockBajo />
            </section>
        </Layout>
    );
}

export default Vendedor;
