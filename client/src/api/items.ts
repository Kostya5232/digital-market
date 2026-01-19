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

export async function createItem(token: string, title: string, description: string, price: number, imageFile?: File | null) {
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("price", String(price));

    if (imageFile) form.append("image", imageFile);

    const res = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    });

    if (!res.ok) throw new Error("Ошибка при создании товара");
    return res.json();
}

export async function updateItem(
    token: string,
    id: string,
    data: { title?: string; description?: string; price?: number },
    imageFile?: File | null,
    removeImage?: boolean
) {
    const form = new FormData();
    if (data.title != null) form.append("title", data.title);
    if (data.description != null) form.append("description", data.description);
    if (data.price != null) form.append("price", String(data.price));
    if (removeImage != null) form.append("removeImage", removeImage ? "true" : "false");
    if (imageFile) form.append("image", imageFile);

    const res = await fetch(`${API_URL}/items/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });

    if (!res.ok) throw new Error("Ошибка при обновлении товара");
    return res.json();
}

export async function getMyItems(token: string) {
    const res = await fetch(`${API_URL}/items/mine`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Ошибка при загрузке моих товаров");
    return res.json();
}

export async function deleteItem(token: string, id: string) {
    const res = await fetch(`${API_URL}/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Ошибка при удалении товара");
    return true;
}
