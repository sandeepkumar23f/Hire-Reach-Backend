import express from "express"
import { SignUp, Login } from "../controllers/authController.js"
const router = express.Router()

router.post("/signup",SignUp)
router.post("/login",Login)

export default router