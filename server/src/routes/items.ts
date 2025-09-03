import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router = Router();

const createSchema = z.object({
    title: z.string().min(2).max(120),
    description: z.string().min(1).max(2000),
    price: z.number().positive().max(1000000), // цена в валюте, до 1 млн
});

const updateSchema = z.object({
    title: z.string().min(2).max(120).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.number().positive().max(1000000).optional(),
});

// Получить список товаров
router.get("/", async (req, res, next) => {
    try {
        const status = (req.query.status as string) ?? "LISTED";
        const search = (req.query.search as string) ?? "";
        const items = await prisma.item.findMany({
            where: {
                status: status === "ALL" ? undefined : (status as any),
                AND: search ? [{ title: { contains: search, mode: "insensitive" } }] : undefined,
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                status: true,
                seller: { select: { id: true, username: true } },
            },
        });
        res.json(items);
    } catch (err) {
        next(err);
    }
});

// Получить один товар по id
router.get("/:id", async (req, res, next) => {
    try {
        const itemId = req.params.id; // теперь строка
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                seller: { select: { id: true, username: true } },
                owner: { select: { id: true, username: true } },
            },
        });
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
    } catch (err) {
        next(err);
    }
});

// Создать новый товар
router.post("/", requireAuth, async (req, res, next) => {
    try {
        const data = createSchema.parse(req.body);
        const item = await prisma.item.create({
            data: {
                title: data.title,
                description: data.description,
                price: new Prisma.Decimal(Number(data.price.toFixed(2))),
                status: "LISTED",
                sellerId: req.user!.id,
            },
        });
        res.status(201).json(item);
    } catch (err) {
        next(err);
    }
});

// Обновить товар
router.put("/:id", requireAuth, async (req, res, next) => {
    try {
        const itemId = req.params.id; // строка
        const data = updateSchema.parse(req.body);
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.sellerId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
        if (item.status === "SOLD") return res.status(400).json({ message: "Cannot edit sold item" });

        const updated = await prisma.item.update({
            where: { id: itemId },
            data: {
                title: data.title ?? item.title,
                description: data.description ?? item.description,
                price: data.price != null ? new Prisma.Decimal(Number(data.price.toFixed(2))) : item.price,
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Удалить товар
router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const itemId = req.params.id; // строка
        const item = await prisma.item.findUnique({ where: { id: itemId } });
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
