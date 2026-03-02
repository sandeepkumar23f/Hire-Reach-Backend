import express from "express"
import { SignUp, Login,configureEmail } from "../controllers/authController.js"
import verifyJWTToken from "../middlewares/verifyJWTToken.js"
const router = express.Router()

router.post("/configure-email",verifyJWTToken, configureEmail);
router.post("/signup",SignUp)
router.post("/login",Login)

export default router