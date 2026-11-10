import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import App from "./App";
import { aplicarTema, obtenerTemaGuardado } from "./utils/tema";
import "./styles/Tema.css";

aplicarTema(obtenerTemaGuardado());

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);