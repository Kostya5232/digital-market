import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import { AuthProvider } from "./context/AuthContext";
import Profile from "./pages/Profile/Profile";
import AddItem from "./pages/AddItem/AddItem";
import ItemDetail from "./pages/ItemDetail/ItemDetail";
import Navbar from "./components/ui/Navbar/Navbar";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="app-shell">
                    <Navbar />
                    <main className="page">
                        <div className="container">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/add-item" element={<AddItem />} />
                                <Route path="/items/:id" element={<ItemDetail />} />
                            </Routes>
                        </div>
                    </main>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}
