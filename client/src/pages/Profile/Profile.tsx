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

type DealStatus = "PAID" | "COMPLETED" | "DISPUTED" | "CANCELLED";

type Order = {
    id: string;
    item: { title: string };
    price: number | string;
    status?: DealStatus;
    createdAt?: string;
    seller?: { username?: string } | null;
};

type Sale = {
    id: string;
    item: { title: string };
    price: number | string;
    status?: DealStatus;
    createdAt?: string;
    buyer?: { username?: string } | null;
};

type Tab = "purchases" | "sales" | "items" | "settings";

function initials(username: string) {
    return username.trim().slice(0, 2).toUpperCase();
}

function dealStatusLabel(status: DealStatus | undefined, lang: "ru" | "en") {
    if (status === "COMPLETED") return lang === "ru" ? "Завершена" : "Completed";
    if (status === "DISPUTED") return lang === "ru" ? "Спор" : "Dispute";
    if (status === "CANCELLED") return lang === "ru" ? "Отменена" : "Cancelled";
    return lang === "ru" ? "В процессе" : "In progress";
}

export default function Profile() {
    const { user, token, refreshMe } = useAuth();
    const { t, lang, currency, setLang, setCurrency, formatMoney } = useSettings();

    const [tab, setTab] = useState<Tab>("items");

    const [orders, setOrders] = useState<Order[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [myItems, setMyItems] = useState<MyItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [actionError, setActionError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [newUsername, setNewUsername] = useState("");
    const [savingUser, setSavingUser] = useState(false);
    const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

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

    const listedItems = useMemo(() => myItems.filter((item) => item.status === "LISTED").length, [myItems]);
    const soldItems = useMemo(() => myItems.filter((item) => item.status === "SOLD").length, [myItems]);

    if (!user) return <div className="alert">{lang === "ru" ? "Вы не авторизованы" : "You are not authorized"}</div>;

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profileSkeleton" />
                <div className="profileSkeleton profileSkeleton--small" />
            </div>
        );
    }

    return (
        <div className="profile-page">
            <section className="profileHero">
                <div className="profileHero__identity">
                    <div className="profileAvatar">{initials(user.username)}</div>
                    <div>
                        <span className="profileEyebrow">{t("profile")}</span>
                        <h1 className="profileTitle">{user.username}</h1>
                        <div className="profileInfo">
                            <span>{user.email}</span>
                            <span className="dot">•</span>
                            <span>{user.role ?? "USER"}</span>
                        </div>
                    </div>
                </div>

                <div className="profileHero__side">
                    <div className="balancePanel">
                        <span>{t("balance")}</span>
                        <strong>{formatMoney(user.balance)}</strong>
                        <p>{lang === "ru" ? "Средства доступны для покупок и сделок." : "Funds are available for purchases and deals."}</p>
                    </div>
                    <div className="profileQuickActions">
                        <Link to="/deals">
                            <Button variant="secondary">{t("deals")}</Button>
                        </Link>
                        <Link to="/add-item">
                            <Button>{t("addItem")}</Button>
                        </Link>
                    </div>
                </div>
            </section>

            <section className="profileStats">
                <div className="profileStat">
                    <span>{lang === "ru" ? "Активные товары" : "Active listings"}</span>
                    <strong>{listedItems}</strong>
                </div>
                <div className="profileStat">
                    <span>{lang === "ru" ? "Продано товаров" : "Sold items"}</span>
                    <strong>{soldItems}</strong>
                </div>
                <div className="profileStat">
                    <span>{t("purchases")}</span>
                    <strong>{orders.length}</strong>
                </div>
                <div className="profileStat">
                    <span>{t("sales")}</span>
                    <strong>{sales.length}</strong>
                </div>
            </section>

            <section className="profileWorkspace">
                <div className="profileTabs" role="tablist">
                    {tabs.map((x) => (
                        <button key={x.id} className={`tabBtn ${tab === x.id ? "tabBtn--active" : ""}`} onClick={() => setTab(x.id)} type="button">
                            {x.label}
                        </button>
                    ))}
                </div>

                {actionError && <div className="alert">{actionError}</div>}

                {tab === "items" && (
                    <div className="profileSection">
                        <div className="sectionHead">
                            <div>
                                <h2 className="sectionTitle">{t("myItems")}</h2>
                                <p className="sectionSubtitle">{lang === "ru" ? "Управление товарами, которые вы выставили." : "Manage the items you listed."}</p>
                            </div>
                            <Link to="/add-item">
                                <Button variant="secondary">{t("addItem")}</Button>
                            </Link>
                        </div>

                        {myItems.length === 0 ? (
                            <div className="emptyState">
                                <h3>{lang === "ru" ? "Товаров пока нет" : "No listings yet"}</h3>
                                <p>{lang === "ru" ? "Добавьте первый товар, чтобы он появился в каталоге." : "Add your first item to show it in the catalog."}</p>
                                <Link to="/add-item">
                                    <Button>{t("addItem")}</Button>
                                </Link>
                            </div>
                        ) : (
                            <ul className="myItemList">
                                {myItems.map((it) => (
                                    <li key={it.id} className="myItemRow">
                                        <div className="myItemMain">
                                            <div className="myItemTitle">{it.title}</div>
                                            <div className="myItemMeta">
                                                <span className={`badge ${it.status === "SOLD" ? "badge--sold" : "badge--listed"}`}>
                                                    {it.status === "SOLD" ? (lang === "ru" ? "Продан" : "Sold") : lang === "ru" ? "В продаже" : "Listed"}
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
                            <div className="emptyState">
                                <h3>{lang === "ru" ? "Покупок пока нет" : "No purchases yet"}</h3>
                                <p>{lang === "ru" ? "После покупки сделки появятся здесь и в разделе сделок." : "After a purchase, deals will appear here and in Deals."}</p>
                            </div>
                        ) : (
                            <ul className="orderList">
                                {orders.map((order) => (
                                    <li key={order.id} className="historyItem">
                                        <div>
                                            <Link to={`/deals/${order.id}`} className="historyTitle">
                                                {order.item.title}
                                            </Link>
                                            <div className="historyMeta">
                                                <span>
                                                    {lang === "ru" ? "Продавец" : "Seller"}: {order.seller?.username ?? "—"}
                                                </span>
                                                <span className="dot">•</span>
                                                <span>{dealStatusLabel(order.status, lang)}</span>
                                            </div>
                                        </div>
                                        <strong>{formatMoney(Number(order.price))}</strong>
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
                            <div className="emptyState">
                                <h3>{lang === "ru" ? "Продаж пока нет" : "No sales yet"}</h3>
                                <p>{lang === "ru" ? "Здесь будут отображаться сделки, где вы продавец." : "Deals where you are the seller will appear here."}</p>
                            </div>
                        ) : (
                            <ul className="saleList">
                                {sales.map((sale) => (
                                    <li key={sale.id} className="historyItem">
                                        <div>
                                            <Link to={`/deals/${sale.id}`} className="historyTitle">
                                                {sale.item.title}
                                            </Link>
                                            <div className="historyMeta">
                                                <span>
                                                    {lang === "ru" ? "Покупатель" : "Buyer"}: {sale.buyer?.username ?? "—"}
                                                </span>
                                                <span className="dot">•</span>
                                                <span>{dealStatusLabel(sale.status, lang)}</span>
                                            </div>
                                        </div>
                                        <strong>{formatMoney(Number(sale.price))}</strong>
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
                                <select className="select" value={lang} onChange={(e) => setLang(e.target.value as "ru" | "en")}>
                                    <option value="ru">Русский</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <div className="settingsBlock">
                                <div className="settingsLabel">{t("currency")}</div>
                                <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value as "RUB" | "USD")}>
                                    <option value="RUB">RUB (₽)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                                <div className="mutedSmall">
                                    {lang === "ru" ? "USD считается по фиксированному курсу." : "USD uses a fixed rate (change in SettingsContext)."}
                                </div>
                            </div>

                            <div className="settingsBlock settingsBlock--full">
                                <div className="settingsLabel">{t("nickname")}</div>
                                <input className="input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" />
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
            </section>
        </div>
    );
}
