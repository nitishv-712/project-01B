import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import superadminRouter from "./routes/superadmin";
import coursesRouter from "./routes/courses";
import statsRouter from "./routes/stats";
import testimonialsRouter from "./routes/testimonials";
import seedRouter from "./routes/seed";
import usersRouter from "./routes/users";
import paymentRouter from "./routes/payment";
import uploadRouter from "./routes/upload";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({
  origin: 'https://website-bice-nine-89.vercel.app/'
}));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/superadmin", superadminRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/users", usersRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/seed", seedRouter);

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
