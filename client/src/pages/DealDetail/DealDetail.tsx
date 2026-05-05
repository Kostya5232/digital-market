import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    confirmDeal,
    createDealReview,
    getDeal,
    openDealDispute,
    sendDealMessage,
    updateDealDelivery,
    type Deal,
    type DealStatus,
} from "../../api/orders";
import { API_URL } from "../../api/auth";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { categoryLabel } from "../../lib/categories";
import "./DealDetail.css";

function statusText(status: DealStatus, t: ReturnType<typeof useSettings>["t"]) {
    if (status === "COMPLETED") return t("completedDeal");
    if (status === "DISPUTED") return t("disputedDeal");
    return t("awaitingConfirm");
}

function Stars({ value }: { value: number }) {
    return (
        <span className="stars" aria-label={`${value}/5`}>
            {Array.from({ length: 5 }).map((_, idx) => (
                <span className={idx < value ? "stars__star stars__star--filled" : "stars__star"} key={idx}>
                    ★
                </span>
            ))}
        </span>
    );
}

export default function DealDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token, refreshMe } = useAuth();
    const { t, lang, formatMoney } = useSettings();

    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [deliveryDraft, setDeliveryDraft] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [busy, setBusy] = useState(false);
    const [savingReview, setSavingReview] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !id) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getDeal(token, id);
                if (!cancelled) {
                    setDeal(data);
                    setDeliveryDraft(data.deliveryData ?? "");
                    setReviewRating(data.review?.rating ?? 5);
                    setReviewComment(data.review?.comment ?? "");
                }
            } catch {
                if (!cancelled) setError(lang === "ru" ? "Не удалось загрузить сделку." : "Failed to load deal.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, id, lang]);

    const isBuyer = Boolean(user && deal && deal.buyerId === user.id);
    const isSeller = Boolean(user && deal && deal.sellerId === user.id);

    const imgSrc = useMemo(() => {
        if (!deal?.item.hasImage) return null;
        if (deal.item.updatedAt) return `${API_URL}/items/${deal.item.id}/image?v=${encodeURIComponent(deal.item.updatedAt)}`;
        return `${API_URL}/items/${deal.item.id}/image`;
    }, [deal]);

    async function submitMessage(e: React.FormEvent) {
        e.preventDefault();
        const text = message.trim();
        if (!token || !deal || !text) return;

        try {
            setBusy(true);
            setError(null);
            const created = await sendDealMessage(token, deal.id, text);
            setDeal((prev) => (prev ? { ...prev, messages: [...(prev.messages ?? []), created] } : prev));
            setMessage("");
        } catch {
            setError(lang === "ru" ? "Не удалось отправить сообщение." : "Failed to send message.");
        } finally {
            setBusy(false);
        }
    }

    async function saveDelivery() {
        const text = deliveryDraft.trim();
        if (!token || !deal || !text) return;

        try {
            setBusy(true);
            setError(null);
            const updated = await updateDealDelivery(token, deal.id, text);
            setDeal(updated);
            setDeliveryDraft(updated.deliveryData ?? "");
        } catch {
            setError(lang === "ru" ? "Не удалось сохранить данные выдачи." : "Failed to save delivery data.");
        } finally {
            setBusy(false);
        }
    }

    async function confirmReceipt() {
        if (!token || !deal) return;
        const ok = window.confirm(
            lang === "ru"
                ? "Подтвердить получение товара? После подтверждения деньги будут переведены продавцу."
                : "Confirm receipt? After confirmation the money will be released to the seller."
        );
        if (!ok) return;

        try {
            setBusy(true);
            setError(null);
            const updated = await confirmDeal(token, deal.id);
            setDeal(updated);
            await refreshMe();
        } catch {
            setError(lang === "ru" ? "Не удалось подтвердить получение." : "Failed to confirm receipt.");
        } finally {
            setBusy(false);
        }
    }

    async function disputeDeal() {
        if (!token || !deal) return;

        try {
            setBusy(true);
            setError(null);
            const updated = await openDealDispute(token, deal.id);
            setDeal(updated);
        } catch {
            setError(lang === "ru" ? "Не удалось открыть спор." : "Failed to open dispute.");
        } finally {
            setBusy(false);
        }
    }

    async function submitReview(e: React.FormEvent) {
        e.preventDefault();
        if (!token || !deal) return;

        try {
            setSavingReview(true);
            setError(null);
            const review = await createDealReview(token, deal.id, reviewRating, reviewComment.trim());
            setDeal((prev) => (prev ? { ...prev, review } : prev));
        } catch {
            setError(lang === "ru" ? "Не удалось сохранить отзыв." : "Failed to save review.");
        } finally {
            setSavingReview(false);
        }
    }

    if (!user) {
        return (
            <div className="deal-empty">
                <h1>{t("dealDetails")}</h1>
                <p>{lang === "ru" ? "Войдите, чтобы открыть сделку." : "Log in to open this deal."}</p>
                <Link to="/login">
                    <Button>{t("login")}</Button>
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="deal-detail">
                <div className="deal-detail__skeleton" />
                <div className="deal-detail__skeleton" />
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="deal-empty">
                <h1>{t("dealDetails")}</h1>
                <p>{error ?? (lang === "ru" ? "Сделка не найдена." : "Deal not found.")}</p>
                <Button variant="secondary" onClick={() => navigate("/deals")}>
                    {t("deals")}
                </Button>
            </div>
        );
    }

    return (
        <div className="deal-detail">
            <div className="deal-detail__head">
                <div>
                    <span className={`deal-status deal-status--${deal.status.toLowerCase()}`}>{statusText(deal.status, t)}</span>
                    <h1>{t("dealDetails")}</h1>
                    <p>
                        {deal.buyer.username} ↔ {deal.seller.username}
                    </p>
                </div>

                <Link to="/deals">
                    <Button variant="secondary">{t("deals")}</Button>
                </Link>
            </div>

            {error && <div className="deal-alert">{error}</div>}

            <div className="deal-layout">
                <section className="deal-product">
                    <div className="deal-product__media">
                        {imgSrc ? <img src={imgSrc} alt={deal.item.title} /> : <div>{lang === "ru" ? "Нет изображения" : "No image"}</div>}
                    </div>

                    <div className="deal-product__body">
                        <div className="deal-product__top">
                            <div>
                                <h2>{deal.item.title}</h2>
                                <p>{categoryLabel(deal.item.category, lang)}</p>
                            </div>
                            <strong>{formatMoney(deal.price)}</strong>
                        </div>

                        <p className="deal-product__desc">{deal.item.description}</p>

                        <div className="deal-facts">
                            <div>
                                <span>{lang === "ru" ? "Покупатель" : "Buyer"}</span>
                                <strong>{deal.buyer.username}</strong>
                            </div>
                            <div>
                                <span>{lang === "ru" ? "Продавец" : "Seller"}</span>
                                <strong>{deal.seller.username}</strong>
                            </div>
                            <div>
                                <span>{lang === "ru" ? "Создана" : "Created"}</span>
                                <strong>{new Date(deal.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US")}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="paid-data">
                        <div className="deal-section-head">
                            <h2>{t("paidData")}</h2>
                            {isSeller && deal.status !== "COMPLETED" && <span>{t("deliveryData")}</span>}
                        </div>

                        {deal.deliveryData ? (
                            <pre className="paid-data__content">{deal.deliveryData}</pre>
                        ) : (
                            <p className="paid-data__empty">{isSeller ? t("deliveryPlaceholder") : t("waitingDelivery")}</p>
                        )}

                        {isSeller && deal.status !== "COMPLETED" && (
                            <div className="delivery-editor">
                                <textarea value={deliveryDraft} onChange={(e) => setDeliveryDraft(e.target.value)} placeholder={t("deliveryPlaceholder")} />
                                <Button onClick={saveDelivery} disabled={busy || !deliveryDraft.trim()}>
                                    {t("saveDelivery")}
                                </Button>
                            </div>
                        )}
                    </div>
                </section>

                <aside className="deal-chat">
                    <div className="deal-section-head">
                        <h2>{t("chat")}</h2>
                        {deal.status !== "COMPLETED" && (
                            <Button variant="ghost" onClick={disputeDeal} disabled={busy || deal.status === "DISPUTED"}>
                                {t("openDispute")}
                            </Button>
                        )}
                    </div>

                    <div className="chat-list">
                        {(deal.messages ?? []).map((msg) => (
                            <div
                                className={`chat-message chat-message--${msg.type.toLowerCase()} ${msg.authorId === user.id ? "chat-message--mine" : ""}`}
                                key={msg.id}
                            >
                                <div className="chat-message__meta">
                                    <span>{msg.type === "SYSTEM" ? t("deals") : msg.author.username}</span>
                                    <time>{new Date(msg.createdAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}</time>
                                </div>
                                <p>{msg.body}</p>
                            </div>
                        ))}

                        {isBuyer && deal.status !== "COMPLETED" && (
                            <div className="confirm-box">
                                <strong>{t("confirmReceipt")}</strong>
                                <p>
                                    {deal.deliveryData
                                        ? lang === "ru"
                                            ? "Если товар получен и данные подошли, подтвердите сделку. Деньги уйдут продавцу."
                                            : "If the item is received and the data works, confirm the deal. The money will be released."
                                        : t("waitingDelivery")}
                                </p>
                                <Button onClick={confirmReceipt} disabled={busy || !deal.deliveryData}>
                                    {t("confirmReceipt")}
                                </Button>
                            </div>
                        )}
                    </div>

                    <form className="chat-form" onSubmit={submitMessage}>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePlaceholder")} />
                        <Button type="submit" disabled={busy || !message.trim()}>
                            {t("send")}
                        </Button>
                    </form>
                </aside>
            </div>

            <section className="deal-reviews">
                <div className="deal-section-head">
                    <h2>{t("reviews")}</h2>
                    {deal.review && <span>{t("yourReview")}</span>}
                </div>

                {deal.review ? (
                    <div className="review-card">
                        <div className="review-card__top">
                            <strong>{deal.review.buyer.username}</strong>
                            <Stars value={deal.review.rating} />
                        </div>
                        {deal.review.comment && <p>{deal.review.comment}</p>}
                    </div>
                ) : (
                    <p className="review-empty">{deal.status === "COMPLETED" ? t("noReviews") : lang === "ru" ? "Отзыв можно оставить после завершения сделки." : "Review is available after completion."}</p>
                )}

                {isBuyer && deal.status === "COMPLETED" && (
                    <form className="review-form" onSubmit={submitReview}>
                        <div>
                            <label>{t("leaveReview")}</label>
                            <div className="star-input" role="radiogroup" aria-label={t("rating")}>
                                {Array.from({ length: 5 }).map((_, idx) => {
                                    const value = idx + 1;
                                    return (
                                        <button
                                            className={value <= reviewRating ? "star-input__button star-input__button--active" : "star-input__button"}
                                            key={value}
                                            type="button"
                                            onClick={() => setReviewRating(value)}
                                        >
                                            ★
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <label>
                            {t("comment")}
                            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={t("reviewPlaceholder")} />
                        </label>

                        <Button type="submit" disabled={savingReview}>
                            {t("saveReview")}
                        </Button>
                    </form>
                )}
            </section>
        </div>
    );
}
