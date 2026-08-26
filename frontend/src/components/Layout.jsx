import Sidebar from "./Sidebar";
import Header from "./Header";
import InactividadAviso from "./InactividadAviso";
import "../styles/Dashboard.css";

function Layout({ children }) {
    return (
        <div className="dashboard">

        <Sidebar />

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