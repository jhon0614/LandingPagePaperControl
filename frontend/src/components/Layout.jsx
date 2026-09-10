import Sidebar from "./Sidebar";
import Header from "./Header";
import InactividadAviso from "./InactividadAviso";
import { useEffect, useState } from "react";
import "../styles/Dashboard.css";

function Layout({ children }) {
    const [sidebarContraido, setSidebarContraido] = useState(() =>
        localStorage.getItem("sidebarContraido") === "true"
    );

    useEffect(() => {
        localStorage.setItem("sidebarContraido", String(sidebarContraido));
    }, [sidebarContraido]);

    return (
        <div className={`dashboard ${sidebarContraido ? "dashboard-sidebar-contraido" : ""}`}>

        <Sidebar
            contraido={sidebarContraido}
            onAlternar={() => setSidebarContraido((actual) => !actual)}
        />

        <div className="dashboard-body">

            <Header />

            <main className="dashboard-content">
            {children}
            </main>

        </div>

        <InactividadAviso />
        
        </div>
    );
}

export default Layout;
