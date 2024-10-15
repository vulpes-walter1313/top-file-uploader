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
import he from "he";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

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

// /folders/create
export const foldersCreateGet = [
  isLoggedIn,
  (req: Request, res: Response, next: NextFunction) => {
    res.render("folderCreate", {
      title: "Create a folder",
      h1: "Create a folder",
      action: "/folders/create",
      submitText: "Create Folder",
    });
  },
];

// /folders/create
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
      // console.log(
      //   "foldersController.ts -> folderGet() -> data, error",
      //   data,
      //   error,
      // );
      next(error);
      return;
    }

    const folder = await db.folder.findUnique({
      where: { id: data.folderId },
      include: { files: true },
    });
    if (!folder) {
      const error = new HttpError("Folder does not exist", 404);
      // console.log(
      //   "foldersController.ts -> folderGet() -> !folder ->data, error",
      //   data,
      //   error,
      // );
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
      // upload files to cloudinary and collect urls
      for (let file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          public_id: file.filename.split(".")[0],
          resource_type: "auto",
          asset_folder: "top-fu",
          display_name: file.originalname.split(".")[0],
          overwrite: true,
          type: "private",
        });
        // console.log("cloudinary result: ", result);
        // insert to db.
        await db.file.create({
          data: {
            cloudPublicId: result.public_id,
            fileUrl: result.secure_url,
            name: file.originalname.split(".")[0],
            extName: file.originalname.split(".").pop()!,
            fileType: file.mimetype,
            size: result.bytes,
            createdBy: req.user?.id!,
            folderId: folder.id,
          },
        });
        // delete files from fileuploads
        await fs.rm(path.resolve(`./public/fileuploads/${file.filename}`));
      }

      await db.folder.update({
        where: { id: folder.id },
        data: {
          updatedAt: new Date(Date.now()),
        },
      });

      res.redirect(`/folders/${folder.id}`);
      return;
    } else {
      next(new HttpError("Error in uploading files", 500));
      return;
    }
  }),
];

// /folders/:folderId/update
export const folderUpdateGet = [
  isLoggedIn,
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid id", 400));
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
    const canView = req.user?.isAdmin || folder.createdBy === req.user?.id;

    if (!canView) {
      next(new HttpError("You are not authorized to view this resource", 403));
      return;
    }

    res.render("folderCreate", {
      title: "Update you folder",
      h1: `Update folder: ${folder.name}`,
      name: he.decode(folder.name),
      description: he.decode(folder.description),
      action: `/folders/${folder.id}/update`,
      submitText: "Update Folder",
    });
  }),
];

// /folders/:folderId/update
export const folderUpdatePost = [
  isLoggedIn,
  param("folderId").isUUID(),
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

    if (!valResult.isEmpty() && valResult.mapped().folderId) {
      next(new HttpError("folderId is not a valid id", 400));
      return;
    }

    if (!valResult.isEmpty()) {
      const folder = await db.folder.findUnique({
        where: { id: data.folderId },
      });
      if (!folder) {
        next(new HttpError("folder does not exist", 404));
        return;
      }
      const canView = req.user?.id || folder.createdBy === req.user?.id;
      if (!canView) {
        next(
          new HttpError("You are not authorized to access this resource", 403),
        );
        return;
      }

      const validErrors = valResult.mapped();
      res.status(400).render("folderCreate", {
        title: "Update your folder",
        h1: `Update folder: ${folder.id}`,
        name: data.name || folder.name,
        description: data.description || folder.description,
        validErrors,
        action: `/folders/${folder.id}/update`,
        submitText: "Update Folder",
      });
      return;
    }

    // no validation errors
    const folder = await db.folder.findUnique({
      where: { id: data.folderId },
    });
    if (!folder) {
      next(new HttpError("folder does not exist", 404));
      return;
    }
    const canView = req.user?.id || folder.createdBy === req.user?.id;
    if (!canView) {
      next(
        new HttpError("You are not authorized to access this resource", 403),
      );
      return;
    }

    await db.folder.update({
      where: {
        id: folder.id,
      },
      data: {
        name: data.name,
        description: data.description,
        updatedAt: new Date(Date.now()),
      },
    });
    res.redirect(`/folders/${folder.id}`);
  }),
];

