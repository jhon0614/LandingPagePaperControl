import Sidebar from "./Sidebar";
import Header from "./Header";
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

        </div>
    );
}

export default Layout;