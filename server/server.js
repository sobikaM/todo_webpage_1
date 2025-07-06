import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import User from "./models/User.js";
import Task from "./models/Task.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/kanban";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "your-google-client-id";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Middleware: protect routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Kanban Backend is running.");
});

// Google login
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = new User({ username: name, email, googleId: sub });
      await user.save();
    }

    const jwtToken = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token: jwtToken, user: { username: user.username, email: user.email } });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// Signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.send("Signup successful");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({ error: "Username already exists" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const jwtToken = jwt.sign(
    { userId: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token: jwtToken, username: user.username });
});

// Get tasks
app.get("/api/tasks", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const tasks = await Task.find({ owners: user._id });
  res.json(tasks);
});

// Add task
app.post("/api/tasks", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Task text required" });

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const task = new Task({ text, status: "todo", owners: [user._id] });
  await task.save();

  res.send(task._id.toString());
});

// Update task
app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { text, status } = req.body;

  await Task.findByIdAndUpdate(id, { text, status });
  res.send("Task updated");
});

// Delete task
app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  await Task.findByIdAndDelete(id);
  res.send("Task deleted");
});

// Share task
app.post("/api/tasks/:id/share", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { toUsername } = req.body;

  const user = await User.findOne({ username: toUsername });
  if (!user) return res.status(404).json({ error: "User not found" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.owners.includes(user._id))
    return res.status(400).json({ error: "Task already shared with this user" });

  task.owners.push(user._id);
  await task.save();

  res.send("Task shared");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
