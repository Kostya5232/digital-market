export function categoryLabel(cat: ItemCategory, lang: "ru" | "en") {
    const ru: Record<ItemCategory, string> = {
        ACCOUNTS: "Аккаунты",
        KEYS: "Ключи",
        SUBSCRIPTIONS: "Подписки",
        SERVICES: "Услуги",
        GAME_CURRENCIES: "Игровые валюты",
        NFT_TOKENS: "NFT-токены",
        OTHER: "Прочее",
    };

    const en: Record<ItemCategory, string> = {
        ACCOUNTS: "Accounts",
        KEYS: "Keys",
        SUBSCRIPTIONS: "Subscriptions",
        SERVICES: "Services",
        GAME_CURRENCIES: "Game currencies",
        NFT_TOKENS: "NFT tokens",
        OTHER: "Other",
    };

    return (lang === "ru" ? ru : en)[cat];
}

export enum ItemCategory {
    ACCOUNTS = "ACCOUNTS",
    KEYS = "KEYS",
    SUBSCRIPTIONS = "SUBSCRIPTIONS",
    SERVICES = "SERVICES",
    GAME_CURRENCIES = "GAME_CURRENCIES",
    NFT_TOKENS = "NFT_TOKENS",
    OTHER = "OTHER",
}

export const categoryOptions = [
    { value: ItemCategory.ACCOUNTS, label: "Аккаунты" },
    { value: ItemCategory.KEYS, label: "Ключи" },
    { value: ItemCategory.SUBSCRIPTIONS, label: "Подписки" },
    { value: ItemCategory.SERVICES, label: "Услуги" },
    { value: ItemCategory.GAME_CURRENCIES, label: "Игровые валюты" },
    { value: ItemCategory.NFT_TOKENS, label: "NFT-токены" },
    { value: ItemCategory.OTHER, label: "Прочее" },
];

export const CATEGORIES: ItemCategory[] = [
    ItemCategory.ACCOUNTS,
    ItemCategory.KEYS,
    ItemCategory.SUBSCRIPTIONS,
    ItemCategory.SERVICES,
    ItemCategory.GAME_CURRENCIES,
    ItemCategory.NFT_TOKENS,
    ItemCategory.OTHER,
];
