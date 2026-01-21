import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import { createItem } from "../../api/items";
import { CATEGORIES, ItemCategory, categoryLabel } from "../../lib/categories";
import { useSettings } from "../../context/SettingsContext";
import "./AddItem.css";

export default function AddItem() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const { lang, t } = useSettings();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<number>(0);
    const [category, setCategory] = useState<ItemCategory>(ItemCategory.OTHER);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) return setError("Вы должны войти в аккаунт");
        if (!title.trim() || !description.trim() || price <= 0) return setError("Заполните все поля правильно");

        try {
            setLoading(true);
            await createItem(token, title.trim(), description.trim(), price, category, imageFile);
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
                        <label className="label">{t("category")}</label>
                        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {categoryLabel(c, lang)}
                                </option>
                            ))}
                        </select>
                    </div>
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
                        <label className="label">Изображение (jpg/png/webp)</label>
                        <input
                            className="input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
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
