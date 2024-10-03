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
import { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

export const filesGet = [
  isLoggedIn,
  injectHEIntoLocals,
  injectDateTimeIntoLocals,
  query("limit")
    .optional()
    .isInt({ min: 5, max: 20 })
    .withMessage("Limit should be a whole number and between 5 and 20"),
  query("q")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("search should be shorter than 50 characters"),
  query("page").optional().isInt(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      const totalFiles = await db.file.count({
        where: { createdBy: req.user?.id },
      });
      const totalPages = Math.ceil(totalFiles < 1 ? 1 : totalFiles / 10);
      const pagesArr: number[] = Array.from({ length: totalPages }).map(
        (_, idx) => idx + 1,
      );
      const files = await db.file.findMany({
        where: {
          createdBy: req.user?.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
        include: {
          inFolder: true,
        },
      });
      const query = validErrors.q ? "" : data.q;

      res.render("files", {
        title: `${req.user?.firstName}'s Files`,
        files: files,
        validErrors,
        currentPage: 1,
        limit: 10,
        query: query,
        pagesArr: pagesArr,
      });
      return;
    }

    let page = Number(data.page || "1");
    const limit = Number(data.limit || "10");

    const search: Prisma.FileWhereInput = data.q
      ? {
          AND: [
            {
              createdBy: req.user?.id,
            },
            {
              name: {
                contains: data.q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {
          createdBy: req.user?.id,
        };
    const totalFiles = await db.file.count({
      where: search,
    });
    const totalPages = Math.ceil(totalFiles / limit);
    if (page > totalPages) page = totalPages < 1 ? 1 : totalPages;
    const offset = (page - 1) * limit;
    const pagesArr: { href: string; num: number }[] = Array.from({
      length: totalPages,
    }).map((_, idx) => {
      const url = new URL("http://localhost:3000/files");
      if (data.q) {
        url.searchParams.set("q", data.q);
      }
      url.searchParams.set("limit", limit.toString());
      url.searchParams.set("page", (idx + 1).toString());
      return {
        href: url.href,
        num: idx + 1,
      };
    });

    const files = await db.file.findMany({
      where: search,
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
      include: {
        inFolder: true,
      },
    });

    res.render("files", {
      title: "Your files",
      files,
      currentPage: page,
      limit: limit,
      query: data.q,
      pagesArr: pagesArr,
    });
  }),
];

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

    // console.log("filesController.ts -> fileGet() -> file{}", file);

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

// GET /files/:fileId/update
export const fileUpdateGet = [
  isLoggedIn,
  injectHEIntoLocals,
  param("fileId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("fileId is not a valid id", 400));
      return;
    }
    const file = await db.file.findUnique({
      where: {
        id: data.fileId,
      },
    });

    if (!file) {
      next(new HttpError("File not found", 404));
      return;
    }

    const canView = req.user?.isAdmin || req.user?.id === file.createdBy;
    if (!canView) {
      next(new HttpError("You are not authorized to view this resource", 403));
      return;
    }

    res.render("fileUpdate", { title: `Updating ${file.name}`, file });
  }),
];

// POST /files/:fileId/update
export const fileUpdatePost = [
  isLoggedIn,
  param("fileId").isUUID(),
  body("name")
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage("name should be between 3 and 64 characters")
    .escape(),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 256 })
    .withMessage("description should not be longer than 256 characters")
    .escape(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      if (validErrors.fileId) {
        next(new HttpError("fileId is not a valid id", 400));
        return;
      }
      const file = await db.file.findUnique({ where: { id: data.fileId } });
      if (!file) {
        next(new HttpError("File does not exist", 404));
        return;
      }
      const canView = req.user?.isAdmin || req.user?.id === file.createdBy;
      if (!canView) {
        next(
          new HttpError("You are not authorized to access this resource", 403),
        );
        return;
      }
      res.locals.decode = he.decode;
      res.render("fileUpdate", {
        title: `Update ${file.name}`,
        file,
        validErrors,
      });
    }
    // no validation errors

    const file = await db.file.findUnique({ where: { id: data.fileId } });
    if (!file) {
      next(new HttpError("File does not exist", 404));
      return;
    }
    const canView = req.user?.isAdmin || req.user?.id === file.createdBy;
    if (!canView) {
      next(new HttpError("You are not authorized to acess this resource", 403));
      return;
    }
    await db.file.update({
      where: { id: file.id },
      data: {
        name: data.name,
        description: data.description,
        updatedAt: new Date(Date.now()),
      },
    });
    res.redirect(`/files/${file.id}`);
  }),
];

// GET /files/:fileId/delete
export const fileDeleteGet = [
  isLoggedIn,
  injectFormatBytesIntoLocals,
  injectDateTimeIntoLocals,
  injectHEIntoLocals,
  param("fileId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("fileId is not a valid id", 400));
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
    if (!file) {
      next(new HttpError("File does not exist", 404));
      return;
    }
    const canView = req.user?.isAdmin || req.user?.id === file.createdBy;

    if (!canView) {
      next(new HttpError("You are not authorized to acces this resource", 403));
      return;
    }

    res.render("fileDelete", {
      title: `Deleting ${he.decode(file.name)}`,
      file,
    });
  }),
];

// POST /files/:fileId/delete
export const fileDeletePost = [
  isLoggedIn,
  param("fileId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("fileId is not a valid id", 400));
      return;
    }
    const file = await db.file.findUnique({
      where: {
        id: data.fileId,
      },
    });
    if (!file) {
      next(new HttpError("File doesn't exist", 404));
      return;
    }

    const canView = req.user?.isAdmin || req.user?.id === file.createdBy;
    if (!canView) {
      next(new HttpError("You are not authorized to perform this action", 403));
      return;
    }

    try {
      const filePath = `./public${file.fileUrl}`;
      await fs.rm(path.resolve(filePath));
      await db.file.delete({
        where: {
          id: data.fileId,
        },
      });
      res.redirect("/files");
      return;
    } catch (e) {
      // console.log("filesController -> fileDeletePost() -> Error", e);
      next(e);
      return;
    }
  }),
];
