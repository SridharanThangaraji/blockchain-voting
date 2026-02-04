const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", require("./routes"));

// Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
