const express = require("express");
const path = require("path");
const process = require("process");
const logger = require("../utils/Logger");

process.on("SIGINT", () => {
  logger.info("SIGINT received, exiting");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, exiting");
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const distPath = path.join(__dirname, "..", "..", "dist");
app.use("/", express.static(distPath, { maxAge: "30d" }));

app.listen(PORT, () => {
  logger.info("Deployed server started on port: " + PORT);
});
