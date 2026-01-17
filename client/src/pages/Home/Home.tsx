import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchItems } from "../../api/items";
import ItemCard from "../../components/ItemCard/ItemCard";
import Button from "../../components/ui/Button/Button";

import "./Home.css";

type Item = {
    id: number;
    title: string;
    description?: string;
    price: number;
    image_url?: string | null;
    owner_id?: number;
};

export default function Home() {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // мини-поиск (как у маркетплейсов) — если не хочешь, просто убери state и input
    const [query, setQuery] = useState("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                const data = await fetchItems();
                if (!cancelled) setItems(data);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => (i.title || "").toLowerCase().includes(q));
    }, [items, query]);

    return (
        <div className="page-stack">
            <div className="page-head">
                <div>
                    <h1 className="page-title">Каталог</h1>
                    <p className="page-subtitle">Выбирай товары, открывай карточки и покупай.</p>
                </div>

                <div className="page-actions">
                    {user ? (
                        <Link to="/add-item">
                            <Button>Добавить товар</Button>
                        </Link>
                    ) : (
                        <Link to="/login">
                            <Button>Войти</Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="toolbar">
                <div className="searchbox">
                    <span className="searchbox__icon">⌕</span>
                    <input className="searchbox__input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию..." />
                </div>

                <div className="toolbar__right">
                    <span className="muted">{loading ? "Загрузка..." : `Найдено: ${filtered.length}`}</span>
                </div>
            </div>

            {loading ? (
                <div className="grid">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="card-skeleton" />
                    ))}
                </div>
            ) : (
                <div className="grid">
                    {filtered.map((item) => (
                        <ItemCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
