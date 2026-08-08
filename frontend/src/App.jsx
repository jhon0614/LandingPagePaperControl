import { Routes, Route } from "react-router-dom";
import PrivateRoute from "./routes/PrivateRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AccesoDenegado from "./pages/AccesoDenegado";

import Admin from "./pages/Admin";
import Vendedor from "./pages/Vendedor";
import Dueno from "./pages/Dueno";

import Productos from "./pages/Productos";
import Usuarios from "./pages/Usuarios";
import Ventas from "./pages/Ventas";
import Reportes from "./pages/Reportes";
import Clientes from "./pages/Clientes";
import Inventario from "./pages/Inventario";


function App() {
  return (
    <Routes>

      {/* Rutas públicas */}

      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/acceso-denegado" element={<AccesoDenegado />} />

      {/* Dashboards */}

      <Route
        path="/admin"
        element={
          <PrivateRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <Admin />
          </PrivateRoute>
        }
      />

      <Route
        path="/vendedor"
        element={
          <PrivateRoute rolesPermitidos={["VENDEDOR"]}>
            <Vendedor />
          </PrivateRoute>
        }
      />

      <Route
        path="/dueno"
        element={
          <PrivateRoute rolesPermitidos={["DUENO"]}>
            <Dueno />
          </PrivateRoute>
        }
      />

      {/* Productos */}

      <Route
        path="/productos"
        element={
          <PrivateRoute
            rolesPermitidos={["ADMINISTRADOR", "DUENO"]}
          >
            <Productos />
          </PrivateRoute>
        }
      />

      {/* Usuarios */}

      <Route
        path="/usuarios"
        element={
          <PrivateRoute
            rolesPermitidos={["ADMINISTRADOR"]}
          >
            <Usuarios />
          </PrivateRoute>
        }
      />

      {/* Ventas */}

      <Route
        path="/ventas"
        element={
          <PrivateRoute
            rolesPermitidos={["ADMINISTRADOR", "VENDEDOR", "DUENO"]}
          >
            <Ventas />
          </PrivateRoute>
        }
      />

      {/* Clientes */}

      <Route
        path="/clientes"
        element={
          <PrivateRoute
            rolesPermitidos={["VENDEDOR"]}
          >
            <Clientes />
          </PrivateRoute>
        }
      />

      {/* Inventario */}

      <Route
        path="/inventario"
        element={
          <PrivateRoute
            rolesPermitidos={["ADMINISTRADOR", "DUENO"]}
          >
            <Inventario />
          </PrivateRoute>
        }
      />

      {/* Reportes */}

      <Route
        path="/reportes"
        element={
          <PrivateRoute
            rolesPermitidos={["ADMINISTRADOR", "DUENO"]}
          >
            <Reportes />
          </PrivateRoute>
        }
      />

    </Routes>
  );
}

export default App;