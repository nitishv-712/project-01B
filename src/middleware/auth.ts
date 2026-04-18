import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, Role } from "../types";

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

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}
