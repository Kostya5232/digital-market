import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchItem } from "../api/items";
import { buyItem } from "../api/orders";
import { useAuth } from "../context/AuthContext";

export default function ItemDetail() {
    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { token, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;
        fetchItem(id)
            .then((data) => setItem(data))
            .catch(() => setError("Ошибка при загрузке товара"))
            .finally(() => setLoading(false));
    }, [id]);

    const handleBuy = async () => {
        if (!token) {
            setError("Вы должны войти в аккаунт, чтобы купить товар");
            return;
        }
        try {
            await buyItem(token, item.id);
            alert("Товар успешно куплен!");
            navigate("/profile");
        } catch {
            setError("Ошибка при покупке");
        }
    };

    if (loading) return <p>Загрузка...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!item) return <p>Товар не найден</p>;

    return (
        <div>
            <h1>{item.title}</h1>
            {item.imageUrl && <img src={item.imageUrl} alt={item.title} width="300" />}
            <p>{item.description}</p>
            <p>
                <b>Цена:</b> {item.price}$
            </p>
            {user && user.id === item.sellerId ? <p>Это ваш товар</p> : <button onClick={handleBuy}>Купить</button>}
        </div>
    );
}
