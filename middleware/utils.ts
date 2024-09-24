import { type Request, type Response, type NextFunction } from "express";
import he from "he";

export function injectHEIntoRes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.decode = he.decode;
  next();
}
