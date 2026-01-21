import { Link } from "react-router-dom";
import Button from "../ui/Button/Button";
import "./ItemCard.css";
import { API_URL } from "../../api/auth";
import { useSettings } from "../../context/SettingsContext";
import { ItemCategory, categoryLabel } from "../../lib/categories";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;
    category: ItemCategory;
    hasImage?: boolean;
    updatedAt?: string;
};

export default function ItemCard({ item }: { item: Item }) {
    const { formatMoney, lang } = useSettings();
    const imgSrc =
        item.hasImage && item.updatedAt
            ? `${API_URL}/items/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`
            : item.hasImage
            ? `${API_URL}/items/${item.id}/image`
            : null;

    return (
        <Link to={`/items/${item.id}`} className="itemcard">
            <div className="itemcard__media">
                {imgSrc ? (
                    <img className="itemcard__img" src={imgSrc} alt={item.title} loading="lazy" />
                ) : (
                    <div className="itemcard__placeholder">No image</div>
                )}
            </div>

            <div className="itemcard__body">
                <div className="itemcard__top">
                    <div className="itemcard__title">{item.title}</div>
                    <div className="itemcard__price">{formatMoney(item.price)}</div>
                </div>

                <div className="itemcard__badge">{categoryLabel(item.category, lang)}</div>

                <div className="itemcard__desc">{item.description?.trim() ? item.description : "Описание отсутствует."}</div>

                <div className="itemcard__cta">
                    <Button variant="secondary">Открыть</Button>
                </div>
            </div>
        </Link>
    );
}
