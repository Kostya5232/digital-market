import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyOrders, getMySales } from "../api/orders";

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

    if (!user) return <p>Вы не авторизованы</p>;
    if (loading) return <p>Загрузка...</p>;

    return (
        <div>
            <h1>Профиль</h1>
            <p>Баланс: {user.balance}$</p>
            <p>Email: {user.email}</p>
            <p>Имя: {user.username}</p>

            <h2>Мои покупки</h2>
            {orders.length === 0 ? (
                <p>Вы ещё ничего не купили</p>
            ) : (
                <ul>
                    {orders.map((order) => (
                        <li key={order.id}>
                            {order.item.title} — {order.price}$ — продавец: {order.seller?.username ?? "—"}
                        </li>
                    ))}
                </ul>
            )}

            <h2>Мои продажи</h2>
            {sales.length === 0 ? (
                <p>У вас пока нет продаж</p>
            ) : (
                <ul>
                    {sales.map((sale) => (
                        <li key={sale.id}>
                            {sale.item.title} — {sale.price}$ — купил: {sale.buyer?.username ?? "—"}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
