import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import customersRouter from "./customers";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import reportsRouter from "./reports";
import printConfigRouter from "./print-config";
import printLogRouter from "./print-log";
import printersRouter from "./printers";
import printerSettingsRouter from "./printer-settings";
import hrRouter from "./hr";
import returnsRouter from "./returns";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(customersRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(reportsRouter);
router.use(printConfigRouter);
router.use(printLogRouter);
router.use(printersRouter);
router.use(printerSettingsRouter);
router.use(hrRouter);
router.use(returnsRouter);

export default router;
