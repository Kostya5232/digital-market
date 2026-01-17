import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyOrders, getMySales } from "../../api/orders";
import Button from "../../components/ui/Button/Button";
import "./Profile.css";

export default function Profile() {
    const { user, token } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        Promise.all([getMyOrders(token), getMySales(token)])
            .then(([ordersData, salesData]) => {
                setOrders(ordersData);
                setSales(salesData);
            })
            .finally(() => setLoading(false));
    }, [token]);

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

                <Button onClick={() => (window.location.href = "/edit-profile")}>Редактировать профиль</Button>
            </div>
        </div>
    );
}
