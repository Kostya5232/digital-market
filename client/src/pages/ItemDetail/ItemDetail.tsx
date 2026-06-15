import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { fetchItem, buyItem } from "../../services/api";
import { deleteItem } from "../../api/items";
import { API_URL } from "../../api/auth";
import type { PaymentMethod } from "../../api/orders";
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
    seller?: {
        id: string;
        username: string;
        rating?: {
            average: number | null;
            count: number;
        };
    };

    hasImage?: boolean;
    updatedAt?: string;
    status?: "LISTED" | "SOLD";
};

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token, refreshMe } = useAuth();
    const { t, formatMoney, lang } = useSettings();

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BALANCE");
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
                    seller: data.seller,

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
    const canPayWithBalance = Boolean(user && item && user.balance >= Math.round(item.price));
    const paymentOptions = [
        {
            id: "BALANCE" as const,
            icon: "wallet",
            label: lang === "ru" ? "Баланс сайта" : "Site balance",
            text: lang === "ru" ? "Списание с внутреннего баланса" : "Use internal wallet funds",
            disabled: !canPayWithBalance,
        },
        {
            id: "CARD" as const,
            icon: "card",
            label: lang === "ru" ? "Банковская карта RU" : "Bank card",
            text: lang === "ru" ? "Оплата картой" : "Сard payment",
            disabled: false,
        },
        {
            id: "SBP" as const,
            icon: "sbp",
            label: lang === "ru" ? "СБП (оплата по QR)" : "SBP (QR payment)",
            text: lang === "ru" ? "Оплата по СБП" : "SBP payment",
            disabled: false,
        },
    ];

    useEffect(() => {
        if (user && item && paymentMethod === "BALANCE" && !canPayWithBalance) setPaymentMethod("CARD");
    }, [canPayWithBalance, item, paymentMethod, user]);

    async function handleBuy(method: PaymentMethod = paymentMethod) {
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

            const order = await buyItem(token, item.id, method);
            await refreshMe();
            navigate(`/deals/${order.id}`);
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
                        {item.seller && (
                            <Link to={`/users/${item.seller.id}`} className="product__seller">
                                <span>
                                    {t("seller")}: {item.seller.username}
                                </span>
                                <strong>
                                    {item.seller.rating?.average ? `★ ${item.seller.rating.average} (${item.seller.rating.count})` : t("noRating")}
                                </strong>
                            </Link>
                        )}
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

                {!isSeller && item.status !== "SOLD" && checkoutOpen && (
                    <div className="checkout-panel">
                        <div className="checkout-panel__head">
                            <div>
                                <h3>{lang === "ru" ? "Способ оплаты" : "Payment method"}</h3>
                                <p>
                                    {lang === "ru"
                                        ? "Деньги будут зарезервированы в сделке до подтверждения получения."
                                        : "Funds will stay reserved in the deal until receipt is confirmed."}
                                </p>
                            </div>
                            {user && (
                                <span>
                                    {t("balance")}: {formatMoney(user.balance)}
                                </span>
                            )}
                        </div>

                        <div className="payment-options" role="radiogroup" aria-label={lang === "ru" ? "Способ оплаты" : "Payment method"}>
                            {paymentOptions.map((option) => (
                                <button
                                    className={paymentMethod === option.id ? "payment-option payment-option--active" : "payment-option"}
                                    disabled={option.disabled}
                                    key={option.id}
                                    onClick={() => setPaymentMethod(option.id)}
                                    type="button"
                                >
                                    <span className={`payment-option__icon payment-option__icon--${option.icon}`} aria-hidden="true">
                                        {option.icon === "wallet" && "₽"}
                                    </span>
                                    <span className="payment-option__text">
                                        <strong>{option.label}</strong>
                                        <span>{option.disabled ? (lang === "ru" ? "Недостаточно средств" : "Insufficient funds") : option.text}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="checkout-panel__summary">
                            <span>{lang === "ru" ? "К оплате" : "Total"}</span>
                            <strong>{formatMoney(item.price)}</strong>
                        </div>

                        <Button onClick={() => handleBuy()} disabled={buying || (paymentMethod === "BALANCE" && !canPayWithBalance)}>
                            {buying
                                ? lang === "ru"
                                    ? "Оформление..."
                                    : "Processing..."
                                : lang === "ru"
                                  ? "Оплатить и создать сделку"
                                  : "Pay and create deal"}
                        </Button>
                    </div>
                )}

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
                        <Button onClick={() => setCheckoutOpen((prev) => !prev)} disabled={buying || item.status === "SOLD"}>
                            {item.status === "SOLD"
                                ? lang === "ru"
                                    ? "Продано"
                                    : "Sold"
                                : buying
                                  ? lang === "ru"
                                      ? "Покупка..."
                                      : "Buying..."
                                  : lang === "ru"
                                    ? checkoutOpen
                                        ? "Скрыть оплату"
                                        : "Купить"
                                    : checkoutOpen
                                      ? "Hide payment"
                                      : "Buy"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
