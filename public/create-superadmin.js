"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.default.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: "user" },
    permissions: { type: [String], default: [] },
    enrolledCourses: { type: [String], default: [] },
    phone: { type: String, default: null },
    avatar: { type: String, default: null },
    verified: { type: Boolean, default: true },
}, { timestamps: true });
const User = mongoose_1.default.models.User ?? mongoose_1.default.model("User", UserSchema);
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    const email = "superadmin@skillcourse.in";
    const plainPassword = "Admin@1234";
    const exists = await User.findOne({ email });
    if (exists) {
        console.log("Superadmin already exists:");
        console.log(`  Email:    ${email}`);
        console.log(`  Password: ${plainPassword}`);
        await mongoose_1.default.disconnect();
        return;
    }
    const password = await bcryptjs_1.default.hash(plainPassword, 10);
    const user = await User.create({ name: "Super Admin", email, password, role: "superadmin", verified: true });
    console.log("Superadmin created:");
    console.log(`  ID:       ${user._id}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${plainPassword}`);
    await mongoose_1.default.disconnect();
}
run().catch((err) => { console.error(err); process.exit(1); });
