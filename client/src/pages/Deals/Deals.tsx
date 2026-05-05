import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, getMySales, type Deal, type DealStatus } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import Button from "../../components/ui/Button/Button";
import "./Deals.css";

type DealTab = "purchases" | "sales";

function statusText(status: DealStatus, t: ReturnType<typeof useSettings>["t"]) {
    if (status === "COMPLETED") return t("completedDeal");
    if (status === "DISPUTED") return t("disputedDeal");
    return t("awaitingConfirm");
}

export default function Deals() {
    const { user, token } = useAuth();
    const { t, lang, formatMoney } = useSettings();

    const [tab, setTab] = useState<DealTab>("purchases");
    const [purchases, setPurchases] = useState<Deal[]>([]);
    const [sales, setSales] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const [ordersData, salesData] = await Promise.all([getMyOrders(token), getMySales(token)]);
                if (!cancelled) {
                    setPurchases(ordersData);
                    setSales(salesData);
                }
            } catch {
                if (!cancelled) setError(lang === "ru" ? "Не удалось загрузить сделки." : "Failed to load deals.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, lang]);

    const currentDeals = useMemo(() => (tab === "purchases" ? purchases : sales), [tab, purchases, sales]);

    if (!user) {
        return (
            <div className="deals-empty">
                <h1>{t("deals")}</h1>
                <p>{lang === "ru" ? "Войдите в аккаунт, чтобы увидеть сделки." : "Log in to see your deals."}</p>
                <Link to="/login">
                    <Button>{t("login")}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="deals-page">
            <div className="deals-head">
                <div>
                    <span className="deals-eyebrow">{t("deals")}</span>
                    <h1>{t("deals")}</h1>
                    <p>{lang === "ru" ? "Покупки, продажи, выдача данных и переписка по каждой сделке." : "Purchases, sales, delivery data, and chat for each deal."}</p>
                </div>

                <div className="deal-tabs" role="tablist">
                    <button className={tab === "purchases" ? "deal-tab deal-tab--active" : "deal-tab"} type="button" onClick={() => setTab("purchases")}>
                        {t("purchasesTab")}
                    </button>
                    <button className={tab === "sales" ? "deal-tab deal-tab--active" : "deal-tab"} type="button" onClick={() => setTab("sales")}>
                        {t("salesTab")}
                    </button>
                </div>
            </div>

            {error && <div className="deals-alert">{error}</div>}

            {loading ? (
                <div className="deal-list">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div className="deal-skeleton" key={idx} />
                    ))}
                </div>
            ) : currentDeals.length === 0 ? (
                <div className="deals-empty">
                    <h2>{t("noDeals")}</h2>
                    <p>{tab === "purchases" ? t("catalogSubtitle") : t("walletHint")}</p>
                </div>
            ) : (
                <div className="deal-list">
                    {currentDeals.map((deal) => {
                        const opponent = tab === "purchases" ? deal.seller : deal.buyer;
                        return (
                            <Link to={`/deals/${deal.id}`} className="deal-card" key={deal.id}>
                                <div className="deal-card__main">
                                    <div className="deal-card__title">{deal.item.title}</div>
                                    <div className="deal-card__meta">
                                        <span>{tab === "purchases" ? (lang === "ru" ? "Продавец" : "Seller") : lang === "ru" ? "Покупатель" : "Buyer"}: {opponent.username}</span>
                                        <span>{new Date(deal.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US")}</span>
                                    </div>
                                </div>

                                <div className="deal-card__side">
                                    <span className={`deal-status deal-status--${deal.status.toLowerCase()}`}>{statusText(deal.status, t)}</span>
                                    <strong>{formatMoney(deal.price)}</strong>
                                    <small>
                                        {lang === "ru" ? "Сообщений" : "Messages"}: {deal._count?.messages ?? deal.messages?.length ?? 0}
                                    </small>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
