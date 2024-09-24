import express from "express";
import * as foldersController from "../controllers/foldersController";

const router = express.Router();
// all routes will be prefixed by `/folders/`
router.get("/", foldersController.foldersGet);

router.get("/create", foldersController.foldersCreateGet);
router.post("/create", foldersController.foldersCreatePost);

export default router;
