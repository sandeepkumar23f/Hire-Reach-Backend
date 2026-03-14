import { ObjectId } from "mongodb";
import { connection } from "../src/config/dbconfig.js";
import XLSX from "xlsx";
export const createCampaign = async (req, res) => {
  try {
    const { name, role, subject, template } = req.body;

    if (!name || !role || !template) {
      return res.status(400).json({
        success: false,
        message: "Name, role and template are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "HR file is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const hrList = jsonData
      .map((row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
          normalized[key.toLowerCase().trim()] = row[key];
        });

        return {
          _id: new ObjectId(),
          name: normalized.name || "",
          email: normalized.email || "",
          company: normalized.company || "",
          status: "not_sent",
          error: null,
          sentAt: null,
        };
      })
      .filter((hr) => hr.name && hr.email);

    if (!hrList.length) {
      return res.status(400).json({
        success: false,
        message: "No valid HR records found",
      });
    }

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const newCampaign = {
      name,
      role,
      subject: subject || `${role} Opportunity`,
      template,
      status: "draft",
      totalSent: 0,
      totalFailed: 0,
      totalCount: hrList.length,
      hrList,
      user: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignCollection.insertOne(newCampaign);

    res.status(201).json({
      success: true,
      campaignId: result.insertedId,
    });
  } catch (error) {
    console.error("Create Campaign Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getSingleCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const campaign = await campaignCollection.findOne({
      _id: new ObjectId(id),
      user: new ObjectId(req.user.id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getCampaigns = async (req, res) => {
  try {
    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const campaigns = await campaignCollection
      .find({ user: new ObjectId(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, subject, template } = req.body;

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const result = await campaignCollection.updateOne(
      {
        _id: new ObjectId(id),
        user: new ObjectId(req.user.id),
      },
      {
        $set: {
          name,
          role,
          subject,
          template,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found or already started",
      });
    }

    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const result = await campaignCollection.deleteOne({
      _id: new ObjectId(id),
      user: new ObjectId(req.user.id),
      status: "draft", // prevent deleting running campaigns
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found or already started",
      });
    }

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const MAX_DAILY_EMAILS = 150;

export const startCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const campaign = await campaignCollection.findOne({
      _id: new ObjectId(id),
      user: new ObjectId(userId),
    });

    if (!campaign)
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });

    if (campaign.status !== "draft")
      return res.status(400).json({
        success: false,
        message: "Already started",
      });

    const now = new Date();

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const emailsSentToday = await campaignCollection.countDocuments({
      user: new ObjectId(userId),
      status: "sent",
      sentAt: { $gte: startOfDay },
    });

    if (emailsSentToday >= MAX_DAILY_EMAILS) {
      
      // midnight reset
      const resetAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      return res.status(429).json({
        success: false,
        limitReached: true,
        emailsSentToday,
        maxLimit: MAX_DAILY_EMAILS,
        resetAt,
      });
    }

    await campaignCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "sending",
          startedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      emailsSentToday,
      maxLimit: MAX_DAILY_EMAILS,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};