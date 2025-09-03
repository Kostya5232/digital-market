import { useState } from "react";
import { createItem } from "../api/items";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AddItem() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<number>(0);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Вы должны войти в аккаунт");
            return;
        }
        try {
            await createItem(token, title, description, price, imageUrl || undefined);
            navigate("/"); // после добавления возвращаем на главную
        } catch {
            setError("Ошибка при добавлении товара");
        }
    };

    return (
        <div>
            <h1>Добавить товар</h1>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} required />
                <input type="number" placeholder="Цена" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
                <input type="text" placeholder="URL изображения (опционально)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                <button type="submit">Добавить</button>
            </form>
        </div>
    );
}
