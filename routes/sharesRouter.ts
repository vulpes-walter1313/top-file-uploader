import express from "express";
import * as sharesController from "../controllers/sharesController";

const router = express.Router();

// These routes will be prefixed with '/shares'
router.get("/:shareId", sharesController.shareGet);

export default router;
