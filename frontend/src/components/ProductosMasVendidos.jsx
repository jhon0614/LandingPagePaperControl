import { useEffect, useState } from "react";

import { obtenerProductosMasVendidos } from "../services/reportes.service";

import "../styles/ProductosMasVendidos.css";

import CampoFecha from "./CampoFecha";

function sumarDias(fecha, dias) {
    const [a, m, d] = fecha.split("-").map(Number);
    const f = new Date(a, m - 1, d + dias);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

function ProductosMasVendidos() {

    const [periodo, setPeriodo] = useState("semana");

    const [desde, setDesde] = useState("");

    const [hasta, setHasta] = useState("");

    const [productos, setProductos] = useState([]);

    const [cargando, setCargando] = useState(true);

    const [error, setError] = useState("");


    async function cargar() {

        try {

            setCargando(true);

            setError("");

            const parametros =
                periodo === "rango"
                    ? { periodo: "rango", desde, hasta }
                    : { periodo };

            const lista = await obtenerProductosMasVendidos(
                parametros
            );

            setProductos(lista);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cargar el reporte."
            );

            setProductos([]);

        } finally {

            setCargando(false);

        }

    }

    useEffect(() => {

        if (periodo === "rango" && (!desde || !hasta)) {

            return;

        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargar();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo, desde, hasta]);


    const maximo = Math.max(
        ...productos.map((p) => Number(p.cantidadVendida || 0)),
        1
    );


    return (

        <div className="mas-vendidos-panel">

            <div className="mas-vendidos-header">

                <h2>
                    <i className="fa-solid fa-ranking-star"></i>
                    Productos más vendidos
                </h2>

                <div className="mas-vendidos-filtros">

                    <button
                        type="button"
                        className={
                            periodo === "semana" ? "activo" : ""
                        }
                        onClick={() => setPeriodo("semana")}
                    >
                        Semana
                    </button>

                    <button
                        type="button"
                        className={
                            periodo === "mes" ? "activo" : ""
                        }
                        onClick={() => setPeriodo("mes")}
                    >
                        Mes
                    </button>

                    <button
                        type="button"
                        className={
                            periodo === "rango" ? "activo" : ""
                        }
                        onClick={() => setPeriodo("rango")}
                    >
                        Rango
                    </button>

                </div>

            </div>

            {periodo === "rango" && (

                <div className="mas-vendidos-rango">

                    <CampoFecha
                        value={desde}
                        max={hasta || undefined}
                        onChange={(e) => {
                            const nuevo = e.target.value;
                            setDesde(nuevo);
                            if (
                                nuevo &&
                                hasta &&
                                (hasta < nuevo || hasta > sumarDias(nuevo, 365))
                            ) {
                                setHasta("");
                            }
                        }}
                    />

                    <span>hasta</span>

                    <CampoFecha
                        value={hasta}
                        min={desde || undefined}
                        max={desde ? sumarDias(desde, 365) : undefined}
                        onChange={(e) => setHasta(e.target.value)}
                    />

                </div>

            )}

            {error && (
                <p className="mas-vendidos-error">{error}</p>
            )}

            {cargando ? (

                <p className="mas-vendidos-cargando">
                    Cargando...
                </p>

            ) : productos.length === 0 ? (

                <p className="mas-vendidos-vacio">
                    No hay ventas registradas en este período.
                </p>

            ) : (

                <div className="mas-vendidos-grafico">

                    {productos.map((producto, indice) => {

                        const porcentaje =
                            (Number(producto.cantidadVendida || 0) /
                                maximo) *
                            100;

                        return (

                            <div
                                className="mas-vendidos-fila"
                                key={producto.id}
                            >

                                <div className="mas-vendidos-nombre">
                                    <span className="mas-vendidos-posicion">
                                        {indice + 1}
                                    </span>
                                    {producto.nombre}
                                </div>

                                <div className="mas-vendidos-barra-wrapper">

                                    <div
                                        className="mas-vendidos-barra"
                                        style={{
                                            width: `${porcentaje}%`,
                                        }}
                                    ></div>

                                </div>

                                <div className="mas-vendidos-cantidad">
                                    {producto.cantidadVendida} uds
                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

        </div>

    );

}

export default ProductosMasVendidos;