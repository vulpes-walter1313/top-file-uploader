import { type Request, type Response, type NextFunction } from "express";
import {
  body,
  validationResult,
  matchedData,
  param,
  query,
} from "express-validator";
import { isLoggedIn } from "../middleware/auth";
import asyncHandler from "express-async-handler";
import db from "../db/db";
import HttpError from "../lib/HttpError";
import {
  injectDateTimeIntoLocals,
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
  upload,
} from "../middleware/utils";
import { Prisma } from "@prisma/client";

// /folders
export const foldersGet = [
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
      const totalFolders = await db.folder.count({
        where: { createdBy: req.user?.id },
      });
      const totalPages = Math.ceil(totalFolders < 1 ? 1 : totalFolders / 10);
      const pagesArr: number[] = Array.from({ length: totalPages }).map(
        (_, idx) => idx + 1,
      );
      const folders = await db.folder.findMany({
        where: {
          createdBy: req.user?.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
      });
      const query = validErrors.q ? "" : data.q;
      res.render("folders", {
        title: `${req.user?.firstName}'s Folders`,
        folders,
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

    const search: Prisma.FolderWhereInput = data.q
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
    const totalFolders = await db.folder.count({
      where: search,
    });
    const totalPages = Math.ceil(totalFolders / limit);
    if (page > totalPages) page = totalPages < 1 ? 1 : totalPages;
    const offset = (page - 1) * limit;
    const pagesArr: { href: string; num: number }[] = Array.from({
      length: totalPages,
    }).map((_, idx) => {
      const url = new URL("http://localhost:3000/folders");
      url.searchParams.set("q", data.q);
      url.searchParams.set("limit", limit.toString());
      url.searchParams.set("page", (idx + 1).toString());
      return {
        href: url.href,
        num: idx + 1,
      };
    });

    const folders = await db.folder.findMany({
      where: search,
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
    });
    res.render("folders", {
      title: "Your folders",
      folders,
      currentPage: page,
      limit: limit,
      query: data.q,
      pagesArr: pagesArr,
    });
  }),
];

export const foldersCreateGet = [
  isLoggedIn,
  (req: Request, res: Response, next: NextFunction) => {
    res.render("folderCreate", { title: "Create a folder" });
  },
];

export const foldersCreatePost = [
  isLoggedIn,
  body("name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Name has to be between 1 and 50 characters")
    .escape(),
  body("description")
    .trim()
    .isLength({ min: 0, max: 256 })
    .withMessage("Description can not be more than 256 characters")
    .escape(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      res.status(400).render("folderCreate", {
        title: "Create a folder",
        validErrors,
        // @ts-ignore
        name: validErrors.name?.value! || data.name,
        // @ts-ignore
        description: validErrors.description?.value || data.description,
      });
      return;
    }
    const name = String(data.name);
    const description = String(data.description);

    const newFolder = await db.folder.create({
      data: {
        name: name,
        description: description,
        createdBy: req.user?.id!,
      },
    });

    res.status(200).redirect(`/folders/${newFolder.id}`);
  }),
];

export const folderGet = [
  isLoggedIn,
  param("folderId").isUUID(),
  injectHEIntoLocals,
  injectFormatBytesIntoLocals,
  injectDateTimeIntoLocals,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const error = new HttpError("That folder id does not exist", 400);
      console.log(
        "foldersController.ts -> folderGet() -> data, error",
        data,
        error,
      );
      next(error);
      return;
    }

    const folder = await db.folder.findUnique({
      where: { id: data.folderId },
      include: { files: true },
    });
    if (!folder) {
      const error = new HttpError("Folder does not exist", 404);
      console.log(
        "foldersController.ts -> folderGet() -> !folder ->data, error",
        data,
        error,
      );
      next(error);
      return;
    }
    const canView = req.user?.isAdmin || req.user?.id === folder.createdBy;
    if (!canView) {
      const error = new HttpError("You are not authorized", 403);
      next(error);
      return;
    }

    res.render("folder", { title: `${folder?.name}`, folder: folder });
  }),
];

export const folderUploadGet = [
  isLoggedIn,
  injectHEIntoLocals,
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid Id", 400));
      return;
    }

    const folder = await db.folder.findUnique({
      where: {
        id: data.folderId,
      },
    });

    if (!folder) {
      next(new HttpError("Folder does not exist", 404));
      return;
    }

    const canView = req.user?.isAdmin || req.user?.id === folder.createdBy;
    if (!canView) {
      next(
        new HttpError("You are not authorized to access this resource", 403),
      );
      return;
    }

    res.render("folderUpload", {
      title: `Upload files to ${folder.name}`,
      folder: folder,
    });
  }),
];

export const folderUploadPost = [
  isLoggedIn,
  upload.array("files", 5),
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid Id", 400));
      return;
    }

    const folder = await db.folder.findUnique({
      where: {
        id: data.folderId,
      },
    });

    if (!folder) {
      next(new HttpError("Folder does not exist", 404));
      return;
    }

    const canView = req.user?.isAdmin || req.user?.id === folder.createdBy;
    if (!canView) {
      next(
        new HttpError("You are not authorized to access this resource", 403),
      );
      return;
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadData = req.files.map((file) => {
        return {
          fileUrl: file.path!,
          name: file.originalname.split(".")[0],
          extName: file.originalname.split(".").pop()!,
          fileType: file.mimetype!,
          size: file.size!,
          createdBy: req.user?.id!,
          folderId: folder.id,
        };
      });
      await db.file.createMany({
        data: uploadData,
      });
      res.redirect(`/folders/${folder.id}`);
      return;
    } else {
      next(new HttpError("Error in uploading files", 500));
      return;
    }
  }),
];
