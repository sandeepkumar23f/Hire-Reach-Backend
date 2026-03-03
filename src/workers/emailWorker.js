import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { connection } from "../config/dbconfig.js";

const processCampaigns = async () => {
  try {
    const db = await connection();
    const campaignCollection = db.collection("campaigns");
    const userCollection = db.collection("users");

    // Find campaigns that are sending
    const campaigns = await campaignCollection
      .find({ status: "sending" })
      .toArray();

    for (const campaign of campaigns) {
      const nextHR = campaign.hrList.find(
        (hr) => hr.status === "not_sent"
      );

      // If no more HRs → mark completed
      if (!nextHR) {
        await campaignCollection.updateOne(
          { _id: campaign._id },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
            },
          }
        );
        continue;
      }

      const user = await userCollection.findOne({
        _id: new ObjectId(campaign.user),
      });

      if (!user?.appPassword) continue;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user.email,
          pass: user.appPassword,
        },
      });

      try {
        await transporter.sendMail({
          from: `"${user.name}" <${user.email}>`,
          to: nextHR.email,
          subject: campaign.subject,
          text: campaign.template
            .replace(/{{name}}/g, nextHR.name)
            .replace(/{{company}}/g, nextHR.company || "")
            .replace(/{{role}}/g, campaign.role),
        });

        await campaignCollection.updateOne(
          { _id: campaign._id, "hrList._id": nextHR._id },
          {
            $set: {
              "hrList.$.status": "sent",
              "hrList.$.sentAt": new Date(),
            },
            $inc: { totalSent: 1 },
          }
        );
      } catch (error) {
        await campaignCollection.updateOne(
          { _id: campaign._id, "hrList._id": nextHR._id },
          {
            $set: {
              "hrList.$.status": "failed",
              "hrList.$.error": error.message,
            },
            $inc: { totalFailed: 1 },
          }
        );
      }
    }
  } catch (err) {
    console.error("Worker Error:", err);
  }
};

export const startEmailWorker = () => {
  console.log("📨 Email worker started...");

  // Runs every 5 seconds
  setInterval(processCampaigns, 5000);
};