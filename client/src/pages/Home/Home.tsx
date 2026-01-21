import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { fetchItems } from "../../api/items";
import ItemCard from "../../components/ItemCard/ItemCard";
import Button from "../../components/ui/Button/Button";
import { CATEGORIES, ItemCategory, categoryLabel } from "../../lib/categories";
import "./Home.css";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;
    category: ItemCategory;
    hasImage?: boolean;
    updatedAt?: string;
};

export default function Home() {
    const { user } = useAuth();
    const { t, lang } = useSettings();

    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<ItemCategory | "ALL">("ALL");

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
        return items.filter((i) => {
            const okQuery = !q || (i.title || "").toLowerCase().includes(q);
            const okCategory = category === "ALL" || i.category === category;
            return okQuery && okCategory;
        });
    }, [items, query, category]);

    return (
        <div className="page-stack">
            <div className="page-head">
                <div>
                    <h1 className="page-title">{t("catalog")}</h1>
                    <p className="page-subtitle">{t("catalogSubtitle")}</p>
                </div>

                <div className="page-actions">
                    {user ? (
                        <Link to="/add-item">
                            <Button>{t("addItem")}</Button>
                        </Link>
                    ) : (
                        <Link to="/login">
                            <Button>{t("login")}</Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="toolbar">
                <div className="searchbox">
                    <span className="searchbox__icon">⌕</span>
                    <input className="searchbox__input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchByTitle")} />
                </div>

                <div className="searchbox" style={{ maxWidth: 280 }}>
                    <span className="searchbox__icon">≡</span>
                    <select className="categorySelect" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                        <option value="ALL">{t("allCategories")}</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {categoryLabel(c, lang)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="toolbar__right">
                    <span className="muted">{loading ? t("loading") : `${t("found")}: ${filtered.length}`}</span>
                </div>
            </div>

            {loading ? (
                <div className="grid">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="card-skeleton" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="panel">
                    <h2 className="panel__title">{t("emptyCatalog")}</h2>
                    <p className="panel__text">{query.trim() ? `“${query.trim()}”` : ""}</p>
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
