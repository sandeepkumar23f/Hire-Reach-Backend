import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connection } from "./src/config/dbconfig.js";
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import { startEmailWorker } from "./src/workers/emailWorker.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://hire-reach-web.vercel.app"
];

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);

const startServer = async () => {
  try {
    await connection();

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      startEmailWorker();
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};

startServer();