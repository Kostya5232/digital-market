import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../api/auth";

type User = { id: string; email: string; username: string; balance: number; role?: "USER" | "ADMIN" } | null;

interface AuthContextType {
    user: User;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
    const [user, setUser] = useState<User>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadMe() {
            if (!token) {
                setUser(null);
                return;
            }
            try {
                const me = await getMe(token);
                if (!cancelled) setUser(me);
            } catch (e) {
                console.warn("getMe failed, dropping token", e);
                localStorage.removeItem("token");
                if (!cancelled) {
                    setToken(null);
                    setUser(null);
                }
            }
        }

        loadMe();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const refreshMe = async () => {
        if (!token) return;
        const me = await getMe(token);
        setUser(me);
    };

    return <AuthContext.Provider value={{ user, token, login, logout, refreshMe }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
