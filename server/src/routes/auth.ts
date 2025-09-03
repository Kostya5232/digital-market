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

router.post("/register", async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);
        const exists = await prisma.user.findFirst({
            where: { OR: [{ email: data.email }, { username: data.username }] },
        });
        if (exists) return res.status(409).json({ message: "Email or username already used" });

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: { email: data.email, username: data.username, passwordHash, role: "USER" },
        });

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email, username: user.username }, env.JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({ token });
    } catch (err) {
        next(err);
    }
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

router.post("/login", async (req, res, next) => {
    try {
        const data = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const ok = await bcrypt.compare(data.password, user.passwordHash);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email, username: user.username }, env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token });
    } catch (err) {
        next(err);
    }
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, email: true, username: true, balance: true },
        });
        res.json(user);
    } catch (err) {
        next(err);
    }
});

export default router;
