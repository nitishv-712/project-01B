"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.authorizePermission = authorizePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).json({ success: false, error: "No token provided" });
        return;
    }
    try {
        req.user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        next();
    }
    catch {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
}
// Role-based: superadmin always passes, then check listed roles
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Not authenticated" });
            return;
        }
        if (req.user.role === "superadmin" || roles.includes(req.user.role)) {
            next();
            return;
        }
        res.status(403).json({ success: false, error: "Forbidden: insufficient role" });
    };
}
// Permission-based: superadmin always passes, admin needs the specific permission
function authorizePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Not authenticated" });
            return;
        }
        if (req.user.role === "superadmin") {
            next();
            return;
        }
        if (req.user.role === "admin" && req.user.permissions.includes(permission)) {
            next();
            return;
        }
        res.status(403).json({ success: false, error: `Forbidden: requires '${permission}' permission` });
    };
}
