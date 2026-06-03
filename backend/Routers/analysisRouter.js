const express = require("express");
const { getUserAnalyses, uploadScan } = require("../Controllers/analysisController");
const { verifyToken, hydrateUser } = require("../Middlewares/jwt");

const analysisRouter = express.Router();

analysisRouter.get("/my", verifyToken, hydrateUser, getUserAnalyses);
analysisRouter.post("/upload", verifyToken, hydrateUser, uploadScan);

module.exports = analysisRouter;
