import { countStories } from "../../../models/storyModels.js";
import { getAllCategories } from "../../../models/categoryModels.js";

export const showDashboard = async (req, res, next) => {
  try {
    const totalStories = await countStories();
    const categories = await getAllCategories();
    res.render("admin/dashboard", {
      title: "Dashboard",
      admin: req.session.admin,
      totalStories,
      totalCategories: categories.length,
    });
  } catch (err) {
    next(err);
  }
};
