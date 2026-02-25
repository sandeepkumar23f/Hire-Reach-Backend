import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { connection } from "../config/dbconfig.js";
import dotenv from "dotenv";

dotenv.config();

export const SignUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const db = await connection();
    const collection = db.collection("users");

    // check existing user by email
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists, please login"
      });
    }

    
    const newUser = {
      name,
      email,
      password,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newUser);

    if (result.acknowledged) {
      const tokenData = {
        _id: result.insertedId.toString(),
        email: email,
      };

      const token = jwt.sign(tokenData,"Google", process.env.JWT_SECRET, {
        expiresIn: "5d",
      });

      // send cookie
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
    }
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error, please try again later",
    });
  }
};

export const Login = async (req, res) => {
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
  if (result) {
    const tokenData = { _id: result._id.toString(), email: result.email };

    jwt.sign(tokenData, "Google", { expiresIn: "5d" }, (error, token) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: "jwtError",
          error: JSON.stringify(error)
        });
      }
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
        expiresIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      res.send({ success: true, message: "Login successfull" });
    });
  } else {
    res.send({
      success: false,
      message: "Login failed",
    });
  }
};
