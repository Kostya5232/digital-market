import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { fetchItem, buyItem } from "../../services/api";
import { deleteItem } from "../../api/items";
import { API_URL } from "../../api/auth";
import { ItemCategory, categoryLabel } from "../../lib/categories";
import "./ItemDetail.css";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;

    category: ItemCategory;

    sellerId?: string;
    ownerId?: string | null;

    hasImage?: boolean;
    updatedAt?: string;
    status?: "LISTED" | "SOLD";
};

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const { formatMoney, lang } = useSettings();

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    setError(lang === "ru" ? "Нет id товара в URL." : "No item id in URL.");
                    return;
                }

                const data = await fetchItem(id);

                const normalized: Item = {
                    id: String(data.id),
                    title: data.title,
                    description: data.description,
                    price: Number(data.price),

                    category: (data.category ?? "OTHER") as ItemCategory,

                    sellerId: data.sellerId ?? data.seller_id,
                    ownerId: data.ownerId ?? data.owner_id,

                    hasImage: data.hasImage ?? Boolean(data.imageMime ?? data.image_mime),
                    updatedAt: data.updatedAt ?? data.updated_at,
                    status: data.status,
                };

                if (!cancelled) setItem(normalized);
            } catch {
                if (!cancelled) setError(lang === "ru" ? "Не удалось загрузить товар." : "Failed to load item.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, lang]);

    const imgSrc = useMemo(() => {
        if (!item?.hasImage) return null;
        if (item.updatedAt) return `${API_URL}/items/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`;
        return `${API_URL}/items/${item.id}/image`;
    }, [item]);

    const isSeller = Boolean(user && item && item.sellerId && user.id === item.sellerId);

    async function handleBuy() {
        if (!item) return;
        if (!user) {
            setError(lang === "ru" ? "Сначала войди в аккаунт, чтобы купить товар." : "Please log in to buy.");
            return;
        }

        try {
            setBuying(true);
            setError(null);

            if (!token) {
                setError(lang === "ru" ? "Нет токена авторизации. Перезайди в аккаунт." : "No auth token. Re-login.");
                return;
            }

            await buyItem(token, item.id);
            setError(lang === "ru" ? "Покупка успешно оформлена!" : "Purchase completed!");
        } catch {
            setError(lang === "ru" ? "Не удалось оформить покупку." : "Failed to buy item.");
        } finally {
            setBuying(false);
        }
    }

    async function handleDelete() {
        if (!item) return;
        if (!token) {
            setError(lang === "ru" ? "Нужно войти в аккаунт." : "Please log in.");
            return;
        }

        const ok = window.confirm(lang === "ru" ? "Удалить товар? Это действие нельзя отменить." : "Delete item? This cannot be undone.");
        if (!ok) return;

        try {
            setDeleting(true);
            setError(null);
            await deleteItem(token, item.id);
            navigate("/profile");
        } catch {
            setError(lang === "ru" ? "Не удалось удалить товар." : "Failed to delete item.");
        } finally {
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="product-skeleton">
                <div className="product-skeleton__media" />
                <div className="product-skeleton__info" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="panel">
                <h2 className="panel__title">{lang === "ru" ? "Товар не найден" : "Item not found"}</h2>
                <p className="panel__text">
                    {lang === "ru" ? "Возможно, он был удалён или ссылка неверная." : "It might be removed or the link is wrong."}
                </p>
                <Link to="/">
                    <Button>{lang === "ru" ? "Вернуться в каталог" : "Back to catalog"}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="product">
            <div className="product__media">
                {imgSrc ? <img className="product__img" src={imgSrc} alt={item.title} /> : <div className="product__placeholder">No image</div>}
            </div>

            <div className="product__info">
                <div className="product__head">
                    <div>
                        <h1 className="product__title">{item.title}</h1>
                        <p className="product__meta">ID: {item.id}</p>
                        <p className="product__meta">
                            {lang === "ru" ? "Категория" : "Category"}: {categoryLabel(item.category, lang)}
                        </p>
                    </div>

                    <div className="product__price">{formatMoney(item.price)}</div>
                </div>

                <div className="divider" />

                <div className="product__section">
                    <h3 className="product__sectionTitle">{lang === "ru" ? "Описание" : "Description"}</h3>
                    <p className="product__desc">
                        {item.description?.trim() ? item.description : lang === "ru" ? "Описание отсутствует." : "No description."}
                    </p>
                </div>

                {error && <div className="alert">{error}</div>}

                <div className="product__actions">
                    <Link to="/">
                        <Button variant="secondary">{lang === "ru" ? "Назад" : "Back"}</Button>
                    </Link>

                    {isSeller ? (
                        <>
                            <Link to={`/items/${item.id}/edit`}>
                                <Button variant="secondary">{lang === "ru" ? "Редактировать" : "Edit"}</Button>
                            </Link>

                            <Button variant="secondary" className="dangerBtn" onClick={handleDelete} disabled={deleting}>
                                {deleting ? (lang === "ru" ? "Удаление..." : "Deleting...") : lang === "ru" ? "Удалить" : "Delete"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleBuy} disabled={buying || item.status === "SOLD"}>
                            {item.status === "SOLD"
                                ? lang === "ru"
                                    ? "Продано"
                                    : "Sold"
                                : buying
                                ? lang === "ru"
                                    ? "Покупка..."
                                    : "Buying..."
                                : lang === "ru"
                                ? "Купить"
                                : "Buy"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
