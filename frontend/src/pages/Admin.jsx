import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AlertaStockBajo from "../components/AlertaStockBajo";
import ProductosMasVendidos from "../components/ProductosMasVendidos";
import "../styles/Dashboard.css";

import { obtenerProductos } from "../services/productos.service";

function Admin() {

    const [totales, setTotales] = useState({
        productos: 0,
        stockBajo: 0,
    });

    useEffect(() => {

        async function cargar() {

            try {

                const productos = await obtenerProductos();

                const activos = productos.filter(
                    (p) => p.estaActivo
                );

                const stockBajo = activos.filter(
                    (p) =>
                        Number(p.stock) > 0 &&
                        Number(p.stock) <= Number(p.stockMinimo)
                ).length;

                setTotales({
                    productos: activos.length,
                    stockBajo,
                });

            } catch (error) {

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