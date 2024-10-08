import express from "express";
import * as mySharesController from "../controllers/mySharesController";

const router = express.Router();

router.get("/", mySharesController.mySharesGet);

export default router;
