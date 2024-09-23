import { type Request, type Response, type NextFunction } from "express";
export const foldersGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Your folders" });
};
