import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    const PORT = process.env.Port || 8000;
    try {
      app.listen(PORT, () => {
        console.log(`✅ Server is running on PORT :: ${PORT}`);
      });
    } catch (error) {
      console.error(`❌ Error Connecting Server :: ${error}`);
    }
  })
  .catch((error) => {
    console.error(`❌ MongoDB connection Failed :: ${error}`);
  });
