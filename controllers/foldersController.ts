import { type Request, type Response, type NextFunction } from "express";
import { body, validationResult, matchedData, param } from "express-validator";
import { isLoggedIn } from "../middleware/auth";
import asyncHandler from "express-async-handler";
import db from "../db/db";
import HttpError from "../lib/HttpError";
import { injectHEIntoRes } from "../middleware/utils";
export const foldersGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Your folders" });
};

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
  injectHEIntoRes,
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

    const folder = await db.folder.findUnique({ where: { id: data.folderId } });
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
