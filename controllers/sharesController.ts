import {
  body,
  matchedData,
  param,
  query,
  validationResult,
} from "express-validator";
import asyncHandler from "express-async-handler";
import { type Request, type Response, type NextFunction } from "express";
import HttpError from "../lib/HttpError";
import db from "../db/db";
import he from "he";
import {
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
} from "../middleware/utils";
import path from "path";
import slugify from "slugify";

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
    res.render("share", {
      title: `${he.decode(share.folderShared.name)} File Share`,
      share,
    });
  }),
];

// GET /shares/:shareId/download/:fileId
export const shareFileDownloadGet = [
  param("shareId").isUUID(),
  param("fileId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();

      if (validErrors.shareId) {
        next(new HttpError("shareId is not a valid id", 400));
        return;
      }

      if (validErrors.fileId) {
        next(new HttpError("fileId is not a valid id", 400));
        return;
      }
    }
    // validation passed
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
      next(new HttpError("This share does not exist", 404));
      return;
    }
    const fileRecord = share.folderShared.files.find(
      (file) => file.id === data.fileId,
    );
    if (!fileRecord) {
      next(new HttpError("File requested not available", 404));
      return;
    }
    const filePathToDownload = path.resolve(
      __dirname,
      `../public/${fileRecord.fileUrl}`,
    );
    const filename = `${slugify(fileRecord.name)}.${filePathToDownload.split(".").pop()}`;
    res
      .setHeader("Content-Disposition", `attachment; filename*="${filename}"`)
      .sendFile(filePathToDownload, {}, (err) => {
        if (err) {
          return next(err);
        }
      });
  }),
];
