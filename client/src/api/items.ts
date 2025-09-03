export const API_URL = "http://localhost:4000/api";

export async function fetchItems() {
    const res = await fetch(`${API_URL}/items`);
    if (!res.ok) throw new Error("Ошибка при загрузке товаров");
    return res.json();
}

export async function fetchItem(id: string) {
    const res = await fetch(`${API_URL}/items/${id}`);
    if (!res.ok) throw new Error("Ошибка при загрузке товара");
    return res.json();
}

export async function createItem(token: string, title: string, description: string, price: number, imageUrl?: string) {
    const res = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, price, imageUrl }),
    });
    if (!res.ok) throw new Error("Ошибка при создании товара");
    return res.json();
}
