import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    confirmDeal,
    createDealReview,
    getDeal,
    openDealDispute,
    refundDeal,
    sendDealMessage,
    updateDealDelivery,
    type Deal,
    type DealStatus,
    type PaymentMethod,
    type PaymentStatus,
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
    if (status === "CANCELLED") return t("cancelledDeal");
    return t("awaitingConfirm");
}

function paymentMethodLabel(method: PaymentMethod | undefined, lang: "ru" | "en") {
    if (method === "CARD") return lang === "ru" ? "Банковская карта RU" : "Bank card";
    if (method === "SBP") return lang === "ru" ? "СБП (QR)" : "SBP (QR)";
    if (method === "BALANCE") return lang === "ru" ? "Баланс сайта" : "Site balance";
    return lang === "ru" ? "Не указан" : "Not specified";
}

function paymentStatusLabel(status: PaymentStatus | undefined, lang: "ru" | "en") {
    if (status === "RELEASED") return lang === "ru" ? "Переведён продавцу" : "Released to seller";
    if (status === "REFUNDED") return lang === "ru" ? "Возвращён на баланс" : "Refunded to balance";
    if (status === "FAILED") return lang === "ru" ? "Ошибка оплаты" : "Payment failed";
    if (status === "PENDING") return lang === "ru" ? "Ожидает оплаты" : "Pending";
    if (status === "PAID") return lang === "ru" ? "Зарезервирован" : "Reserved";
    return lang === "ru" ? "Не указан" : "Not specified";
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
    const isActiveDeal = Boolean(deal && deal.status !== "COMPLETED" && deal.status !== "CANCELLED");
    const refundNeedsDispute = Boolean(deal?.deliveryData && deal.status !== "DISPUTED");
    const refundToBalance = deal?.payment?.method === "BALANCE" || !deal?.payment;

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

    async function requestRefund() {
        if (!token || !deal) return;
        const ok = window.confirm(
            refundToBalance
                ? lang === "ru"
                    ? "Отменить сделку и вернуть деньги на баланс? Товар снова станет доступен в каталоге."
                    : "Cancel the deal and refund the money to your balance? The item will return to the catalog."
                : lang === "ru"
                  ? "Отменить внешний платеж? В демо-режиме внутренний баланс не будет увеличен."
                  : "Cancel the external payment? In demo mode the internal balance will not increase."
        );
        if (!ok) return;

        try {
            setBusy(true);
            setError(null);
            const updated = await refundDeal(token, deal.id);
            setDeal(updated);
            await refreshMe();
        } catch {
            setError(
                lang === "ru"
                    ? "Не удалось оформить возврат. Если продавец уже выдал данные, сначала откройте спор."
                    : "Failed to refund. If delivery data was already provided, open a dispute first."
            );
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
                            <div>
                                <span>{lang === "ru" ? "Оплата" : "Payment"}</span>
                                <strong>{paymentMethodLabel(deal.payment?.method, lang)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="payment-summary">
                        <div className="deal-section-head">
                            <h2>{lang === "ru" ? "Платёж" : "Payment"}</h2>
                            <span>{paymentStatusLabel(deal.payment?.status, lang)}</span>
                        </div>
                        <div className="payment-summary__grid">
                            <div>
                                <span>{lang === "ru" ? "Сумма" : "Amount"}</span>
                                <strong>{formatMoney(deal.payment?.amount ?? deal.price)}</strong>
                            </div>
                            <div>
                                <span>{lang === "ru" ? "Метод" : "Method"}</span>
                                <strong>{paymentMethodLabel(deal.payment?.method, lang)}</strong>
                            </div>
                            <div>
                                <span>{lang === "ru" ? "Провайдер" : "Provider"}</span>
                                <strong>{deal.payment?.provider ?? (lang === "ru" ? "Старый заказ" : "Legacy deal")}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="paid-data">
                        <div className="deal-section-head">
                            <h2>{t("paidData")}</h2>
                            {isSeller && isActiveDeal && <span>{t("deliveryData")}</span>}
                        </div>

                        {deal.deliveryData ? (
                            <pre className="paid-data__content">{deal.deliveryData}</pre>
                        ) : (
                            <p className="paid-data__empty">{isSeller ? t("deliveryPlaceholder") : t("waitingDelivery")}</p>
                        )}

                        {isSeller && isActiveDeal && (
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
                        {isActiveDeal && (
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

                        {isBuyer && isActiveDeal && (
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

                        {isBuyer && isActiveDeal && (
                            <div className="refund-box">
                                <strong>{lang === "ru" ? "Отмена и возврат" : "Cancel and refund"}</strong>
                                <p>
                                    {refundNeedsDispute
                                        ? lang === "ru"
                                            ? "Продавец уже выдал данные. Для возврата сначала откройте спор."
                                            : "The seller has already provided data. Open a dispute before refunding."
                                        : refundToBalance
                                        ? lang === "ru"
                                            ? "Если товар не был получен, можно отменить сделку. Деньги вернутся на баланс сайта."
                                            : "If the item was not received, cancel the deal. Funds will return to your site balance."
                                        : lang === "ru"
                                          ? "При оплате картой или СБП внешний платеж отменяется отдельно, внутренний баланс не увеличивается."
                                          : "For card or SBP payments, the external payment is cancelled separately and the internal balance does not increase."}
                                </p>
                                <Button variant="secondary" onClick={requestRefund} disabled={busy || refundNeedsDispute}>
                                    {refundToBalance ? (lang === "ru" ? "Вернуть на баланс" : "Refund to balance") : lang === "ru" ? "Отменить платеж" : "Cancel payment"}
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
