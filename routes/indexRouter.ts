import express from "express";
import * as indexController from "../controllers/indexController";

const router = express.Router();

router.get("/", indexController.indexGet);

router.get("/signup", indexController.signupGet);
router.post("/signup", indexController.signupPost);

export default router;
