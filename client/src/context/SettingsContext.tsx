import { createContext, useContext, useMemo, useState } from "react";

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

    const value = useMemo(() => ({ lang, currency, setLang, setCurrency, t, formatMoney }), [lang, currency]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
}
