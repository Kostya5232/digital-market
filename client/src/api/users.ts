import { API_URL } from "./auth";
import { ItemCategory } from "../lib/categories";

export type RatingSummary = {
    average: number | null;
    count: number;
};

export type PublicSellerItem = {
    id: string;
    title: string;
    description?: string;
    price: number;
    status: "LISTED" | "SOLD";
    category: ItemCategory;
    updatedAt?: string;
    hasImage?: boolean;
};

export type PublicReview = {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    buyer: { id: string; username: string };
    order: { item: { id: string; title: string } };
};

export type SellerProfile = {
    user: {
        id: string;
        username: string;
        createdAt: string;
    };
    rating: RatingSummary;
    items: PublicSellerItem[];
    reviews: PublicReview[];
};

export type DirectMessage = {
    id: string;
    senderId: string;
    recipientId: string;
    body: string;
    createdAt: string;
    sender: { id: string; username: string };
    recipient: { id: string; username: string };
};

async function authRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    });

    if (!res.ok) throw new Error("Ошибка запроса профиля");
    return res.json();
}

export async function getSellerProfile(userId: string) {
    const res = await fetch(`${API_URL}/users/${userId}`);
    if (!res.ok) throw new Error("Ошибка загрузки профиля продавца");
    return res.json() as Promise<SellerProfile>;
}

export async function getDirectMessages(token: string, userId: string) {
    return authRequest<DirectMessage[]>(`${API_URL}/users/${userId}/messages`, token);
}

export async function sendDirectMessage(token: string, userId: string, body: string) {
    return authRequest<DirectMessage>(`${API_URL}/users/${userId}/messages`, token, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}
