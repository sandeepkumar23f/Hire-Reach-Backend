import jwt from "jsonwebtoken";

export default function verifyJWTToken(req, res, next) {
  console.log("Cookies received:", req.cookies);

  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.warn("⚠️ No token found in cookies or headers");
    return res.status(401).json({ success: false, message: "No token found" });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not defined in .env");
    return res.status(500).json({ success: false, message: "Server configuration error" });
  }

  jwt.verify(token, secret, (error, decoded) => {
    if (error) {
      console.error("Invalid token:", error.message);
      return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }

    console.log("Decoded token:", decoded);
    req.user = decoded;
    next();
  });
}