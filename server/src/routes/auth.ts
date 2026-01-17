import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(30),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const signToken = (u: { id: string; email: string; username: string; role: "USER" | "ADMIN" }) =>
    jwt.sign({ id: u.id, email: u.email, username: u.username, role: u.role }, env.JWT_SECRET, { expiresIn: "7d" });

// Регистрация
router.post("/register", async (req, res, next) => {
    try {
        const { email, username, password } = registerSchema.parse(req.body);

        const [byEmail, byUsername] = await Promise.all([
            prisma.user.findUnique({ where: { email } }),
            prisma.user.findUnique({ where: { username } }),
        ]);
        if (byEmail) return res.status(409).json({ message: "Email уже используется" });
        if (byUsername) return res.status(409).json({ message: "Username уже используется" });

        const hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { email, username, passwordHash: hash },
            select: { id: true, email: true, username: true, role: true, balance: true },
        });

        const token = signToken(user);
        res.status(201).json({ token });
    } catch (err) {
        next(err);
    }
});

// Логин
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, username: true, role: true, passwordHash: true },
        });
        if (!user) return res.status(401).json({ message: "Неверный email или пароль" });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ message: "Неверный email или пароль" });

        const token = signToken(user);
        res.json({ token });
    } catch (err) {
        next(err);
    }
});

// Текущий пользователь
router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const me = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, email: true, username: true, role: true, balance: true },
        });
        res.json(me);
    } catch (err) {
        next(err);
    }
});

export default router;
