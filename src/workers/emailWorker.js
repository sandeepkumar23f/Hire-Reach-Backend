import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { connection } from "../config/dbconfig.js";

const processCampaigns = async () => {
  try {
    const db = await connection();
    const campaignCollection = db.collection("campaigns");
    const userCollection = db.collection("users");

    console.log(" Checking campaigns...");

    const campaigns = await campaignCollection
      .find({ status: "sending" })
      .toArray();

    console.log("Campaigns found:", campaigns.length);

    for (const campaign of campaigns) {
      console.log(" Processing campaign:", campaign._id);

      const nextHR = campaign.hrList.find((hr) => hr.status === "not_sent");

      // If all emails are sent
      if (!nextHR) {
        console.log(" Campaign completed");

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

      console.log(" Next HR:", nextHR.email);

      const user = await userCollection.findOne({
        _id: new ObjectId(campaign.user),
      });

      if (!user) {
        console.log("❌ User not found");
        continue;
      }

      if (!user.emailAppPassword) {
        console.log("❌ App password missing");
        continue;
      }

      console.log("📨 Sending email using:", user.email);

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: user.email,
          pass: user.emailAppPassword, 
        },
      });

      const emailContent = campaign.template
        .replace(/{{name}}/g, nextHR.name)
        .replace(/{{company}}/g, nextHR.company || "")
        .replace(/{{role}}/g, campaign.role);

      try {
        await transporter.sendMail({
          from: `"${user.name}" <${user.email}>`,
          to: nextHR.email,
          subject: campaign.subject || "Job Opportunity",
          text: emailContent,
        });

        console.log(" Email sent to:", nextHR.email);

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
        console.log("❌ Email failed:", error.message);

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
  console.log(" Email worker started...");
  setInterval(processCampaigns, 5000);
};