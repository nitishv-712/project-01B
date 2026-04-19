"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
async function connectDB() {
    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error("MONGODB_URI is not defined");
        await mongoose_1.default.connect(uri);
        isConnected = true;
        console.log("MongoDB connected");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}
