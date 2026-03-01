import { ObjectId } from "mongodb";
import { connection } from "../config/dbconfig.js";
import XLSX from "xlsx";

export const createCampaign = async (req, res) => {
  try {
    const { name, role, subject, template } = req.body;

    let hrList = [];

    if (req.file) {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(sheet);

      hrList = jsonData
        .map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
          });

          return {
            _id: new ObjectId(),
            name: normalizedRow.name || "",
            email: normalizedRow.email || "",
            company: normalizedRow.company || "",
            status: "not_sent",
            error: null,
            sentAt: null,
          };
        })
        .filter((hr) => hr.name && hr.email);
    }

    if (!name || !role || !subject || !template || !hrList.length) {
      return res.status(400).json({
        success: false,
        message: "Name, role, subject, template and HR file are required",
      });
    }

    const db = await connection();
    const campaignCollection = db.collection("campaigns");

    const newCampaign = {
      name,
      role,
      subject,
      template,
      status: "draft",
      totalSent: 0,
      totalFailed: 0,
      hrList,
      user: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignCollection.insertOne(newCampaign);

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaignId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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