import { API_URL } from "./auth";

export async function getMyOrders(token: string) {
    const res = await fetch(`${API_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Ошибка при получении покупок");
    return res.json();
}

export async function getMySales(token: string) {
    const res = await fetch(`${API_URL}/orders/sales`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Ошибка при получении продаж");
    return res.json();
}

export async function buyItem(token: string, itemId: string) {
    const res = await fetch(`${API_URL}/orders/purchase/${itemId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) throw new Error("Ошибка при покупке товара");
    return res.json();
}
