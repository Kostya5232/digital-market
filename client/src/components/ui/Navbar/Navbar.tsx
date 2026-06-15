import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Button from "../Button/Button";
import { useSettings } from "../../../context/SettingsContext";
import "./Navbar.css";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { t, formatMoney } = useSettings();

    return (
        <header className="topbar">
            <div className="container topbar__inner">
                <div className="topbar__left">
                    <Link to="/" className="brand">
                        ЛутХаб
                    </Link>

                    <nav className="nav">
                        <NavLink to="/" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                            {t("home")}
                        </NavLink>

                        {user && (
                            <>
                                <NavLink to="/profile" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                    {t("profileNav")}
                                </NavLink>

                                <NavLink to="/deals" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                    {t("deals")}
                                </NavLink>

                                <NavLink to="/add-item" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                    {t("addItem")}
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                <div className="topbar__right">
                    {user ? (
                        <>
                            <span className="userchip">
                                {t("hello")}, {user.username}
                            </span>
                            <span className="balancechip">
                                {t("balance")}: {formatMoney(user.balance)}
                            </span>
                            <Button variant="ghost" onClick={logout}>
                                {t("logout")}
                            </Button>
                        </>
                    ) : (
                        <div className="authlinks">
                            <NavLink to="/login" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                {t("login")}
                            </NavLink>
                            <NavLink to="/register" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                {t("register")}
                            </NavLink>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
