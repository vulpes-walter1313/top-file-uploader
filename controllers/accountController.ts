import { isLoggedIn } from "../middleware/auth";
import asyncHandler from "express-async-handler";
import { type Request, type Response, type NextFunction } from "express";
import db from "../db/db";
import HttpError from "../lib/HttpError";
import { body, matchedData, validationResult } from "express-validator";
import bcrypt from "bcryptjs";

export const getAccount = [
  isLoggedIn,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
    });
    if (!user) {
      next(new HttpError("Something went from in trying to find account", 500));
      return;
    }

    res.render("account", {
      title: "Your account settings",
    });
  }),
];

export const accountInfoChangePost = [
  isLoggedIn,
  body("first_name")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Should be between 3 and 30 characters long")
    .escape(),
  body("last_name")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Should be between 3 and 30 characters long")
    .escape(),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      res
        .status(400)
        .render("account", { title: "Your Account Settings", validErrors });
      return;
    }
    await db.user.update({
      where: {
        id: req.user?.id,
      },
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
      },
    });
    res.status(200).render("account", {
      title: "Your Account Settings",
      changeMessage: "Your name has been updated!",
    });
  }),
];

export const accountEmailChangePost = [
  isLoggedIn,
  body("email")
    .trim()
    .isEmail()
    .custom(async (val) => {
      const dbUSer = await db.user.findUnique({
        where: {
          email: val,
        },
      });
      if (dbUSer) {
        throw new Error("email already exist");
      }
    }),
  body("confirm_email")
    .trim()
    .custom((val, { req }) => val === req.body?.email)
    .withMessage("confirm password does not match"),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);

    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      res
        .status(400)
        .render("account", { title: "Your Account Settings", validErrors });
      return;
    }

    await db.user.update({
      where: {
        id: req.user?.id,
      },
      data: {
        email: data.email,
      },
    });

    res.status(200).render("account", {
      title: "Your Account Settings",
      changeMessage: "Your email has been updated!",
    });
  }),
];

export const accountPasswordChangePost = [
  isLoggedIn,
  body("old_password")
    .notEmpty()
    .custom(async (val, { req }) => {
      const passwordsMatch = await bcrypt.compare(val, req.user.password);
      if (!passwordsMatch) {
        throw new Error("Old password is incorrect");
      }
    }),
  body("new_password")
    .isLength({ min: 8, max: 64 })
    .withMessage("Password should be between 8 and 64 characters long"),
  body("confirm_new_password")
    .isLength({ min: 8, max: 64 })
    .withMessage("Password should be between 8 and 64 characters long")
    .custom((val, { req }) => val === req.body.new_password)
    .withMessage("new password does not match with confirm new password"),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    // at this point the old passwords area match and the new passwords are the same
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      res.status(400).render("account", {
        title: "Your Account Settings",
        validErrors,
      });
      return;
    }

    const dbUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
    });
    if (!dbUser) {
      next(new HttpError("Error fetching user", 500));
      return;
    }
    const newPasswordHash = await bcrypt.hash(data.new_password, 10);
    await db.user.update({
      where: {
        id: dbUser.id,
      },
      data: {
        password: newPasswordHash,
      },
    });
    res.status(200).render("account", {
      title: "Your Account Settings",
      changeMessage: "Your Password has been updated",
    });
  }),
];
