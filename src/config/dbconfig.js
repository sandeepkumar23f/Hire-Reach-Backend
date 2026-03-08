import dotenv from "dotenv"
dotenv.config()
import { MongoClient } from "mongodb";

const url=process.env.MONGO_URI

const dbName = "Hire-Reach";

const client = new MongoClient(url);

let db;

export const connection = async () => {
  if (!db) {
    await client.connect();
    console.log("MongoDB Connected!");
    db = client.db(dbName);
  }
  return db;
};