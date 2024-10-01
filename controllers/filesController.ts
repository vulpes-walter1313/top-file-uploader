import { type Request, type Response, type NextFunction } from "express";
import {
  param,
  body,
  query,
  validationResult,
  matchedData,
} from "express-validator";
import asyncHandler from "express-async-handler";
import { isLoggedIn } from "../middleware/auth";
import HttpError from "../lib/HttpError";
import db from "../db/db";
import he from "he";
import {
  injectDateTimeIntoLocals,
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
} from "../middleware/utils";

export const filesGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Your Files" });
};

export const fileGet = [
  isLoggedIn,
  injectHEIntoLocals,
  injectDateTimeIntoLocals,
  injectFormatBytesIntoLocals,
  param("fileId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("fileId is not valid", 400));
      return;
    }
    const file = await db.file.findUnique({
      where: {
        id: data.fileId,
      },
      include: {
        inFolder: true,
      },
    });

    console.log("filesController.ts -> fileGet() -> file{}", file);

    if (!file) {
      next(new HttpError("File does not exist", 404));
      return;
    }

    const canView = req.user?.id || req.user?.id === file.createdBy;

    if (!canView) {
      next(
        new HttpError("You are not authorized to access this resource", 403),
      );
      return;
    }

    res.render("file", { title: he.decode(file.name), file: file });
  }),
];
