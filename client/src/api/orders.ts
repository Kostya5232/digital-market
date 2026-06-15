import { API_URL } from "./auth";
import { ItemCategory } from "../lib/categories";

export type DealStatus = "PAID" | "COMPLETED" | "DISPUTED" | "CANCELLED";
export type DealMessageType = "TEXT" | "SYSTEM" | "DELIVERY";
export type PaymentMethod = "BALANCE" | "CARD" | "SBP";
export type PaymentStatus = "PENDING" | "PAID" | "RELEASED" | "REFUNDED" | "FAILED";

export type DealUser = {
    id: string;
    username: string;
};

export type DealReview = {
    id: string;
    orderId: string;
    buyerId: string;
    sellerId: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    updatedAt: string;
    buyer: DealUser;
    seller: DealUser;
};

export type DealItem = {
    id: string;
    title: string;
    description?: string;
    category: ItemCategory;
    status: "LISTED" | "SOLD";
    updatedAt?: string;
    hasImage?: boolean;
};

export type DealMessage = {
    id: string;
    orderId: string;
    authorId: string;
    body: string;
    type: DealMessageType;
    createdAt: string;
    author: DealUser;
};

export type DealPayment = {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    provider?: string | null;
    providerPaymentId?: string | null;
    releasedAt?: string | null;
    refundedAt?: string | null;
    createdAt: string;
};

export type Deal = {
    id: string;
    itemId: string;
    buyerId: string;
    sellerId: string;
    price: number;
    status: DealStatus;
    deliveryData?: string | null;
    confirmedAt?: string | null;
    disputedAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    item: DealItem;
    buyer: DealUser;
    seller: DealUser;
    payment?: DealPayment | null;
    messages?: DealMessage[];
    review?: DealReview | null;
    _count?: { messages: number };
};

async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    });

    if (!res.ok) throw new Error("Ошибка запроса сделки");
    return res.json();
}

export async function getMyOrders(token: string) {
    return request<Deal[]>(`${API_URL}/orders/my`, token);
}

export async function getMySales(token: string) {
    return request<Deal[]>(`${API_URL}/orders/sales`, token);
}

export async function getDeal(token: string, orderId: string) {
    return request<Deal>(`${API_URL}/orders/${orderId}`, token);
}

export async function buyItem(token: string, itemId: string, paymentMethod: PaymentMethod = "BALANCE") {
    return request<Deal>(`${API_URL}/orders/purchase/${itemId}`, token, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
    });
}

export async function sendDealMessage(token: string, orderId: string, body: string) {
    return request<DealMessage>(`${API_URL}/orders/${orderId}/messages`, token, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}

export async function updateDealDelivery(token: string, orderId: string, deliveryData: string) {
    return request<Deal>(`${API_URL}/orders/${orderId}/delivery`, token, {
        method: "PATCH",
        body: JSON.stringify({ deliveryData }),
    });
}

export async function confirmDeal(token: string, orderId: string) {
    return request<Deal>(`${API_URL}/orders/${orderId}/confirm`, token, { method: "POST" });
}

export async function openDealDispute(token: string, orderId: string) {
    return request<Deal>(`${API_URL}/orders/${orderId}/dispute`, token, { method: "POST" });
}

export async function refundDeal(token: string, orderId: string) {
    return request<Deal>(`${API_URL}/orders/${orderId}/refund`, token, { method: "POST" });
}

export async function createDealReview(token: string, orderId: string, rating: number, comment: string) {
    return request<DealReview>(`${API_URL}/orders/${orderId}/review`, token, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
    });
}
