import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { fetchItem, buyItem, API_URL } from "../../services/api";

import "./ItemDetail.css";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;
    hasImage?: boolean;
    updatedAt?: string;
    ownerId?: string | null;
    sellerId?: string;
};

function formatPrice(value: number) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value);
}

export default function ItemDetail() {
    const { id } = useParams();
    const { user, token } = useAuth();

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    setError("Нет id товара в URL.");
                    setLoading(false);
                    return;
                }

                const data = await fetchItem(id);

                if (!cancelled) setItem(data);
            } catch (e: any) {
                if (!cancelled) setError("Не удалось загрузить товар.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const isOwner = Boolean(user && item && item.ownerId && user.id === item.ownerId);
    const isSeller = Boolean(user && item && item.sellerId && user.id === item.sellerId);

    async function handleBuy() {
        if (!item) return;
        if (!user) {
            setError("Сначала войди в аккаунт, чтобы купить товар.");
            return;
        }

        try {
            setBuying(true);
            setError(null);
            if (!token) {
                setError("Нет токена авторизации. Перезайди в аккаунт.");
                return;
            }
            await buyItem(token, String(item.id));
            setError("Покупка успешно оформлена!"); // потом заменим на toast
        } catch (e: any) {
            setError("Не удалось оформить покупку.");
        } finally {
            setBuying(false);
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
                <h2 className="panel__title">Товар не найден</h2>
                <p className="panel__text">Возможно, он был удалён или ссылка неверная.</p>
                <Link to="/">
                    <Button>Вернуться в каталог</Button>
                </Link>
            </div>
        );
    }
    const imgSrc =
        item.hasImage && item.updatedAt
            ? `${API_URL}/items/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`
            : item.hasImage
            ? `${API_URL}/items/${item.id}/image`
            : null;

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
                    </div>

                    <div className="product__price">{formatPrice(item.price)}</div>
                </div>

                <div className="divider" />

                <div className="product__section">
                    <h3 className="product__sectionTitle">Описание</h3>
                    <p className="product__desc">{item.description?.trim() ? item.description : "Описание отсутствует."}</p>
                </div>

                {error && <div className="alert">{error}</div>}

                <div className="product__actions">
                    <Link to="/">
                        <Button variant="secondary">Назад</Button>
                    </Link>

                    {isSeller ? (
                        <Link to={`/items/${item.id}/edit`}>
                            <Button variant="secondary">Редактировать</Button>
                        </Link>
                    ) : (
                        <Button onClick={handleBuy} disabled={buying}>
                            ...
                        </Button>
                    )}

                    {isOwner ? (
                        <Button variant="ghost" disabled>
                            Это ваш товар
                        </Button>
                    ) : (
                        <Button onClick={handleBuy} disabled={buying}>
                            {buying ? "Покупка..." : "Купить"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
