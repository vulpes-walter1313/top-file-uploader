import express from "express";
import * as filesController from "../controllers/filesController";

const router = express.Router();
// all routes will be prefixed by `/files/`
router.get("/", filesController.filesGet);

export default router;
