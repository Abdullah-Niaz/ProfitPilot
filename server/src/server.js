import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

for (const key of ['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET']) {
  if (!process.env[key] || process.env[key].length < 32) throw new Error(`${key} must contain at least 32 characters`);
}
if(process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('Access and refresh secrets must be different');
if(process.env.NODE_ENV==='production' && (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.CLIENT_URL?.startsWith('https://'))) throw new Error('Production requires RESEND_API_KEY, MAIL_FROM and an HTTPS CLIENT_URL');
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Financial CRM API running on port ${PORT}`));
});
