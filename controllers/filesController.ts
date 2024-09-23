import { type Request, type Response, type NextFunction } from "express";
export const filesGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Your Files" });
};
