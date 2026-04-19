"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const superadmin_1 = __importDefault(require("./routes/superadmin"));
const courses_1 = __importDefault(require("./routes/courses"));
const stats_1 = __importDefault(require("./routes/stats"));
const testimonials_1 = __importDefault(require("./routes/testimonials"));
const seed_1 = __importDefault(require("./routes/seed"));
const users_1 = __importDefault(require("./routes/users"));
const payment_1 = __importDefault(require("./routes/payment"));
const upload_1 = __importDefault(require("./routes/upload"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// Connect to database
(0, db_1.connectDB)();
const origins = [
    process.env.CORS_ORIGIN,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://website-bice-nine-89.vercel.app"
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: origins,
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/auth", auth_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/superadmin", superadmin_1.default);
app.use("/api/courses", courses_1.default);
app.use("/api/stats", stats_1.default);
app.use("/api/testimonials", testimonials_1.default);
app.use("/api/users", users_1.default);
app.use("/api/payment", payment_1.default);
app.use("/api/upload", upload_1.default);
app.use("/api/seed", seed_1.default);
app.use(errorHandler_1.errorHandler);
// Export for Vercel
exports.default = app;
// For local development
if (require.main === module) {
    const PORT = process.env.PORT ?? 5000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
