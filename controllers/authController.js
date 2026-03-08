import jwt from "jsonwebtoken";
import { connection } from "../config/dbconfig.js";
import { ObjectId } from "mongodb";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const configureEmail = async (req, res) => {
  try {
    const { appPassword } = req.body;

    if (!appPassword) {
      return res.status(400).json({
        success: false,
        message: "App password is required",
      });
    }

    const db = await connection();
    const collection = db.collection("users");

    const user = await collection.findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: user.email,
    pass: appPassword,
  },
});

    try {
      await transporter.verify();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid Gmail App Password or Gmail not configured properly",
      });
    }

    try {
      await transporter.sendMail({
        from: `"HireReach" <${user.email}>`,
        to: user.email,
        subject: "HireReach Email Connected Successfully",
        text: "Your Gmail is successfully connected to HireReach.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Connection verified but failed to send test email",
      });
    }

    await collection.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { emailAppPassword: appPassword } },
    );

    return res.json({
      success: true,
      message: "Gmail verified and test email sent successfully ✅",
    });
  } catch (error) {
    console.error("Configure Email Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const SignUp = async (req, res) => {
  try {
    const { name, email, password, appPassword } = req.body;

    if (!name || !email || !password || !appPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const db = await connection();
    const collection = db.collection("users");

    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists, please login",
      });
    }

    const newUser = {
      name,
      email,
      password,
      emailAppPassword: appPassword,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newUser);

    const tokenData = {
      id: result.insertedId.toString(),
      email,
    };

    const token = jwt.sign(tokenData, JWT_SECRET, {
      expiresIn: "5d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 5 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: {
        id: result.insertedId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const db = await connection();
    const collection = db.collection("users");

    const result = await collection.findOne({
      email,
      password,
    });

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Login failed",
      });
    }

    const tokenData = {
      id: result._id.toString(),
      email: result.email,
    };

    const token = jwt.sign(tokenData, JWT_SECRET, {
      expiresIn: "5d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 5 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
