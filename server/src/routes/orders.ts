import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const router = Router();

const messageSchema = z.object({
    body: z.string().trim().min(1).max(2000),
});

const deliverySchema = z.object({
    deliveryData: z.string().trim().min(1).max(4000),
});

const reviewSchema = z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
});

const orderListInclude = {
    item: {
        select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            updatedAt: true,
            imageMime: true,
        },
    },
    seller: { select: { id: true, username: true } },
    buyer: { select: { id: true, username: true } },
    _count: { select: { messages: true } },
} satisfies Prisma.OrderInclude;

const orderDetailInclude = {
    ...orderListInclude,
    messages: {
        orderBy: { createdAt: "asc" as const },
        include: {
            author: { select: { id: true, username: true } },
        },
    },
    review: {
        include: {
            buyer: { select: { id: true, username: true } },
            seller: { select: { id: true, username: true } },
        },
    },
} satisfies Prisma.OrderInclude;

function normalizeOrder<T extends { price: Prisma.Decimal; item?: { imageMime?: string | null } | null }>(order: T) {
    return {
        ...order,
        price: order.price.toNumber(),
        item: order.item
            ? {
                  ...order.item,
                  hasImage: Boolean(order.item.imageMime),
              }
            : order.item,
    };
}

function isParticipant(order: { buyerId: string; sellerId: string }, userId: string) {
    return order.buyerId === userId || order.sellerId === userId;
}

async function createSystemMessage(tx: Prisma.TransactionClient, orderId: string, authorId: string, body: string) {
    await tx.orderMessage.create({
        data: {
            orderId,
            authorId,
            body,
            type: "SYSTEM",
        },
    });
}

router.post("/purchase/:itemId", requireAuth, async (req, res, next) => {
    try {
        const item = await prisma.item.findUnique({ where: { id: req.params.itemId } });
        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.status !== "LISTED") return res.status(400).json({ message: "Item is not available" });
        if (item.sellerId === req.user!.id) return res.status(400).json({ message: "Seller cannot buy own item" });

        const buyer = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!buyer) return res.status(404).json({ message: "User not found" });

        const price = item.price instanceof Prisma.Decimal ? item.price.toNumber() : Number(item.price);

        if (buyer.balance < price) {
            return res.status(400).json({ message: "Not enough balance" });
        }

        const order = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: buyer.id },
                data: { balance: { decrement: price } },
            });

            const updatedItem = await tx.item.update({
                where: { id: item.id },
                data: { status: "SOLD", ownerId: buyer.id },
            });

            const createdOrder = await tx.order.create({
                data: {
                    itemId: updatedItem.id,
                    buyerId: buyer.id,
                    sellerId: item.sellerId,
                    price,
                    status: "PAID",
                },
                include: orderDetailInclude,
            });

            await createSystemMessage(tx, createdOrder.id, buyer.id, "Покупатель оплатил товар. Деньги зарезервированы до подтверждения получения.");

            return tx.order.findUniqueOrThrow({
                where: { id: createdOrder.id },
                include: orderDetailInclude,
            });
        });

        res.status(201).json(normalizeOrder(order));
    } catch (err) {
        next(err);
    }
});

router.get("/my", requireAuth, async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { buyerId: req.user!.id },
            orderBy: { createdAt: "desc" },
            include: orderListInclude,
        });
        res.json(orders.map(normalizeOrder));
    } catch (err) {
        next(err);
    }
});

router.get("/sales", requireAuth, async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { sellerId: req.user!.id },
            orderBy: { createdAt: "desc" },
            include: orderListInclude,
        });
        res.json(orders.map(normalizeOrder));
    } catch (err) {
        next(err);
    }
});

router.get("/:orderId", requireAuth, async (req, res, next) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.orderId },
            include: orderDetailInclude,
        });

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (!isParticipant(order, req.user!.id)) return res.status(403).json({ message: "Forbidden" });

        res.json(normalizeOrder(order));
    } catch (err) {
        next(err);
    }
});

router.post("/:orderId/messages", requireAuth, async (req, res, next) => {
    try {
        const data = messageSchema.parse(req.body);

        const order = await prisma.order.findUnique({
            where: { id: req.params.orderId },
            select: { id: true, buyerId: true, sellerId: true },
        });

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (!isParticipant(order, req.user!.id)) return res.status(403).json({ message: "Forbidden" });

        const message = await prisma.orderMessage.create({
            data: {
                orderId: order.id,
                authorId: req.user!.id,
                body: data.body,
                type: "TEXT",
            },
            include: {
                author: { select: { id: true, username: true } },
            },
        });

        res.status(201).json(message);
    } catch (err) {
        next(err);
    }
});

