import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

const purchaseSchema = z.object({
    paymentMethod: z.enum(["BALANCE", "CARD", "SBP"]).default("BALANCE"),
});

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

const paymentSelect = {
    id: true,
    method: true,
    status: true,
    amount: true,
    provider: true,
    providerPaymentId: true,
    releasedAt: true,
    refundedAt: true,
    createdAt: true,
} satisfies Prisma.PaymentSelect;

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
    payment: { select: paymentSelect },
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

type PaymentMethodInput = z.infer<typeof purchaseSchema>["paymentMethod"];

function toNumber(value: Prisma.Decimal | number | string) {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
}

function balanceAmount(price: number) {
    return Math.round(price);
}

function normalizeOrder<
    T extends {
        price: Prisma.Decimal | number | string;
        item?: { imageMime?: string | null } | null;
        payment?: { amount: Prisma.Decimal | number | string } | null;
    },
>(order: T) {
    return {
        ...order,
        price: toNumber(order.price),
        item: order.item
            ? {
                  ...order.item,
                  hasImage: Boolean(order.item.imageMime),
              }
            : order.item,
        payment: order.payment
            ? {
                  ...order.payment,
                  amount: toNumber(order.payment.amount),
              }
            : order.payment,
    };
}

function isParticipant(order: { buyerId: string; sellerId: string }, userId: string) {
    return order.buyerId === userId || order.sellerId === userId;
}

function paymentProvider(method: PaymentMethodInput) {
    if (method === "CARD") return "mock-card-acquiring";
    if (method === "SBP") return "mock-sbp";
    return "site-wallet";
}

function paymentLabel(method: PaymentMethodInput) {
    if (method === "CARD") return "картой";
    if (method === "SBP") return "через СБП";
    return "с баланса сайта";
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
        const { paymentMethod } = purchaseSchema.parse(req.body ?? {});

        const result = await prisma.$transaction(async (tx) => {
            const [item, buyer] = await Promise.all([
                tx.item.findUnique({ where: { id: req.params.itemId } }),
                tx.user.findUnique({ where: { id: req.user!.id } }),
            ]);

            if (!item) return { code: "ITEM_NOT_FOUND" as const };
            if (!buyer) return { code: "USER_NOT_FOUND" as const };
            if (item.status !== "LISTED") return { code: "UNAVAILABLE" as const };
            if (item.sellerId === buyer.id) return { code: "OWN_ITEM" as const };

            const price = toNumber(item.price);
            const walletPrice = balanceAmount(price);

            if (paymentMethod === "BALANCE" && buyer.balance < walletPrice) {
                return { code: "NOT_ENOUGH_BALANCE" as const };
            }

            const reserved = await tx.item.updateMany({
                where: { id: item.id, status: "LISTED" },
                data: { status: "SOLD", ownerId: buyer.id },
            });

            if (reserved.count === 0) return { code: "UNAVAILABLE" as const };

            let buyerBalanceAfter = buyer.balance;
            if (paymentMethod === "BALANCE") {
                const updatedBuyer = await tx.user.update({
                    where: { id: buyer.id },
                    data: { balance: { decrement: walletPrice } },
                    select: { balance: true },
                });
                buyerBalanceAfter = updatedBuyer.balance;
            }

            const createdOrder = await tx.order.create({
                data: {
                    itemId: item.id,
                    buyerId: buyer.id,
                    sellerId: item.sellerId,
                    price,
                    status: "PAID",
                },
            });

            const payment = await tx.payment.create({
                data: {
                    orderId: createdOrder.id,
                    buyerId: buyer.id,
                    sellerId: item.sellerId,
                    method: paymentMethod,
                    status: "PAID",
                    amount: price,
                    provider: paymentProvider(paymentMethod),
                    providerPaymentId: `mock-${paymentMethod.toLowerCase()}-${createdOrder.id}`,
                },
            });

            if (paymentMethod === "BALANCE") {
                await tx.walletTransaction.create({
                    data: {
                        userId: buyer.id,
                        orderId: createdOrder.id,
                        paymentId: payment.id,
                        type: "PURCHASE_HOLD",
                        amount: -walletPrice,
                        balanceAfter: buyerBalanceAfter,
                        note: "Резерв средств под сделку",
                    },
                });
            }

            await createSystemMessage(
                tx,
                createdOrder.id,
                buyer.id,
                `Покупатель оплатил товар ${paymentLabel(paymentMethod)}. Деньги зарезервированы до подтверждения получения.`
            );

            const order = await tx.order.findUniqueOrThrow({
                where: { id: createdOrder.id },
                include: orderDetailInclude,
            });

            return { code: "OK" as const, order };
        });

        if (result.code === "ITEM_NOT_FOUND") return res.status(404).json({ message: "Item not found" });
        if (result.code === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (result.code === "UNAVAILABLE") return res.status(400).json({ message: "Item is not available" });
        if (result.code === "OWN_ITEM") return res.status(400).json({ message: "Seller cannot buy own item" });
        if (result.code === "NOT_ENOUGH_BALANCE") return res.status(400).json({ message: "Not enough balance" });

        res.status(201).json(normalizeOrder(result.order));
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
        if (order.status === "CANCELLED") return res.status(400).json({ message: "Deal is already cancelled" });

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
                select: {
                    id: true,
                    buyerId: true,
                    sellerId: true,
                    status: true,
                    price: true,
                    payment: { select: { id: true } },
                },
            });

            if (!order) return null;
            if (order.buyerId !== req.user!.id) return "FORBIDDEN" as const;
            if (order.status === "CANCELLED") return "CANCELLED" as const;
            if (order.status === "COMPLETED") {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }

            const price = toNumber(order.price);
            const walletPrice = balanceAmount(price);

            const released = await tx.order.updateMany({
                where: {
                    id: order.id,
                    status: { in: ["PAID", "DISPUTED"] },
                },
                data: {
                    status: "COMPLETED",
                    confirmedAt: new Date(),
                },
            });

            if (released.count === 0) {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }

            const seller = await tx.user.update({
                where: { id: order.sellerId },
                data: { balance: { increment: walletPrice } },
                select: { balance: true },
            });

            if (order.payment) {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { status: "RELEASED", releasedAt: new Date() },
                });
            }

            await tx.walletTransaction.create({
                data: {
                    userId: order.sellerId,
                    orderId: order.id,
                    paymentId: order.payment?.id,
                    type: "SALE_RELEASE",
                    amount: walletPrice,
                    balanceAfter: seller.balance,
                    note: "Зачисление продавцу после подтверждения сделки",
                },
            });

            await createSystemMessage(tx, order.id, req.user!.id, "Покупатель подтвердил получение. Деньги переведены продавцу.");

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderDetailInclude,
            });
        });

        if (!updated) return res.status(404).json({ message: "Order not found" });
        if (updated === "FORBIDDEN") return res.status(403).json({ message: "Only buyer can confirm delivery" });
        if (updated === "CANCELLED") return res.status(400).json({ message: "Deal is already cancelled" });

        res.json(normalizeOrder(updated));
    } catch (err) {
        next(err);
    }
});

