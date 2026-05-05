import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const directMessageSchema = z.object({
    body: z.string().trim().min(1).max(2000),
});

function normalizeItem<T extends { price: Prisma.Decimal; imageMime?: string | null }>(item: T) {
    return {
        ...item,
        price: item.price.toNumber(),
        hasImage: Boolean(item.imageMime),
    };
}

async function sellerRating(userId: string) {
    const result = await prisma.review.aggregate({
        where: { sellerId: userId },
        _avg: { rating: true },
        _count: { _all: true },
    });

    return {
        average: result._avg.rating == null ? null : Number(result._avg.rating.toFixed(1)),
        count: result._count._all,
    };
}

router.get("/:userId", async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: {
                id: true,
                username: true,
                createdAt: true,
            },
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        const [rating, items, reviews] = await Promise.all([
            sellerRating(user.id),
            prisma.item.findMany({
                where: { sellerId: user.id, status: "LISTED" },
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
            }),
            prisma.review.findMany({
                where: { sellerId: user.id },
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    buyer: { select: { id: true, username: true } },
                    order: { select: { item: { select: { id: true, title: true } } } },
                },
            }),
        ]);

        res.json({
            user,
            rating,
            items: items.map(normalizeItem),
            reviews,
        });
    } catch (err) {
        next(err);
    }
});

router.get("/:userId/messages", requireAuth, async (req, res, next) => {
    try {
        const otherUserId = req.params.userId;
        if (otherUserId === req.user!.id) return res.status(400).json({ message: "Cannot message yourself" });

        const otherUser = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: { id: true },
        });
        if (!otherUser) return res.status(404).json({ message: "User not found" });

        const messages = await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: req.user!.id, recipientId: otherUserId },
                    { senderId: otherUserId, recipientId: req.user!.id },
                ],
            },
            orderBy: { createdAt: "asc" },
            include: {
                sender: { select: { id: true, username: true } },
                recipient: { select: { id: true, username: true } },
            },
        });

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

router.post("/:userId/messages", requireAuth, async (req, res, next) => {
    try {
        const otherUserId = req.params.userId;
        if (otherUserId === req.user!.id) return res.status(400).json({ message: "Cannot message yourself" });

        const data = directMessageSchema.parse(req.body);
        const otherUser = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: { id: true },
        });
        if (!otherUser) return res.status(404).json({ message: "User not found" });

        const message = await prisma.directMessage.create({
            data: {
                senderId: req.user!.id,
                recipientId: otherUserId,
                body: data.body,
            },
            include: {
                sender: { select: { id: true, username: true } },
                recipient: { select: { id: true, username: true } },
            },
        });

        res.status(201).json(message);
    } catch (err) {
        next(err);
    }
});

export default router;
