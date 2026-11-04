import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const hello = await conn.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') {
      throw new Error('Financial writes require a MongoDB replica set or sharded cluster. See docs/PHASE2-HARDENING.md');
    }
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  }
};
