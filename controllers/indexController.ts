import { type Request, type Response, type NextFunction } from "express";
import bcryptjs from "bcryptjs";
import db from "../db/db";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import passport from "passport";

export const indexGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Welcome to File Uploader" });
};

export const signupGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("signup", { title: "Signup to File Uploader" });
};

export const signupPost = [
  body("first_name")
    .isLength({ min: 1, max: 30 })
    .withMessage("must be between 1 and 30 characters")
    .escape(),
  body("last_name")
    .isLength({ min: 1, max: 30 })
    .withMessage("must be between 1 and 30 characters")
    .escape(),
  body("email")
    .isEmail()
    .withMessage("That is not a valid email")
    .custom(async (val) => {
      const dbUser = await db.user.findUnique({
        where: {
          email: val,
        },
      });
      if (dbUser) {
        throw new Error("Email already in use");
      }
    }),
  body("password").isLength({ min: 8, max: 30 }),
  body("confirm_password")
    .custom((val, { req }) => {
      return val === req.body.password;
    })
    .withMessage("passwords are not matching"),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    const data = matchedData(req);
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      console.log("indexController.ts -> signupPost()", validErrors);
      res.render("signup", {
        title: "Sign up for File Uploader",
        validErrors: validErrors,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
      });
      return;
    }

    const firstName = String(data.first_name);
    const lastName = String(data.last_name);
    const email = String(data.email);
    const passwordHash = await bcryptjs.hash(data.password, 10);
    const user = await db.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: passwordHash,
      },
    });
    res.redirect("/login");
    return;
  }),
];

export const loginGet = (req: Request, res: Response, next: NextFunction) => {
  res.render("login", { title: "Login to File Uploader" });
};

export const loginPost = [
  body("username")
    .notEmpty()
    .withMessage("Please provide your email")
    .custom(async (val) => {
      const dbUser = await db.user.findUnique({
        where: {
          email: val,
        },
      });
      if (!dbUser) {
        throw new Error("Email is not registered");
      }
    }),
  body("password").notEmpty().withMessage("Please provide your password"),
  (req: Request, res: Response, next: NextFunction) => {
    const valResult = validationResult(req);
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      res.render("login", { title: "Login to File Uploader", validErrors });
      return;
    } else {
      next();
    }
  },
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  }),
];

export const logoutGet = (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect("/");
  });
};
