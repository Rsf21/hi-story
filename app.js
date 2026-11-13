import express from "express";
import session from "express-session";
import MYSQLStoreFactory from "express-mysql-session";
import path from "path";
import { fileURLToPath } from "url";
import { getAllCategories } from "./models/categoryModels.js";
import dotenv from "dotenv";
import pool from "./src/config/database.js";
import indexRoutes from "./src/routes/indexRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import storyRoutes from "./src/routes/storyRoutes.js";
import {
  notFoundHandler,
  errorHandler,
} from "./src/middlewares/errorHandler.js";
import { getBookmarkedIds } from "./models/bookmarkModels.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const MySQLStore = MYSQLStoreFactory(session);
const sessionStore = new MySQLStore({}, pool);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  }),
);

app.use(async (req, res, next) => {
  try {
    const user = (req.session && req.session.user) || null;
    res.locals.user = user;
    res.locals.currentPath = req.originalUrl;
    res.locals.savedIds = user ? await getBookmarkedIds(user.id) : [];
    next();
  } catch (err) {
    next(err);
  }
});

const ADMIN_PATH = `/${process.env.ADMIN_URL}`;

app.use((req, res, next) => {
  res.locals.adminPath = ADMIN_PATH;
  next();
});

app.use(async (req, res, next) => {
  try {
    res.locals.categories = await getAllCategories();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/", indexRoutes);
app.use("/story", storyRoutes);
app.use(ADMIN_PATH, adminRoutes);
app.use("/", indexRoutes);
app.use("/story", storyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
