import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router = Router();

// Купить товар
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

            await tx.user.update({
                where: { id: item.sellerId },
                data: { balance: { increment: price } },
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
                    price: price,
                },
            });

            return createdOrder;
        });

        res.status(201).json(order);
    } catch (err) {
        next(err);
    }
});

// Мои покупки
router.get("/my", requireAuth, async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { buyerId: req.user!.id },
            orderBy: { createdAt: "desc" },
            include: {
                item: {
                    select: { id: true, title: true, description: true },
                },
                seller: { select: { id: true, username: true } },
                buyer: { select: { id: true, username: true } },
            },
        });
        res.json(orders);
    } catch (err) {
        next(err);
    }
});

// Мои продажи
router.get("/sales", requireAuth, async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { sellerId: req.user!.id },
            orderBy: { createdAt: "desc" },
            include: {
                item: {
                    select: { id: true, title: true, description: true },
                },
                seller: { select: { id: true, username: true } },
                buyer: { select: { id: true, username: true } },
            },
        });
        res.json(orders);
    } catch (err) {
        next(err);
    }
});

export default router;
