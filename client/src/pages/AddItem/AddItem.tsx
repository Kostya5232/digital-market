import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { createItem } from "../../api/items";
import "./AddItem.css";

export default function AddItem() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<number>(0);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Вы должны войти в аккаунт");
            return;
        }

        if (!title || !description || price <= 0) {
            setError("Заполните все поля правильно");
            return;
        }

        try {
            setLoading(true);
            await createItem(token, title, description, price, imageUrl || undefined);
            navigate("/");
        } catch {
            setError("Ошибка при добавлении товара");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="addItemPage">
            <div className="addItemCard">
                <h1 className="addItemTitle">Добавить товар</h1>
                {error && <div className="alert">{error}</div>}

                <form onSubmit={handleSubmit} className="addItemForm">
                    <div className="field">
                        <label className="label">Название товара</label>
                        <input
                            type="text"
                            placeholder="Введите название"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Описание</label>
                        <textarea
                            placeholder="Введите описание"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Цена</label>
                        <input
                            type="number"
                            placeholder="Введите цену"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            required
                            className="input"
                        />
                    </div>

                    <div className="field">
                        <label className="label">URL изображения (опционально)</label>
                        <input
                            type="text"
                            placeholder="Введите URL изображения"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="input"
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="addItemButton">
                        {loading ? "Добавление..." : "Добавить товар"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
