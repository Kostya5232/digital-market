import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Profile from "./pages/Profile";
import AddItem from "./pages/AddItem";
import ItemDetail from "./pages/ItemDetail";

function Navbar() {
    const { user, logout } = useAuth();
    return (
        <nav>
            <Link to="/">Главная</Link>
            {" | "}
            {user ? (
                <>
                    <Link to="/profile">Профиль</Link>
                    {" | "}
                    <Link to="/add-item">Добавить товар</Link>
                    {" | "}
                    <span>Привет, {user.username}</span> <button onClick={logout}>Выйти</button>
                </>
            ) : (
                <>
                    <Link to="/login">Вход</Link>
                    {" | "}
                    <Link to="/register">Регистрация</Link>
                </>
            )}
        </nav>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/add-item" element={<AddItem />} />
                    <Route path="/items/:id" element={<ItemDetail />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
