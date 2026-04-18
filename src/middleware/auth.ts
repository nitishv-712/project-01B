import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, Role, Permission } from "../types";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ success: false, error: "No token provided" });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// Role-based: superadmin always passes, then check listed roles
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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
export function authorizePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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
