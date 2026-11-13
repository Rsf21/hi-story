import express from "express";
import rateLimit from "express-rate-limit";
import {
  showLogin,
  handleLogin,
  handleLogout,
} from "../controllers/authControllers.js";
import { requireAdmin } from "../middlewares/authMiddlewares.js";
import { upload } from "../middlewares/upload.js";
import { showDashboard } from "../controllers/admin/adminDashboardControllers.js";
import {
  listStories,
  showCreate,
  handleCreate,
  showEdit,
  handleUpdate,
  handleDelete,
  handleImageUpload,
} from "../controllers/admin/adminStoryControllers.js";
import {
  listCategories,
  handleCreateCategory,
  handleDeleteCategory,
} from "../controllers/admin/adminCategoryControllers.js";
import {
  listLocations,
  handleCreateLocation,
  handleDeleteLocation,
} from "../controllers/admin/adminLocationControllers.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/login", showLogin);
router.post("/login", loginLimiter, handleLogin);
router.post("/logout", requireAdmin, handleLogout);

router.get("/", requireAdmin, showDashboard);

router.post(
  "/upload-image",
  requireAdmin,
  upload.single("image"),
  handleImageUpload,
);

router.get("/stories", requireAdmin, listStories);
router.get("/stories/create", requireAdmin, showCreate);
router.post("/stories", requireAdmin, upload.single("image"), handleCreate);
router.get("/stories/:id/edit", requireAdmin, showEdit);
router.post("/stories/:id", requireAdmin, upload.single("image"), handleUpdate);
router.post("/stories/:id/delete", requireAdmin, handleDelete);

router.get("/categories", requireAdmin, listCategories);
router.post("/categories", requireAdmin, handleCreateCategory);
router.post("/categories/:id/delete", requireAdmin, handleDeleteCategory);

router.get("/locations", requireAdmin, listLocations);
router.post("/locations", requireAdmin, handleCreateLocation);
router.post("/locations/:id/delete", requireAdmin, handleDeleteLocation);

export default router;
