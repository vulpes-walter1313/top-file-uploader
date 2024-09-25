import { type Request, type Response, type NextFunction } from "express";
import he from "he";
import multer from "multer";
import cuid from "@paralleldrive/cuid2";
import { formatBytes } from "../lib/utils";
import { DateTime } from "luxon";

export function injectHEIntoLocals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.decode = he.decode;
  next();
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/fileuploads");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `${cuid.createId()}.${ext}`);
  },
});

export const upload = multer({ storage: storage });

export function injectFormatBytesIntoLocals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.formatBytes = formatBytes;
  next();
}

export function injectDateTimeIntoLocals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.DateTime = DateTime;
  next();
}
