import express from "express";
import * as foldersController from "../controllers/foldersController";

const router = express.Router();
// all routes will be prefixed by `/folders/`
router.get("/", foldersController.foldersGet);

router.get("/create", foldersController.foldersCreateGet);
router.post("/create", foldersController.foldersCreatePost);

router.get("/:folderId", foldersController.folderGet);

router.get("/:folderId/upload", foldersController.folderUploadGet);
router.post("/:folderId/upload", foldersController.folderUploadPost);

router.get("/:folderId/update", foldersController.folderUpdateGet);
router.post("/:folderId/update", foldersController.folderUpdatePost);

router.get("/:folderId/delete", foldersController.folderDeleteGet);
router.post("/:folderId/delete", foldersController.folderDeletePost);

router.get("/:folderId/share", foldersController.folderShareGet);
router.post("/:folderId/share", foldersController.folderSharePost);

export default router;
