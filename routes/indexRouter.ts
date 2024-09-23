import express from "express";
import * as indexController from "../controllers/indexController";
import passport from "passport";

const router = express.Router();

router.get("/", indexController.indexGet);

router.get("/signup", indexController.signupGet);
router.post("/signup", indexController.signupPost);

router.get("/login", indexController.loginGet);
router.post("/login", indexController.loginPost);

router.get("/logout", indexController.logoutGet);

export default router;
