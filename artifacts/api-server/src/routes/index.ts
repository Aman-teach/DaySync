import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dayWrapRouter from "./day-wrap";
import transcribeRouter from "./transcribe";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/day-wrap", dayWrapRouter);
router.use("/transcribe", transcribeRouter);

export default router;
