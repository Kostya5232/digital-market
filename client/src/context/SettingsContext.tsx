/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

type Lang = "ru" | "en";
type Currency = "RUB" | "USD";

type SettingsContextType = {
    lang: Lang;
    currency: Currency;
    setLang: (v: Lang) => void;
    setCurrency: (v: Currency) => void;
    t: (key: keyof (typeof dict)["ru"]) => string;
    formatMoney: (rubAmount: number) => string;
};

const dict = {
    ru: {
        profile: "Профиль",
        purchases: "Покупки",
        sales: "Продажи",
        myItems: "Выставленные товары",
        settings: "Настройки",
        language: "Язык",
        currency: "Валюта",
        nickname: "Никнейм",
        save: "Сохранить",
        delete: "Удалить",
        edit: "Редактировать",
        open: "Открыть",
        home: "Главная",
        catalog: "Каталог",
        addItem: "Добавить товар",
        profileNav: "Профиль",
        login: "Войти",
        register: "Регистрация",
        logout: "Выйти",
        searchPlaceholder: "Поиск по товарам...",
        emptyCatalog: "Пока нет товаров",
        catalogSubtitle: "Выбирай товары, открывай карточки и покупай.",
        searchByTitle: "Поиск по названию...",
        category: "Категория",
        allCategories: "Все категории",
        chooseCategory: "Выберите категорию",
        loading: "Загрузка...",
        found: "Найдено",
        hello: "Привет",
        balance: "Баланс",
        marketTitle: "Маркет цифровых товаров",
        marketSubtitle: "Аккуратная витрина для аккаунтов, ключей, подписок и услуг без лишнего визуального шума.",
        availableNow: "Доступно сейчас",
        categoriesCount: "Категорий",
        walletHint: "Пополняйте баланс и покупайте товары в несколько кликов.",
        guestWalletHint: "Войдите, чтобы увидеть баланс и покупать быстрее.",
        deals: "Сделки",
        purchasesTab: "Покупки",
        salesTab: "Продажи",
        dealDetails: "Детали сделки",
        paidData: "Оплаченные данные",
        chat: "Чат сделки",
        send: "Отправить",
        confirmReceipt: "Подтвердить получение",
        openDispute: "Открыть спор",
        deliveryData: "Данные выдачи",
        saveDelivery: "Сохранить данные",
        messagePlaceholder: "Напишите сообщение по сделке...",
        deliveryPlaceholder: "Логин, ключ, инструкция или другие оплаченные данные...",
        waitingDelivery: "Ожидает выдачи",
        awaitingConfirm: "Ожидает подтверждения",
        completedDeal: "Завершена",
        disputedDeal: "Спор",
        cancelledDeal: "Отменена",
        noDeals: "Сделок пока нет",
        seller: "Продавец",
        rating: "Рейтинг",
        reviews: "Отзывы",
        noRating: "Нет оценок",
        sellerProfile: "Профиль продавца",
        sellerItems: "Товары продавца",
        messageSeller: "Чат с продавцом",
        leaveReview: "Оставить отзыв",
        yourReview: "Ваш отзыв",
        comment: "Комментарий",
        reviewPlaceholder: "Расскажите, как прошла сделка...",
        saveReview: "Сохранить отзыв",
        noReviews: "Отзывов пока нет",
        memberSince: "На площадке с",
        activeListings: "Активные товары",
    },
    en: {
        profile: "Profile",
        purchases: "Purchases",
        sales: "Sales",
        myItems: "My listings",
        settings: "Settings",
        language: "Language",
        currency: "Currency",
        nickname: "Nickname",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        open: "Open",
        home: "Home",
        catalog: "Catalog",
        addItem: "Add item",
        profileNav: "Profile",
        login: "Login",
        register: "Register",
        logout: "Logout",
        searchPlaceholder: "Search items...",
        emptyCatalog: "No items yet",
        catalogSubtitle: "Browse items, open cards, and buy.",
        searchByTitle: "Search by title...",
        category: "Category",
        allCategories: "All categories",
        chooseCategory: "Choose a category",
        loading: "Loading...",
        found: "Found",
        hello: "Hi",
        balance: "Balance",
        marketTitle: "Digital goods market",
        marketSubtitle: "A clean marketplace for accounts, keys, subscriptions, and services without visual noise.",
        availableNow: "Available now",
        categoriesCount: "Categories",
        walletHint: "Top up your balance and buy items in a few clicks.",
        guestWalletHint: "Log in to see your balance and buy faster.",
        deals: "Deals",
        purchasesTab: "Purchases",
        salesTab: "Sales",
        dealDetails: "Deal details",
        paidData: "Paid data",
        chat: "Deal chat",
        send: "Send",
        confirmReceipt: "Confirm receipt",
        openDispute: "Open dispute",
        deliveryData: "Delivery data",
        saveDelivery: "Save data",
        messagePlaceholder: "Write a message about this deal...",
        deliveryPlaceholder: "Login, key, instruction, or other paid data...",
        waitingDelivery: "Waiting for delivery",
        awaitingConfirm: "Awaiting confirmation",
        completedDeal: "Completed",
        disputedDeal: "Dispute",
        cancelledDeal: "Cancelled",
        noDeals: "No deals yet",
        seller: "Seller",
        rating: "Rating",
        reviews: "Reviews",
        noRating: "No ratings",
        sellerProfile: "Seller profile",
        sellerItems: "Seller listings",
        messageSeller: "Chat with seller",
        leaveReview: "Leave a review",
        yourReview: "Your review",
        comment: "Comment",
        reviewPlaceholder: "Tell how the deal went...",
        saveReview: "Save review",
        noReviews: "No reviews yet",
        memberSince: "Member since",
        activeListings: "Active listings",
    },
} as const;

const RUB_PER_USD = 90;

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "ru");
    const [currency, setCurrencyState] = useState<Currency>(() => (localStorage.getItem("currency") as Currency) || "RUB");

    const setLang = (v: Lang) => {
        localStorage.setItem("lang", v);
        setLangState(v);
    };

    const setCurrency = (v: Currency) => {
        localStorage.setItem("currency", v);
        setCurrencyState(v);
    };

    const t = (key: keyof (typeof dict)["ru"]) => dict[lang][key];

    const formatMoney = (rubAmount: number) => {
        const locale = lang === "ru" ? "ru-RU" : "en-US";
        const value = currency === "USD" ? rubAmount / RUB_PER_USD : rubAmount;

        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: currency === "USD" ? 2 : 0,
        }).format(value);
    };

    const value = { lang, currency, setLang, setCurrency, t, formatMoney };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
}
