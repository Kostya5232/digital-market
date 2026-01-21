import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { Prisma } from "@prisma/client";
import multer from "multer";

const router = Router();

const CATEGORY_VALUES = ["ACCOUNTS", "KEYS", "SUBSCRIPTIONS", "SERVICES", "GAME_CURRENCIES", "NFT_TOKENS", "OTHER"] as const;

const CategoryEnum = z.enum(CATEGORY_VALUES);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const createSchema = z.object({
    title: z.string().min(2).max(120),
    description: z.string().min(1).max(2000),
    price: z.number().positive().max(1000000),
    category: CategoryEnum.optional(),
});

const updateSchema = z.object({
    title: z.string().min(2).max(120).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.number().positive().max(1000000).optional(),
    category: CategoryEnum.optional(),
});

const updateMultipartSchema = z.object({
    title: z.string().min(2).max(120).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.string().optional(),
    category: CategoryEnum.optional(),
    removeImage: z.enum(["true", "false"]).optional(),
});

// Получить список товаров
router.get("/", async (req, res, next) => {
    try {
        const status = (req.query.status as string) ?? "LISTED";
        const search = (req.query.search as string) ?? "";
        const category = (req.query.category as string) ?? "";

        const categoryFilter = category ? CategoryEnum.safeParse(category) : null;
        if (category && !categoryFilter?.success) {
            return res.status(400).json({ message: "Invalid category" });
        }

        const items = await prisma.item.findMany({
            where: {
                status: status === "ALL" ? undefined : (status as any),
                category: categoryFilter?.success ? (categoryFilter.data as any) : undefined,
                AND: search ? [{ title: { contains: search, mode: "insensitive" } }] : undefined,
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                imageMime: true,
                seller: { select: { id: true, username: true } },
            },
        });

        res.json(
            items.map((i) => ({
                ...i,
                hasImage: Boolean(i.imageMime),
            }))
        );
    } catch (err) {
        next(err);
    }
});

router.get("/mine", requireAuth, async (req, res, next) => {
    try {
        const items = await prisma.item.findMany({
            where: { sellerId: req.user!.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                updatedAt: true,
                imageMime: true,
            },
        });

        res.json(
            items.map((i) => ({
                ...i,
                hasImage: Boolean(i.imageMime),
            }))
        );
    } catch (err) {
        next(err);
    }
});

router.get("/:id/image", async (req, res, next) => {
    try {
        const item = await prisma.item.findUnique({
            where: { id: req.params.id },
            select: { imageData: true, imageMime: true },
        });

        if (!item?.imageData || !item.imageMime) return res.sendStatus(404);

        const buf = Buffer.isBuffer(item.imageData) ? item.imageData : Buffer.from(item.imageData);

        res.status(200);
        res.setHeader("Content-Type", item.imageMime);
        res.setHeader("Content-Length", String(buf.length));
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        return res.end(buf);
    } catch (e) {
        next(e);
    }
});

router.get("/:id", async (req, res, next) => {
    try {
        const itemId = req.params.id;

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                sellerId: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,

                imageMime: true,
                seller: { select: { id: true, username: true } },
                owner: { select: { id: true, username: true } },
            },
        });

        if (!item) return res.status(404).json({ message: "Item not found" });

        res.json({
            ...item,
            hasImage: Boolean(item.imageMime),
        });
    } catch (err) {
        next(err);
    }
});

// Создать новый товар
router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
    try {
        const title = String(req.body.title ?? "");
        const description = String(req.body.description ?? "");
        const price = Number(req.body.price);
        const category = String(req.body.category ?? "OTHER");

        const data = createSchema.parse({ title, description, price, category });

        const file = req.file;

        if (file) {
            const okMime = ["image/jpeg", "image/png", "image/webp"];
            if (!okMime.includes(file.mimetype)) {
                return res.status(400).json({ message: "Только jpg/png/webp" });
            }
        }

        const item = await prisma.item.create({
            data: {
                title: data.title,
                description: data.description,
                price: new Prisma.Decimal(Number(data.price.toFixed(2))),
                status: "LISTED",
                sellerId: req.user!.id,

                category: (data.category ?? "OTHER") as any,

                imageData: file ? file.buffer : undefined,
                imageMime: file ? file.mimetype : undefined,
            },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                sellerId: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,
                imageMime: true,
            },
        });

        res.status(201).json({
            ...item,
            hasImage: Boolean(item.imageMime),
        });
    } catch (err) {
        next(err);
    }
});

// Обновить товар
router.put("/:id", requireAuth, async (req, res, next) => {
    try {
        const itemId = req.params.id;

        const data = updateSchema.parse(req.body);

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { id: true, sellerId: true, status: true, title: true, description: true, price: true },
        });

        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.sellerId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
        if (item.status === "SOLD") return res.status(400).json({ message: "Cannot edit sold item" });

        const updated = await prisma.item.update({
            where: { id: itemId },
            data: {
                title: data.title ?? item.title,
                description: data.description ?? item.description,
                price: data.price != null ? new Prisma.Decimal(Number(data.price.toFixed(2))) : item.price,
                category: (data.category as any) ?? undefined,
            },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                sellerId: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,
                imageMime: true,
            },
        });

        res.json({
            ...updated,
            hasImage: Boolean(updated.imageMime),
        });
    } catch (err) {
        next(err);
    }
});

router.patch("/:id", requireAuth, upload.single("image"), async (req, res, next) => {
    try {
        const itemId = req.params.id;

        const raw = updateMultipartSchema.parse(req.body);
        const file = req.file;

        if (file) {
            const okMime = ["image/jpeg", "image/png", "image/webp"];
            if (!okMime.includes(file.mimetype)) {
                return res.status(400).json({ message: "Только jpg/png/webp" });
            }
        }

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                sellerId: true,
                status: true,
                title: true,
                description: true,
                price: true,
                imageMime: true,
            },
        });

        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.sellerId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
        if (item.status === "SOLD") return res.status(400).json({ message: "Cannot edit sold item" });

        const nextPrice = raw.price != null && raw.price !== "" ? Number(raw.price) : undefined;
        if (nextPrice != null && (!Number.isFinite(nextPrice) || nextPrice <= 0)) {
            return res.status(400).json({ message: "Invalid price" });
        }

        const removeImage = raw.removeImage === "true";

        const updated = await prisma.item.update({
            where: { id: itemId },
            data: {
                title: raw.title ?? item.title,
                description: raw.description ?? item.description,
                price: nextPrice != null ? new Prisma.Decimal(Number(nextPrice.toFixed(2))) : item.price,

                category: (raw.category as any) ?? undefined,

                imageData: removeImage ? null : file ? file.buffer : undefined,
                imageMime: removeImage ? null : file ? file.mimetype : undefined,
            },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                category: true,
                sellerId: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,
                imageMime: true,
            },
        });

        res.json({ ...updated, hasImage: Boolean(updated.imageMime) });
    } catch (err) {
        next(err);
    }
});

// Удалить товар
router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const itemId = req.params.id;

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { id: true, sellerId: true, status: true },
        });

        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.sellerId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
        if (item.status === "SOLD") return res.status(400).json({ message: "Cannot delete sold item" });

        await prisma.item.delete({ where: { id: itemId } });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;
