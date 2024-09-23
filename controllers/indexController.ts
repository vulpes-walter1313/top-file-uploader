import { type Request, type Response, type NextFunction } from "express";
export const indexGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Welcome to File Uploader" });
};
