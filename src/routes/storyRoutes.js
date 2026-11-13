import express from "express";
import {
  showStoryDetail,
  showByCategory,
} from "../controllers/storyControllers.js";

const router = express.Router();

router.get("/category/:slug", showByCategory);
router.get("/:slug", showStoryDetail);

export default router;
