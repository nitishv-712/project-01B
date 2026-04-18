import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
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

const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const email = "superadmin@skillcourse.in";
  const plainPassword = "Admin@1234";

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Superadmin already exists:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${plainPassword}`);
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash(plainPassword, 10);
  const user = await User.create({ name: "Super Admin", email, password, role: "superadmin", verified: true });

  console.log("Superadmin created:");
  console.log(`  ID:       ${user._id}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${plainPassword}`);

  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
