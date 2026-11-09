// server/dev.js
// Starts the API on your own computer: http://localhost:5000
// (On Vercel this file is not used; api/index.js runs the app instead.)

// Load .env BEFORE the app reads its settings.
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
