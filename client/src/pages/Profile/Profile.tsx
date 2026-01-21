import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { getMyOrders, getMySales } from "../../api/orders";
import { getMyItems, deleteItem } from "../../api/items";
import { updateMe } from "../../api/auth";
import Button from "../../components/ui/Button/Button";
import "./Profile.css";

type MyItem = {
    id: string;
    title: string;
    description?: string;
    price: number;
    status: "LISTED" | "SOLD";
    hasImage?: boolean;
    updatedAt?: string;
};

type Tab = "purchases" | "sales" | "items" | "settings";

export default function Profile() {
    const { user, token, refreshMe } = useAuth();
    const { t, lang, currency, setLang, setCurrency, formatMoney } = useSettings();

    const [tab, setTab] = useState<Tab>("items");

    const [orders, setOrders] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [myItems, setMyItems] = useState<MyItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [actionError, setActionError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [newUsername, setNewUsername] = useState("");
    const [savingUser, setSavingUser] = useState(false);
    const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([getMyOrders(token), getMySales(token), getMyItems(token)])
            .then(([ordersData, salesData, itemsData]) => {
                setOrders(ordersData);
                setSales(salesData);
                setMyItems(itemsData);
            })
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => {
        if (user?.username) setNewUsername(user.username);
    }, [user?.username]);

    async function handleDelete(id: string) {
        if (!token) return;

        const ok = window.confirm(lang === "ru" ? "Удалить товар? Это действие нельзя отменить." : "Delete item? This cannot be undone.");
        if (!ok) return;

        try {
            setActionError(null);
            setDeletingId(id);
            await deleteItem(token, id);
            setMyItems((prev) => prev.filter((x) => x.id !== id));
        } catch {
            setActionError(lang === "ru" ? "Не удалось удалить товар." : "Failed to delete item.");
        } finally {
            setDeletingId(null);
        }
    }

    async function saveUsername() {
        if (!token) return;
        const name = newUsername.trim();
        if (name.length < 3) {
            setSettingsMsg(lang === "ru" ? "Никнейм слишком короткий." : "Nickname is too short.");
            return;
        }

        try {
            setSavingUser(true);
            setSettingsMsg(null);
            await updateMe(token, name);
            await refreshMe();
            setSettingsMsg(lang === "ru" ? "Сохранено." : "Saved.");
        } catch {
            setSettingsMsg(lang === "ru" ? "Не удалось сохранить никнейм." : "Failed to save nickname.");
        } finally {
            setSavingUser(false);
        }
    }

    const tabs = useMemo(
        () => [
            { id: "items" as const, label: t("myItems") },
            { id: "purchases" as const, label: t("purchases") },
            { id: "sales" as const, label: t("sales") },
            { id: "settings" as const, label: t("settings") },
        ],
        [t]
    );

    if (!user) return <div className="alert">Вы не авторизованы</div>;
    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="profile">
            <div className="profileCard profileCard--wide">
                <div className="profileHeader">
                    <div>
                        <h1 className="profileTitle">{t("profile")}</h1>
                        <div className="profileInfo">
                            <span>
                                <strong>Email:</strong> {user.email}
                            </span>
                            <span className="dot">•</span>
                            <span>
                                <strong>{t("nickname")}:</strong> {user.username}
                            </span>
                            <span className="dot">•</span>
                            <span>
                                <strong>Balance:</strong> {user.balance}$
                            </span>
                        </div>
                    </div>

                    <div className="profileTabs">
                        {tabs.map((x) => (
                            <button
                                key={x.id}
                                className={`tabBtn ${tab === x.id ? "tabBtn--active" : ""}`}
                                onClick={() => setTab(x.id)}
                                type="button"
                            >
                                {x.label}
                            </button>
                        ))}
                    </div>
                </div>

                {actionError && <div className="alert">{actionError}</div>}

                {tab === "items" && (
                    <div className="profileSection">
                        <div className="sectionHead">
                            <h2 className="sectionTitle">{t("myItems")}</h2>
                            <Link to="/add-item">
                                <Button variant="secondary">+ Add</Button>
                            </Link>
                        </div>

                        {myItems.length === 0 ? (
                            <p>{lang === "ru" ? "Вы ещё не добавляли товары" : "You have no listings yet"}</p>
                        ) : (
                            <ul className="myItemList">
                                {myItems.map((it) => (
                                    <li key={it.id} className="myItemRow">
                                        <div className="myItemMain">
                                            <div className="myItemTitle">{it.title}</div>
                                            <div className="myItemMeta">
                                                <span className={`badge ${it.status === "SOLD" ? "badge--sold" : "badge--listed"}`}>
                                                    {it.status === "SOLD"
                                                        ? lang === "ru"
                                                            ? "Продан"
                                                            : "Sold"
                                                        : lang === "ru"
                                                        ? "В продаже"
                                                        : "Listed"}
                                                </span>
                                                <span className="dot">•</span>
                                                <span>{formatMoney(it.price)}</span>
                                            </div>
                                        </div>

                                        <div className="myItemActions">
                                            <Link to={`/items/${it.id}`}>
                                                <Button variant="ghost">{t("open")}</Button>
                                            </Link>

                                            <Link to={`/items/${it.id}/edit`}>
                                                <Button variant="secondary" disabled={it.status === "SOLD"}>
                                                    {t("edit")}
                                                </Button>
                                            </Link>

                                            <Button
                                                variant="secondary"
                                                className="dangerBtn"
                                                onClick={() => handleDelete(it.id)}
                                                disabled={it.status === "SOLD" || deletingId === it.id}
                                            >
                                                {deletingId === it.id ? (lang === "ru" ? "Удаление..." : "Deleting...") : t("delete")}
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {tab === "purchases" && (
                    <div className="profileSection">
                        <h2 className="sectionTitle">{t("purchases")}</h2>
                        {orders.length === 0 ? (
                            <p>{lang === "ru" ? "Вы ещё ничего не купили" : "No purchases yet"}</p>
                        ) : (
                            <ul className="orderList">
                                {orders.map((order) => (
                                    <li key={order.id} className="orderItem">
                                        {order.item.title} — {formatMoney(Number(order.price))} — {lang === "ru" ? "продавец" : "seller"}:{" "}
                                        {order.seller?.username ?? "—"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {tab === "sales" && (
                    <div className="profileSection">
                        <h2 className="sectionTitle">{t("sales")}</h2>
                        {sales.length === 0 ? (
                            <p>{lang === "ru" ? "У вас пока нет продаж" : "No sales yet"}</p>
                        ) : (
                            <ul className="saleList">
                                {sales.map((sale) => (
                                    <li key={sale.id} className="saleItem">
                                        {sale.item.title} — {formatMoney(Number(sale.price))} — {lang === "ru" ? "купил" : "buyer"}:{" "}
                                        {sale.buyer?.username ?? "—"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {tab === "settings" && (
                    <div className="profileSection">
                        <h2 className="sectionTitle">{t("settings")}</h2>

                        <div className="settingsGrid">
                            <div className="settingsBlock">
                                <div className="settingsLabel">{t("language")}</div>
                                <select className="select" value={lang} onChange={(e) => setLang(e.target.value as any)}>
                                    <option value="ru">Русский</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <div className="settingsBlock">
                                <div className="settingsLabel">{t("currency")}</div>
                                <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
                                    <option value="RUB">RUB (₽)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                                <div className="mutedSmall">
                                    {lang === "ru"
                                        ? "USD считается по фикс-курсу (можно поменять в SettingsContext)."
                                        : "USD uses a fixed rate (change in SettingsContext)."}
                                </div>
                            </div>

                            <div className="settingsBlock settingsBlock--full">
                                <div className="settingsLabel">{t("nickname")}</div>
                                <input
                                    className="input"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="username"
                                />
                                <div className="settingsActions">
                                    <Button onClick={saveUsername} disabled={savingUser}>
                                        {savingUser ? (lang === "ru" ? "Сохранение..." : "Saving...") : t("save")}
                                    </Button>
                                    {settingsMsg && <div className="mutedSmall">{settingsMsg}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