// GET /folders/:folderId/delete
export const folderDeleteGet = [
  isLoggedIn,
  injectDateTimeIntoLocals,
  injectFormatBytesIntoLocals,
  injectHEIntoLocals,
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid id", 400));
      return;
    }

    const folder = await db.folder.findUnique({
      where: {
        id: data.folderId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        files: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 9,
        },
      },
    });

    if (!folder) {
      next(new HttpError("Folder does not exist", 404));
      return;
    }
    const canView = req.user?.isAdmin || req.user?.id === folder.createdBy;

    if (!canView) {
      next(new HttpError("You are not athorized to access this resource", 403));
      return;
    }

    res.render("folderDelete", {
      title: `Delete ${he.decode(folder.name)}?`,
      folder,
    });
  }),
];

// POST /folders/:folderId/delete
export const folderDeletePost = [
  isLoggedIn,
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid id", 400));
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
      next(new HttpError("You are not authorized to perform this action", 403));
      return;
    }

    const filesInFolder = await db.file.findMany({
      where: {
        folderId: folder.id,
      },
    });
    if (filesInFolder.length > 0) {
      try {
        const filesToDelete = filesInFolder.map((file) => file.fileUrl);
        await Promise.all(
          filesToDelete.map((fileUrl) => {
            return fs.rm(path.resolve(`./public${fileUrl}`));
          }),
        );
        const deleteFiles = db.file.deleteMany({
          where: {
            folderId: folder.id,
          },
        });

        const deleteFolder = db.folder.delete({
          where: {
            id: folder.id,
          },
        });

        await db.$transaction([deleteFiles, deleteFolder]);
        res.status(200).redirect("/folders");
      } catch (e) {
        console.log("foldersController.ts -> folderDeletePost() -> Error", e);
        next(e);
        return;
      }
    } else {
      // folder is empty of files.
      await db.folder.delete({
        where: {
          id: folder.id,
        },
      });
      res.status(200).redirect("/folders");
      return;
    }
  }),
];

// GET /folders/:folderId/share
export const folderShareGet = [
  isLoggedIn,
  injectHEIntoLocals,
  param("folderId").isUUID(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      next(new HttpError("folderId is not a valid id", 400));
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
      next(new HttpError("You are not authorized to access this folder", 403));
      return;
    }

    res.render("folderShare", { title: "Create a folder share", folder });
    return;
  }),
];

// POST /folders/:folderId/share
export const folderSharePost = [
  isLoggedIn,
  injectHEIntoLocals,
  param("folderId").isUUID(),
  body("expires_in")
    .custom((val) => {
      return ["15m", "1h", "6h", "1d", "5d", "1w", "2w", "1mo"].includes(val);
    })
    .withMessage("Invalid expires_in value"),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      if (validErrors.folderId) {
        next(new HttpError("folderId is not a valid id", 400));
        return;
      }
      const folder = await db.folder.findUnique({
        where: { id: data.folderId },
      });
      if (!folder) {
        next(new HttpError("Folder does not exist", 404));
        return;
      }
      const canView = req.user?.isAdmin || req.user?.id === folder.createdBy;
      if (!canView) {
        next(
          new HttpError("You are not authorized to perform this action", 403),
        );
        return;
      }

      res.status(400).render("folderShare", {
        title: "Create a Folder Share",
        folder,
        validErrors,
      });
      return;
    }
    // validation is OK
    // create a hash that maps the options to actual milliseconds
    const timeOptions = new Map();
    timeOptions.set("15m", 15 * 60 * 1000);
    timeOptions.set("1h", 60 * 60 * 1000);
    timeOptions.set("6h", 6 * 60 * 60 * 1000);
    timeOptions.set("1d", 24 * 60 * 60 * 1000);
    timeOptions.set("5d", 5 * 24 * 60 * 60 * 1000);
    timeOptions.set("1w", 7 * 24 * 60 * 60 * 1000);
    timeOptions.set("2w", 14 * 24 * 60 * 60 * 1000);
    timeOptions.set("1m", 30 * 24 * 60 * 60 * 1000);
    // create the expires_in Date
    const expiresIn = new Date(Date.now() + timeOptions.get(data.expires_in));

    // add share to folder with folderId, expiredAt, createdBy
    const share = await db.share.create({
      data: {
        folderId: data.folderId,
        expiresAt: expiresIn,
        createdBy: req.user?.id!,
      },
    });
    res.status(200).redirect(`/my-shares`);
  }),
];
