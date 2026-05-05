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
    seller?: {
        id: string;
        username: string;
        rating?: {
            average: number | null;
            count: number;
        };
    };
};

export default function ItemCard({ item }: { item: Item }) {
    const { t, formatMoney, lang } = useSettings();
    const imgSrc =
        item.hasImage && item.updatedAt
            ? `${API_URL}/items/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`
            : item.hasImage
            ? `${API_URL}/items/${item.id}/image`
            : null;

    return (
        <article className="itemcard">
            <Link to={`/items/${item.id}`} className="itemcard__media">
                {imgSrc ? (
                    <img className="itemcard__img" src={imgSrc} alt={item.title} loading="lazy" />
                ) : (
                    <div className="itemcard__placeholder">No image</div>
                )}
            </Link>

            <div className="itemcard__body">
                <div className="itemcard__top">
                    <Link to={`/items/${item.id}`} className="itemcard__title">
                        {item.title}
                    </Link>
                    <div className="itemcard__price">{formatMoney(item.price)}</div>
                </div>

                <div className="itemcard__metaRow">
                    <div className="itemcard__badge">{categoryLabel(item.category, lang)}</div>
                    {item.seller && (
                        <Link to={`/users/${item.seller.id}`} className="itemcard__seller">
                            <span>{item.seller.username}</span>
                            <strong>{item.seller.rating?.average ? `★ ${item.seller.rating.average}` : t("noRating")}</strong>
                        </Link>
                    )}
                </div>

                <div className="itemcard__desc">{item.description?.trim() ? item.description : "Описание отсутствует."}</div>

                <div className="itemcard__cta">
                    <Link to={`/items/${item.id}`}>
                        <Button variant="secondary">{t("open")}</Button>
                    </Link>
                </div>
            </div>
        </article>
    );
}
