import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { connection } from "./src/config/dbconfig.js";
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import { startEmailWorker } from "./src/workers/emailWorker.js";

dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:3000"];

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);

const startServer = async () => {
  await connection();

  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    startEmailWorker();
  });
};

startServer();