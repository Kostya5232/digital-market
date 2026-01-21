export const API_URL = "http://localhost:4000/api";

export async function register(email: string, username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) throw new Error("Ошибка регистрации");
    return res.json();
}

export async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Ошибка входа");
    return res.json();
}

export async function getMe(token: string) {
    const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Ошибка получения данных пользователя");
    return res.json();
}

export async function updateMe(token: string, username: string) {
    const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error("Ошибка обновления профиля");
    return res.json();
}
