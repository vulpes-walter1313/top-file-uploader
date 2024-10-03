import express from "express";
import * as filesController from "../controllers/filesController";

const router = express.Router();
// all routes will be prefixed by `/files/`
router.get("/", filesController.filesGet);

router.get("/:fileId", filesController.fileGet);

router.get("/:fileId/update", filesController.fileUpdateGet);
router.post("/:fileId/update", filesController.fileUpdatePost);

router.get("/:fileId/delete", filesController.fileDeleteGet);
router.post("/:fileId/delete", filesController.fileDeletePost);

export default router;
