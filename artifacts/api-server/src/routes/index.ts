import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dayWrapRouter from "./day-wrap";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/day-wrap", dayWrapRouter);

export default router;
