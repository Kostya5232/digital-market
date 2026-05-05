import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDirectMessages, getSellerProfile, sendDirectMessage, type DirectMessage, type SellerProfile as SellerProfileData } from "../../api/users";
import ItemCard from "../../components/ItemCard/ItemCard";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import "./SellerProfile.css";

function Stars({ value }: { value: number }) {
    return (
        <span className="seller-stars">
            {Array.from({ length: 5 }).map((_, idx) => (
                <span className={idx < value ? "seller-stars__star seller-stars__star--filled" : "seller-stars__star"} key={idx}>
                    ★
                </span>
            ))}
        </span>
    );
}

export default function SellerProfile() {
    const { id } = useParams();
    const { user, token } = useAuth();
    const { t, lang } = useSettings();

    const [profile, setProfile] = useState<SellerProfileData | null>(null);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOwnProfile = Boolean(user && id && user.id === id);
    const canChat = Boolean(token && user && id && !isOwnProfile);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getSellerProfile(id);
                if (!cancelled) setProfile(data);
            } catch {
                if (!cancelled) setError(lang === "ru" ? "Не удалось загрузить профиль продавца." : "Failed to load seller profile.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, lang]);

    useEffect(() => {
        if (!id || !token || isOwnProfile) {
            setMessages([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setChatLoading(true);
                const data = await getDirectMessages(token, id);
                if (!cancelled) setMessages(data);
            } catch {
                if (!cancelled) setMessages([]);
            } finally {
                if (!cancelled) setChatLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, token, isOwnProfile]);

    const sellerItems = useMemo(() => {
        if (!profile) return [];
        return profile.items.map((item) => ({
            ...item,
            seller: {
                id: profile.user.id,
                username: profile.user.username,
                rating: profile.rating,
            },
        }));
    }, [profile]);

    async function submitMessage(e: React.FormEvent) {
        e.preventDefault();
        const text = message.trim();
        if (!token || !id || !text) return;

        try {
            setSending(true);
            const created = await sendDirectMessage(token, id, text);
            setMessages((prev) => [...prev, created]);
            setMessage("");
        } catch {
            setError(lang === "ru" ? "Не удалось отправить сообщение." : "Failed to send message.");
        } finally {
            setSending(false);
        }
    }

    if (loading) {
        return (
            <div className="seller-profile">
                <div className="seller-skeleton" />
                <div className="seller-skeleton" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="seller-empty">
                <h1>{t("sellerProfile")}</h1>
                <p>{error ?? (lang === "ru" ? "Профиль не найден." : "Profile not found.")}</p>
                <Link to="/">
                    <Button>{t("catalog")}</Button>
                </Link>
            </div>
        );
    }

    const roundedRating = profile.rating.average == null ? 0 : Math.round(profile.rating.average);

    return (
        <div className="seller-profile">
            <section className="seller-hero">
                <div>
                    <span className="seller-eyebrow">{t("sellerProfile")}</span>
                    <h1>{profile.user.username}</h1>
                    <p>
                        {t("memberSince")} {new Date(profile.user.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US")}
                    </p>
                </div>

                <div className="seller-stats">
                    <div>
                        <span>{t("rating")}</span>
                        <strong>{profile.rating.average == null ? t("noRating") : profile.rating.average}</strong>
                        <Stars value={roundedRating} />
                    </div>
                    <div>
                        <span>{t("reviews")}</span>
                        <strong>{profile.rating.count}</strong>
                    </div>
                    <div>
                        <span>{t("activeListings")}</span>
                        <strong>{profile.items.length}</strong>
                    </div>
                </div>
            </section>

            {error && <div className="seller-alert">{error}</div>}

            <div className="seller-layout">
                <section className="seller-main">
                    <div className="seller-section-head">
                        <h2>{t("sellerItems")}</h2>
                    </div>

                    {sellerItems.length === 0 ? (
                        <div className="seller-empty seller-empty--inline">
                            <h2>{lang === "ru" ? "Активных товаров нет" : "No active listings"}</h2>
                        </div>
                    ) : (
                        <div className="seller-items-grid">
                            {sellerItems.map((item) => (
                                <ItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    <div className="seller-reviews">
                        <div className="seller-section-head">
                            <h2>{t("reviews")}</h2>
                        </div>

                        {profile.reviews.length === 0 ? (
                            <p className="seller-muted">{t("noReviews")}</p>
                        ) : (
                            <div className="seller-review-list">
                                {profile.reviews.map((review) => (
                                    <article className="seller-review" key={review.id}>
                                        <div className="seller-review__top">
                                            <strong>{review.buyer.username}</strong>
                                            <Stars value={review.rating} />
                                        </div>
                                        <span>{review.order.item.title}</span>
                                        {review.comment && <p>{review.comment}</p>}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="seller-chat">
                    <div className="seller-section-head">
                        <h2>{t("messageSeller")}</h2>
                    </div>

                    {!user ? (
                        <div className="seller-chat__notice">
                            <p>{lang === "ru" ? "Войдите, чтобы написать продавцу." : "Log in to message the seller."}</p>
                            <Link to="/login">
                                <Button>{t("login")}</Button>
                            </Link>
                        </div>
                    ) : isOwnProfile ? (
                        <p className="seller-muted">{lang === "ru" ? "Это ваш публичный профиль." : "This is your public profile."}</p>
                    ) : (
                        <>
                            <div className="seller-chat-list">
                                {chatLoading ? (
                                    <p className="seller-muted">{t("loading")}</p>
                                ) : messages.length === 0 ? (
                                    <p className="seller-muted">{lang === "ru" ? "Сообщений пока нет." : "No messages yet."}</p>
                                ) : (
                                    messages.map((msg) => (
                                        <div className={msg.senderId === user.id ? "seller-message seller-message--mine" : "seller-message"} key={msg.id}>
                                            <div className="seller-message__meta">
                                                <span>{msg.sender.username}</span>
                                                <time>{new Date(msg.createdAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}</time>
                                            </div>
                                            <p>{msg.body}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form className="seller-chat-form" onSubmit={submitMessage}>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePlaceholder")} />
                                <Button type="submit" disabled={!canChat || sending || !message.trim()}>
                                    {t("send")}
                                </Button>
                            </form>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