router.patch("/:orderId/delivery", requireAuth, async (req, res, next) => {
    try {
        const data = deliverySchema.parse(req.body);

        const order = await prisma.order.findUnique({
            where: { id: req.params.orderId },
            select: { id: true, buyerId: true, sellerId: true, status: true },
        });

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.sellerId !== req.user!.id) return res.status(403).json({ message: "Only seller can add delivery data" });
        if (order.status === "COMPLETED") return res.status(400).json({ message: "Deal is already completed" });

        const updated = await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order.id },
                data: { deliveryData: data.deliveryData },
            });

            await tx.orderMessage.create({
                data: {
                    orderId: order.id,
                    authorId: req.user!.id,
                    body: data.deliveryData,
                    type: "DELIVERY",
                },
            });

            await createSystemMessage(tx, order.id, req.user!.id, "Продавец добавил оплаченные данные по товару.");

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderDetailInclude,
            });
        });

        res.json(normalizeOrder(updated));
    } catch (err) {
        next(err);
    }
});

router.post("/:orderId/confirm", requireAuth, async (req, res, next) => {
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: req.params.orderId },
                select: { id: true, buyerId: true, sellerId: true, status: true, price: true },
            });

            if (!order) return null;
            if (order.buyerId !== req.user!.id) return "FORBIDDEN" as const;
            if (order.status === "COMPLETED") {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }

            const price = order.price instanceof Prisma.Decimal ? order.price.toNumber() : Number(order.price);

            const released = await tx.order.updateMany({
                where: {
                    id: order.id,
                    status: { not: "COMPLETED" },
                },
                data: {
                    status: "COMPLETED",
                    confirmedAt: new Date(),
                },
            });

            if (released.count === 0) {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }

            await tx.user.update({
                where: { id: order.sellerId },
                data: { balance: { increment: price } },
            });

            await createSystemMessage(tx, order.id, req.user!.id, "Покупатель подтвердил получение. Деньги переведены продавцу.");

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderDetailInclude,
            });
        });

        if (!updated) return res.status(404).json({ message: "Order not found" });
        if (updated === "FORBIDDEN") return res.status(403).json({ message: "Only buyer can confirm delivery" });

        res.json(normalizeOrder(updated));
    } catch (err) {
        next(err);
    }
});

router.post("/:orderId/review", requireAuth, async (req, res, next) => {
    try {
        const data = reviewSchema.parse(req.body);

        const order = await prisma.order.findUnique({
            where: { id: req.params.orderId },
            select: { id: true, buyerId: true, sellerId: true, status: true },
        });

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.buyerId !== req.user!.id) return res.status(403).json({ message: "Only buyer can review this deal" });
        if (order.status !== "COMPLETED") return res.status(400).json({ message: "Only completed deals can be reviewed" });

        const comment = data.comment?.trim() ? data.comment.trim() : null;

        const review = await prisma.review.upsert({
            where: { orderId: order.id },
            create: {
                orderId: order.id,
                buyerId: order.buyerId,
                sellerId: order.sellerId,
                rating: data.rating,
                comment,
            },
            update: {
                rating: data.rating,
                comment,
            },
            include: {
                buyer: { select: { id: true, username: true } },
                seller: { select: { id: true, username: true } },
            },
        });

        res.json(review);
    } catch (err) {
        next(err);
    }
});

router.post("/:orderId/dispute", requireAuth, async (req, res, next) => {
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: req.params.orderId },
                select: { id: true, buyerId: true, sellerId: true, status: true },
            });

            if (!order) return null;
            if (!isParticipant(order, req.user!.id)) return "FORBIDDEN" as const;
            if (order.status === "COMPLETED") return "COMPLETED" as const;

            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: "DISPUTED",
                    disputedAt: new Date(),
                },
            });

            await createSystemMessage(tx, order.id, req.user!.id, "Открыт спор по сделке. Участники могут продолжить обсуждение в чате.");

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderDetailInclude,
            });
        });

        if (!updated) return res.status(404).json({ message: "Order not found" });
        if (updated === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
        if (updated === "COMPLETED") return res.status(400).json({ message: "Deal is already completed" });

        res.json(normalizeOrder(updated));
    } catch (err) {
        next(err);
    }
});

export default router;
