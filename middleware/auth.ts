import { type Request, type Response, type NextFunction } from "express";
import HttpError from "../lib/HttpError";
export function isLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    next();
  } else {
    res.status(401).redirect("/login");
  }
}
