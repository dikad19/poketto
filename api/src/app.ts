import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { spacesRouter } from "./routes/spaces";
import {
  myInvitationsRouter,
  spaceInvitationsRouter,
} from "./routes/invitations";
import { walletsRouter, categoriesRouter } from "./routes/wallets";
import { transactionsRouter } from "./routes/transactions";
import { dashboardRouter } from "./routes/dashboard";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/spaces/:spaceId/invitations", requireAuth, spaceInvitationsRouter);
app.use("/spaces/:spaceId/wallets", requireAuth, walletsRouter);
app.use("/spaces/:spaceId/categories", requireAuth, categoriesRouter);
app.use("/spaces/:spaceId/transactions", requireAuth, transactionsRouter);
app.use("/spaces/:spaceId/dashboard", requireAuth, dashboardRouter);
app.use("/spaces", requireAuth, spacesRouter);
app.use("/invitations", requireAuth, myInvitationsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Rute tidak ditemukan" });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  },
);
