require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const connectDB = require("./configs/database");

// Models
const User = require("./Models/user");
const Notification = require("./Models/notifications");
const Analysis = require("./Models/analysis");

// Routes
const authRouter = require("./Routers/authRouter");
const userRouter = require("./Routers/userRouter");
const analysisRouter = require("./Routers/analysisRouter");
const cronRouter = require("./Routers/cron");
const logger = require("./Middlewares/logger");
const { authLimiter, apiLimiter, forgotPasswordLimiter } = require("./Middlewares/rateLimiter");

// Init app
const app = express();

// Trust the first proxy (nginx) so express-rate-limit sees real client IPs
// from X-Forwarded-For rather than the nginx container IP.
app.set("trust proxy", 1);

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8081",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Attach to app so routes/controllers can use socket
app.set("io", io);
app.set("User", User);
app.set("Notification", Notification);
app.set("Analysis", Analysis);

// Socket.io Map to track users
io.userSocketMap = new Map();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:8081" }));
app.use(express.json());
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for lab reports/images
    createParentPath: true,
  })
);

// Health check — used by Docker and load balancers
app.get("/health", (_req, res) => res.json({ status: "ok", service: "cervixvisionai-backend" }));

// ROUTES — rate limiters applied per-route group
app.use("/api/v1/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/v1/auth",     authLimiter, authRouter);
app.use("/api/v1/users",    apiLimiter,  userRouter);
app.use("/api/v1/analyses", apiLimiter,  analysisRouter);
app.use("/api/v1/cron",     apiLimiter,  cronRouter);

// SOCKET EVENTS
io.on("connection", (socket) => {
  logger.info({ event: "socket_connect", socketId: socket.id });

  socket.on("authenticate", (userId) => {
    if (!userId) return socket.disconnect();

    socket.userId = userId;
    if (!io.userSocketMap.has(userId)) io.userSocketMap.set(userId, new Set());
    io.userSocketMap.get(userId).add(socket.id);

    socket.join(userId);
    logger.info({ event: "socket_authenticated", socketId: socket.id });
  });

  // Notify doctors/patients of new analysis results — only authenticated sockets
  socket.on("newAnalysisResult", ({ analysisId, patientId, doctorId }) => {
    if (!socket.userId) return;
    io.to(patientId).emit("analysisUpdate", { analysisId, status: "ready" });
    io.to(doctorId).emit("analysisUpdate", { analysisId, status: "ready" });
  });

  // Notifications (generic) — only authenticated sockets
  socket.on("sendNotification", async ({ recipientId, title, message }) => {
    if (!socket.userId) return;
    try {
      const notification = new Notification({ recipient: recipientId, title, message });
      await notification.save();
      io.to(recipientId).emit("newNotification", {
        id: notification._id,
        title,
        message,
        createdAt: notification.createdAt,
      });
    } catch (err) {
      console.error("[SOCKET] sendNotification failed:", err.message);
    }
  });

  socket.on("disconnect", () => {
    logger.info({ event: "socket_disconnect", socketId: socket.id });
    if (socket.userId && io.userSocketMap.has(socket.userId)) {
      io.userSocketMap.get(socket.userId).delete(socket.id);
      if (io.userSocketMap.get(socket.userId).size === 0) {
        io.userSocketMap.delete(socket.userId);
      }
    }
  });
});

// Connect DB and Start Server
connectDB();
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () =>
  logger.info(`CervixVisionAI backend running on port ${PORT}`)
);
