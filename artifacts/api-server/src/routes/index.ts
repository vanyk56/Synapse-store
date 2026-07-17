import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./admin/dashboard";
import usersRouter from "./admin/users";
import productsRouter from "./admin/products";
import aiModelsRouter from "./admin/ai-models";
import ordersRouter from "./admin/orders";
import settingsRouter from "./admin/settings";
import broadcastRouter from "./admin/broadcast";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(aiModelsRouter);
router.use(ordersRouter);
router.use(settingsRouter);
router.use(broadcastRouter);

export default router;
