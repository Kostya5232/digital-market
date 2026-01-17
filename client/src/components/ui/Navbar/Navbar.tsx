import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Button from "../Button/Button";
import "./Navbar.css";

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <header className="topbar">
            <div className="container topbar__inner">
                <div className="topbar__left">
                    <Link to="/" className="brand">
                        LootHab
                    </Link>

                    <nav className="nav">
                        <NavLink to="/" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                            Главная
                        </NavLink>
                        {user && (
                            <>
                                <NavLink to="/profile" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                    Профиль
                                </NavLink>
                                <NavLink to="/add-item" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                    Добавить товар
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                <div className="topbar__right">
                    {user ? (
                        <>
                            <span className="userchip">Привет, {user.username}</span>
                            <Button variant="ghost" onClick={logout}>
                                Выйти
                            </Button>
                        </>
                    ) : (
                        <div className="authlinks">
                            <NavLink to="/login" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                Вход
                            </NavLink>
                            <NavLink to="/register" className={({ isActive }) => (isActive ? "navlink navlink--active" : "navlink")}>
                                Регистрация
                            </NavLink>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
