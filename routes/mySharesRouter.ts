import express from "express";
import * as mySharesController from "../controllers/mySharesController";

const router = express.Router();

// all routes are prefixed with /my-shares
router.get("/", mySharesController.mySharesGet);

router.post("/:shareId/delete", mySharesController.deleteSharePost);

export default router;
