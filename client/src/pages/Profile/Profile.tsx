import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyOrders, getMySales } from "../../api/orders";
import { getMyItems, deleteItem } from "../../api/items";
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

function formatPrice(value: number) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value);
}

export default function Profile() {
    const { user, token } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [myItems, setMyItems] = useState<MyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    async function handleDelete(id: string) {
        if (!token) return;

        const ok = window.confirm("Удалить товар? Это действие нельзя отменить.");
        if (!ok) return;

        try {
            setActionError(null);
            setDeletingId(id);
            await deleteItem(token, id);
            setMyItems((prev) => prev.filter((x) => x.id !== id));
        } catch {
            setActionError("Не удалось удалить товар.");
        } finally {
            setDeletingId(null);
        }
    }

    if (!user) return <div className="alert">Вы не авторизованы</div>;
    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="profile">
            <div className="profileCard">
                <h1 className="profileTitle">Профиль</h1>

                <div className="profileInfo">
                    <p>
                        <strong>Баланс:</strong> {user.balance}$
                    </p>
                    <p>
                        <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                        <strong>Имя:</strong> {user.username}
                    </p>
                </div>

                {actionError && <div className="alert">{actionError}</div>}

                <div className="profileSection">
                    <div className="sectionHead">
                        <h2 className="sectionTitle">Мои товары</h2>
                        <Link to="/add-item">
                            <Button variant="secondary">Добавить товар</Button>
                        </Link>
                    </div>

                    {myItems.length === 0 ? (
                        <p>Вы ещё не добавляли товары</p>
                    ) : (
                        <ul className="myItemList">
                            {myItems.map((it) => (
                                <li key={it.id} className="myItemRow">
                                    <div className="myItemMain">
                                        <div className="myItemTitle">{it.title}</div>
                                        <div className="myItemMeta">
                                            <span className={`badge ${it.status === "SOLD" ? "badge--sold" : "badge--listed"}`}>
                                                {it.status === "SOLD" ? "Продан" : "В продаже"}
                                            </span>
                                            <span className="dot">•</span>
                                            <span>{formatPrice(it.price)}</span>
                                        </div>
                                    </div>

                                    <div className="myItemActions">
                                        <Link to={`/items/${it.id}`}>
                                            <Button variant="ghost">Открыть</Button>
                                        </Link>

                                        <Link to={`/items/${it.id}/edit`}>
                                            <Button variant="secondary" disabled={it.status === "SOLD"}>
                                                Редактировать
                                            </Button>
                                        </Link>

                                        <Button
                                            variant="danger"
                                            onClick={() => handleDelete(it.id)}
                                            disabled={it.status === "SOLD" || deletingId === it.id}
                                        >
                                            {deletingId === it.id ? "Удаление..." : "Удалить"}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="profileSection">
                    <h2 className="sectionTitle">Мои покупки</h2>
                    {orders.length === 0 ? (
                        <p>Вы ещё ничего не купили</p>
                    ) : (
                        <ul className="orderList">
                            {orders.map((order) => (
                                <li key={order.id} className="orderItem">
                                    {order.item.title} — {order.price}$ — продавец: {order.seller?.username ?? "—"}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="profileSection">
                    <h2 className="sectionTitle">Мои продажи</h2>
                    {sales.length === 0 ? (
                        <p>У вас пока нет продаж</p>
                    ) : (
                        <ul className="saleList">
                            {sales.map((sale) => (
                                <li key={sale.id} className="saleItem">
                                    {sale.item.title} — {sale.price}$ — купил: {sale.buyer?.username ?? "—"}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
