require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes (must be before static so /api is not served as static)
app.use("/api", require("./routes"));

// Serve frontend static files (HTML, CSS, JS)
app.use(express.static(FRONTEND_DIR));
// SPA-style: serve index.html for non-API routes (Express 5 uses named wildcard)
app.get("/{*path}", (req, res) => {
  if (!req.path.startsWith("/api")) {
    const file = path.join(FRONTEND_DIR, req.path);
    if (require("fs").existsSync(file) && require("fs").statSync(file).isFile()) {
      return res.sendFile(file);
    }
    return res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  }
  res.status(404).json({ message: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`Frontend served at http://localhost:${PORT}`);
});
