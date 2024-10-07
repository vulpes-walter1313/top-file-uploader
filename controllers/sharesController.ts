import { matchedData, param, validationResult } from "express-validator";
import asyncHandler from "express-async-handler";
import { type Request, type Response, type NextFunction } from "express";
import HttpError from "../lib/HttpError";
import db from "../db/db";
import he from "he";
import {
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
} from "../middleware/utils";

// GET /shares/:shareId
export const shareGet = [
  param("shareId").isUUID(),
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    if (!valResult.isEmpty()) {
      next(new HttpError("shareId is not a valid id", 400));
      return;
    }

    const share = await db.share.findUnique({
      where: {
        id: data.shareId,
      },
      select: {
        id: true,
        expiresAt: true,
        folderShared: {
          select: {
            id: true,
            name: true,
            description: true,
            files: {
              select: {
                id: true,
                name: true,
                fileType: true,
                fileUrl: true,
                size: true,
              },
              orderBy: {
                updatedAt: "desc",
              },
            },
          },
        },
      },
    });
    if (!share) {
      next(new HttpError("Share does not exist", 404));
      return;
    }
    console.log("sharesController.ts -> shareGet() -> shareObj ", share);
    res.render("share", {
      title: `${he.decode(share.folderShared.name)} File Share`,
      share,
    });
  }),
];
