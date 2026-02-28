import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import { connection } from "./config/dbconfig.js"
import authRoutes from "./routes/authRoutes.js"
import campaignRoutes from "./routes/campaignRoutes.js"
dotenv.config()
const app = express()
const allowedOrigins = [
  "http://localhost:3000",
];

const port = process.env.PORT || 5000;


app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json())
app.use(cookieParser())
connection()
app.use("/api/auth",authRoutes)
app.use("/api/campaigns",campaignRoutes)
app.listen(port,(req,res)=>{
    console.log(`app is running on port ${port}`)
})