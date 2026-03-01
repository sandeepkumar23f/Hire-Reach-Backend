import express from "express";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  getSingleCampaign,
  deleteCampaign,
} from "../controllers/campaignController.js";
import authMiddleware from "../middlewares/verifyJWTToken.js";
import multer from "multer";
const upload = multer({storage: multer.memoryStorage()})
const router = express.Router();

router.post("/create", authMiddleware, upload.single("file"), createCampaign);
router.get("/", authMiddleware, getCampaigns);
router.get("/:id", authMiddleware, getSingleCampaign);
router.put("/:id", authMiddleware, updateCampaign);
router.delete("/:id", authMiddleware, deleteCampaign);

export default router;