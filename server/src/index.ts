import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { assetsRouter } from "./routes/assets.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

const defaultOrigins = ["http://localhost:1420", "http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : defaultOrigins;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/", assetsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Axion API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