router.post("/:orderId/refund", requireAuth, async (req, res, next) => {
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: req.params.orderId },
                select: {
                    id: true,
                    itemId: true,
                    buyerId: true,
                    sellerId: true,
                    status: true,
                    price: true,
                    deliveryData: true,
                    payment: { select: { id: true, status: true, method: true } },
                },
            });

            if (!order) return null;
            if (order.buyerId !== req.user!.id) return "FORBIDDEN" as const;
            if (order.status === "COMPLETED") return "COMPLETED" as const;
            if (order.status === "CANCELLED") {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }
            if (order.deliveryData && order.status !== "DISPUTED") return "NEEDS_DISPUTE" as const;

            const price = toNumber(order.price);
            const walletPrice = balanceAmount(price);
            const held = await tx.walletTransaction.aggregate({
                where: {
                    orderId: order.id,
                    userId: order.buyerId,
                    type: "PURCHASE_HOLD",
                },
                _sum: { amount: true },
            });
            const heldAmount = toNumber(held._sum.amount ?? 0);
            let refundWalletAmount = heldAmount < 0 ? balanceAmount(Math.abs(heldAmount)) : 0;

            if (order.payment?.method === "BALANCE" && refundWalletAmount === 0) {
                refundWalletAmount = walletPrice;
            }

            const cancelled = await tx.order.updateMany({
                where: {
                    id: order.id,
                    status: { in: ["PAID", "DISPUTED"] },
                },
                data: {
                    status: "CANCELLED",
                    cancelledAt: new Date(),
                },
            });

            if (cancelled.count === 0) {
                return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
            }

            await tx.item.update({
                where: { id: order.itemId },
                data: { status: "LISTED", ownerId: null },
            });

            if (order.payment) {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { status: "REFUNDED", refundedAt: new Date() },
                });
            }

            if (refundWalletAmount > 0) {
                const buyer = await tx.user.update({
                    where: { id: order.buyerId },
                    data: { balance: { increment: refundWalletAmount } },
                    select: { balance: true },
                });

                await tx.walletTransaction.create({
                    data: {
                        userId: order.buyerId,
                        orderId: order.id,
                        paymentId: order.payment?.id,
                        type: "REFUND",
                        amount: refundWalletAmount,
                        balanceAfter: buyer.balance,
                        note: "Возврат средств на баланс покупателя",
                    },
                });

                await createSystemMessage(tx, order.id, req.user!.id, "Сделка отменена. Деньги возвращены на баланс покупателя.");
            } else {
                await createSystemMessage(
                    tx,
                    order.id,
                    req.user!.id,
                    "Сделка отменена. Внешний платеж помечен как возвращенный, баланс покупателя не изменен."
                );
            }

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderDetailInclude,
            });
        });

        if (!updated) return res.status(404).json({ message: "Order not found" });
        if (updated === "FORBIDDEN") return res.status(403).json({ message: "Only buyer can request refund" });
        if (updated === "COMPLETED") return res.status(400).json({ message: "Completed deal cannot be refunded" });
        if (updated === "NEEDS_DISPUTE") return res.status(400).json({ message: "Open a dispute before refunding delivered data" });

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
            if (order.status === "CANCELLED") return "CANCELLED" as const;

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
        if (updated === "CANCELLED") return res.status(400).json({ message: "Deal is already cancelled" });

        res.json(normalizeOrder(updated));
    } catch (err) {
        next(err);
    }
});

export default router;
