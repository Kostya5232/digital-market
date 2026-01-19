import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import { useAuth } from "../../context/AuthContext";

import { API_URL, fetchItem } from "../../services/api";

import { updateItem } from "../../api/items";

import "./EditItem.css";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;

    sellerId?: string; // кто выложил
    ownerId?: string | null;

    hasImage?: boolean;
    updatedAt?: string;
};

function formatPrice(value: number) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value);
}

export default function EditItem() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);

    // поля формы
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<number>(0);

    // картинка
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // текущая картинка товара (если есть)
    const currentImgSrc = useMemo(() => {
        if (!item?.hasImage) return null;

        // версия, чтобы не ловить кэш
        if (item.updatedAt) {
            return `${API_URL}/items/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`;
        }
        return `${API_URL}/items/${item.id}/image`;
    }, [item]);

    // превью выбранного файла
    const newImgPreview = useMemo(() => {
        if (!newImageFile) return null;
        return URL.createObjectURL(newImageFile);
    }, [newImageFile]);

    useEffect(() => {
        return () => {
            if (newImgPreview) URL.revokeObjectURL(newImgPreview);
        };
    }, [newImgPreview]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    setError("Нет id товара в URL.");
                    return;
                }

                const data = await fetchItem(id);

                // приведение к нашему виду
                const normalized: Item = {
                    id: String(data.id),
                    title: data.title,
                    description: data.description,
                    price: Number(data.price),

                    sellerId: data.sellerId ?? data.seller_id,
                    ownerId: data.ownerId ?? data.owner_id,

                    hasImage: data.hasImage ?? Boolean(data.imageMime ?? data.image_mime),
                    updatedAt: data.updatedAt ?? data.updated_at,
                };

                if (!cancelled) {
                    setItem(normalized);
                    setTitle(normalized.title ?? "");
                    setDescription(normalized.description ?? "");
                    setPrice(Number.isFinite(normalized.price) ? normalized.price : 0);
                }
            } catch (e: any) {
                if (!cancelled) setError("Не удалось загрузить товар.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const isSeller = Boolean(user && item && item.sellerId && user.id === item.sellerId);

    async function onSave(e: React.FormEvent) {
        e.preventDefault();

        setError(null);

        if (!token || !user) {
            setError("Нужно войти в аккаунт.");
            return;
        }

        if (!item) return;

        if (!isSeller) {
            setError("Вы можете редактировать только свои товары.");
            return;
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();

        if (cleanTitle.length < 2) {
            setError("Название слишком короткое.");
            return;
        }

        if (cleanDescription.length < 1) {
            setError("Описание обязательно.");
            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            setError("Цена должна быть больше 0.");
            return;
        }

        try {
            setSaving(true);

            const updated = await updateItem(token, item.id, { title: cleanTitle, description: cleanDescription, price }, newImageFile, removeImage);

            // обновим локальный item (для обновления превью и v=updatedAt)
            const next: Item = {
                id: String(updated.id),
                title: updated.title,
                description: updated.description,
                price: Number(updated.price),

                sellerId: updated.sellerId ?? updated.seller_id,
                ownerId: updated.ownerId ?? updated.owner_id,

                hasImage: updated.hasImage ?? Boolean(updated.imageMime ?? updated.image_mime),
                updatedAt: updated.updatedAt ?? updated.updated_at,
            };

            setItem(next);
            setNewImageFile(null);
            setRemoveImage(false);

            // можно сразу возвращать на карточку товара
            navigate(`/items/${next.id}`);
        } catch (e: any) {
            setError("Ошибка при сохранении. Проверь поля и попробуй снова.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="editPage">
                <div className="editCard">
                    <div className="editSkeleton" />
                    <div className="editSkeleton" />
                    <div className="editSkeleton" />
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="editPage">
                <div className="editCard">
                    <h1 className="editTitle">Редактирование</h1>
                    <div className="editAlert">Товар не найден.</div>
                    <Link to="/">
                        <Button>Вернуться в каталог</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!isSeller) {
        return (
            <div className="editPage">
                <div className="editCard">
                    <h1 className="editTitle">Редактирование</h1>
                    <div className="editAlert">Вы можете редактировать только свои товары.</div>
                    <Link to={`/items/${item.id}`}>
                        <Button variant="secondary">Назад к товару</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="editPage">
            <div className="editCard">
                <div className="editHead">
                    <div>
                        <h1 className="editTitle">Редактировать товар</h1>
                        <p className="editSubtitle">
                            ID: <span className="mono">{item.id}</span> • Сейчас: {formatPrice(item.price)}
                        </p>
                    </div>

                    <Link to={`/items/${item.id}`}>
                        <Button variant="secondary">Отмена</Button>
                    </Link>
                </div>

                {error && <div className="editAlert">{error}</div>}

                <form className="editForm" onSubmit={onSave}>
                    <div className="field">
                        <label className="label">Название</label>
                        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название товара" required />
                    </div>

                    <div className="field">
                        <label className="label">Описание</label>
                        <textarea
                            className="textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Описание товара"
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="label">Цена</label>
                        <input
                            className="input"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            placeholder="Цена"
                            min={1}
                            required
                        />
                    </div>

                    <div className="imageBlock">
                        <div className="imageBlock__top">
                            <div>
                                <div className="imageBlock__title">Изображение</div>
                                <div className="imageBlock__hint">Можно загрузить новое или удалить текущее.</div>
                            </div>

                            <label className="check">
                                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                                <span>Удалить текущее</span>
                            </label>
                        </div>

                        <div className="imageGrid">
                            <div className="imageBox">
                                <div className="imageBox__label">Текущее</div>
                                <div className="imageBox__frame">
                                    {currentImgSrc && !removeImage ? (
                                        <img className="imageBox__img" src={currentImgSrc} alt="current" />
                                    ) : (
                                        <div className="imageBox__placeholder">No image</div>
                                    )}
                                </div>
                            </div>

                            <div className="imageBox">
                                <div className="imageBox__label">Новое (превью)</div>
                                <div className="imageBox__frame">
                                    {newImgPreview ? (
                                        <img className="imageBox__img" src={newImgPreview} alt="new" />
                                    ) : (
                                        <div className="imageBox__placeholder">Не выбрано</div>
                                    )}
                                </div>

                                <input
                                    className="file"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
                                />

                                <div className="mutedSmall">Поддержка: jpg/png/webp • до 5MB</div>
                            </div>
                        </div>
                    </div>

                    <div className="actions">
                        <Button type="submit" disabled={saving}>
                            {saving ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
