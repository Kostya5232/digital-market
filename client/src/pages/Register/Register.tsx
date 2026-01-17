import { useState } from "react";
import { register } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import "./Register.css";

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await register(email, username, password);
            login(data.token);
            navigate("/profile");
        } catch {
            setError("Не удалось зарегистрироваться");
        }
    };

    return (
        <div className="auth">
            <div className="authCard">
                <div className="authHead">
                    <h1 className="authTitle">Регистрация</h1>
                    <p className="authSubtitle">Создайте аккаунт, чтобы начать.</p>
                </div>

                {error && <div className="authAlert">{error}</div>}

                <form className="authForm" onSubmit={handleSubmit}>
                    <div className="field">
                        <label className="label">Email</label>
                        <input
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Введите Email"
                            autoComplete="email"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Логин</label>
                        <input
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите Логин"
                            autoComplete="username"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Пароль</label>
                        <input
                            className="input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите Пароль"
                            autoComplete="new-password"
                        />
                    </div>

                    <Button type="submit" className="authButton">
                        Зарегистрироваться
                    </Button>
                </form>

                <div className="authFooter">
                    <span className="mutedSmall">Есть аккаунт?</span>
                    <Link className="authLink" to="/login">
                        Войти
                    </Link>
                </div>
            </div>
        </div>
    );
}
