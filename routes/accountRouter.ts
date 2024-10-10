import express from "express";
import * as accountController from "../controllers/accountController";

const router = express.Router();

// all router are prefixed with /account
router.get("/", accountController.getAccount);

router.post("/info", accountController.accountInfoChangePost);
router.post("/email", accountController.accountEmailChangePost);
router.post("/password", accountController.accountPasswordChangePost);

export default router;
