import {
  getCategoriesWithCount,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  deleteCategory,
} from "../../../models/categoryModels.js";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const renderIndex = async (req, res, { error = null, status = 200 } = {}) => {
  const categories = await getCategoriesWithCount();
  res.status(status).render("admin/categories/index", {
    title: "Kelola Kategori",
    admin: req.session.admin,
    categories,
    error,
  });
};

export const listCategories = async (req, res, next) => {
  try {
    await renderIndex(req, res);
  } catch (err) {
    next(err);
  }
};

export const handleCreateCategory = async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    const slug = slugify(name);

    if (!name || !slug) {
      return renderIndex(req, res, {
        error: "Nama kategori wajib diisi (pakai huruf/angka)",
        status: 400,
      });
    }
    if (await getCategoryBySlug(slug)) {
      return renderIndex(req, res, {
        error: "Kategori itu sudah ada",
        status: 400,
      });
    }

    await createCategory(name, slug);
    res.redirect(`${res.locals.adminPath}/categories`);
  } catch (err) {
    next(err);
  }
};

export const handleDeleteCategory = async (req, res, next) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (category) {
      try {
        await deleteCategory(category.id);
      } catch (err) {
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
          return renderIndex(req, res, {
            error: `Kategori "${category.name}" masih dipakai cerita, pindahin atau hapus ceritanya dulu`,
            status: 400,
          });
        }
        throw err;
      }
    }
    res.redirect(`${res.locals.adminPath}/categories`);
  } catch (err) {
    next(err);
  }
};
