import { Routes, Route } from "react-router-dom";

import PrivateRoute from "./routes/PrivateRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AccesoDenegado from "./pages/AccesoDenegado";

import Admin from "./pages/Admin";
import Vendedor from "./pages/Vendedor";
import Dueno from "./pages/Dueno";

import Usuarios from "./pages/Usuarios";
import Ventas from "./pages/Ventas";
import Reportes from "./pages/Reportes";
import Clientes from "./pages/Clientes";
import Inventario from "./pages/Inventario";


function App() {

    return (

        <Routes>


            {/* =========================================
                RUTAS PÚBLICAS
            ========================================= */}

            <Route
                path="/"
                element={<Landing />}
            />


            <Route
                path="/login"
                element={<Login />}
            />


            <Route
                path="/acceso-denegado"
                element={<AccesoDenegado />}
            />


            {/* =========================================
                DASHBOARD ADMINISTRADOR
            ========================================= */}

            <Route
                path="/admin"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR"
                        ]}
                    >

                        <Admin />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                DASHBOARD VENDEDOR
            ========================================= */}

            <Route
                path="/vendedor"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "VENDEDOR"
                        ]}
                    >

                        <Vendedor />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                DASHBOARD DUEÑO
            ========================================= */}

            <Route
                path="/dueno"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "DUENO"
                        ]}
                    >

                        <Dueno />

                    </PrivateRoute>

                }
            />



            {/* =========================================
                USUARIOS
                ADMINISTRADOR + DUEÑO
            ========================================= */}

            <Route
                path="/usuarios"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR",
                            "DUENO"
                        ]}
                    >

                        <Usuarios />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                CLIENTES
                ADMINISTRADOR + VENDEDOR + DUEÑO
            ========================================= */}

            <Route
                path="/clientes"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR",
                            "VENDEDOR",
                            "DUENO"
                        ]}
                    >

                        <Clientes />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                VENTAS
                ADMINISTRADOR + VENDEDOR + DUEÑO
            ========================================= */}

            <Route
                path="/ventas"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR",
                            "VENDEDOR",
                            "DUENO"
                        ]}
                    >

                        <Ventas />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                INVENTARIO
                ADMINISTRADOR + DUEÑO
            ========================================= */}

            <Route
                path="/inventario"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR",
                            "DUENO"
                        ]}
                    >

                        <Inventario />

                    </PrivateRoute>

                }
            />


            {/* =========================================
                REPORTES
                ADMINISTRADOR + DUEÑO
            ========================================= */}

            <Route
                path="/reportes"
                element={

                    <PrivateRoute
                        rolesPermitidos={[
                            "ADMINISTRADOR",
                            "DUENO"
                        ]}
                    >

                        <Reportes />

                    </PrivateRoute>

                }
            />


        </Routes>

    );

}


export default App;