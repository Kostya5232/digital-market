import { useEffect, useState } from "react";
import { fetchItems } from "../api/items";
import { Link } from "react-router-dom";

export default function Home() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchItems()
            .then((data) => setItems(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Загрузка...</div>;

    return (
        <div>
            <h1>Каталог товаров</h1>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        <Link to={`/items/${item.id}`}>
                            {item.title} — {item.price}$
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
