import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { login } from "../../api/auth";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (!username.trim() || !password.trim()) {
            setError("Заполни логин и пароль.");
            return;
        }

        try {
            setLoading(true);
            const data = await login(username.trim(), password);
            authLogin(data.token);
            navigate("/");
        } catch (err: any) {
            setError("Неверный логин или пароль.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth">
            <div className="authCard">
                <div className="authHead">
                    <h1 className="authTitle">Вход</h1>
                    <p className="authSubtitle">Войди в аккаунт, чтобы покупать и добавлять товары.</p>
                </div>

                <form className="authForm" onSubmit={onSubmit}>
                    <div className="field">
                        <label className="label">Логин</label>
                        <input
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите логин"
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
                            placeholder="Введите пароль"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="authAlert">{error}</div>}

                    <Button type="submit" disabled={loading} className="authButton">
                        {loading ? "Входим..." : "Войти"}
                    </Button>
                </form>

                <div className="authFooter">
                    <span className="mutedSmall">Нет аккаунта?</span>
                    <Link className="authLink" to="/register">
                        Регистрация
                    </Link>
                </div>
            </div>
        </div>
    );
}
