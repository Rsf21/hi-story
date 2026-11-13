import express from "express";
import { showHome, searchHandler } from "../controllers/storyControllers.js";
import {
  showAbout,
  showContact,
  showFaq,
} from "../controllers/pageControllers.js";
import {
  showGlobe,
  apiGlobe,
  apiGlobeSearch,
} from "../controllers/globeControllers.js";
import {
  startGoogleLogin,
  googleCallback,
  googleLogout,
} from "../controllers/googleAuthControllers.js";
import {
  addBookmarks,
  showBookmarks,
} from "../controllers/bookmarkControllers.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

router.get("/", showHome);
router.get("/search", searchHandler);
router.get("/bumi", showGlobe);
router.get("/api/globe", apiGlobe);
router.get("/api/globe/search", apiGlobeSearch);
router.get("/tentang", showAbout);
router.get("/kontak", showContact);
router.get("/faq", showFaq);

router.get("/auth/google", startGoogleLogin);
router.get("/auth/google/callback", googleCallback);
router.post("/auth/logout", googleLogout);

router.get("/mybookmarks", requireAuth, showBookmarks);
router.post("/addBookmarks", requireAuth, addBookmarks);

export default router;
