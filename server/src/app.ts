import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRouter from "./routes/auth";
import itemsRouter from "./routes/items";
import ordersRouter from "./routes/orders";
import { errorHandler } from "./middleware/error";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/items", itemsRouter);
app.use("/api/orders", ordersRouter);

app.use(errorHandler);

export default app;
