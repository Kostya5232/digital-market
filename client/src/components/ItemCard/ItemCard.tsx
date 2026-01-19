import { Link } from "react-router-dom";
import Button from "../ui/Button/Button";
import "./ItemCard.css";
import { API_URL } from "../../api/auth";

type Item = {
    id: string;
    title: string;
    description?: string;
    price: number;
    hasImage?: boolean;
    updatedAt?: string;
};

function formatPrice(value: number) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value);
}

export default function ItemCard({ item }: { item: Item }) {
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
                    <div className="itemcard__price">{formatPrice(item.price)}</div>
                </div>

                <div className="itemcard__desc">{item.description?.trim() ? item.description : "Описание отсутствует."}</div>

                <div className="itemcard__cta">
                    <Button variant="secondary">Открыть</Button>
                </div>
            </div>
        </Link>
    );
}
