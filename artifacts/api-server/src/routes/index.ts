import { Router, type IRouter } from "express";
import cartoonVideosRouter from "./cartoonVideos";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cartoonVideosRouter);

export default router;
