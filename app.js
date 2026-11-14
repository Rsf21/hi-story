import "dotenv/config";
import express from "express";
import session from "express-session";
import MYSQLStoreFactory from "express-mysql-session";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./src/config/database.js";
import { getAllCategories } from "./models/categoryModels.js";
import { getBookmarkedIds } from "./models/bookmarkModels.js";

import indexRoutes from "./src/routes/indexRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import storyRoutes from "./src/routes/storyRoutes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./src/middlewares/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

const MySQLStore = MYSQLStoreFactory(session);
const sessionStore = new MySQLStore({}, pool);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

const ADMIN_PATH = `/${process.env.ADMIN_URL}`;

app.use((req, res, next) => {
  res.locals.adminPath = ADMIN_PATH;
  res.locals.user = req.session?.user || null;
  res.locals.currentPath = req.originalUrl;
  next();
});

app.use(async (req, res, next) => {
  try {
    const user = req.session?.user || null;
    res.locals.savedIds = user ? await getBookmarkedIds(user.id) : [];

    next();
  } catch (error) {
    next(error);
  }
});

app.use(async (req, res, next) => {
  try {
    res.locals.categories = await getAllCategories();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/", indexRoutes);
app.use("/story", storyRoutes);
app.use(ADMIN_PATH, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
  });
}

export default app;
