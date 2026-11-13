import {
  getAllLocations,
  createLocation,
  deleteLocation,
} from "../../../models/locationModels.js";

const renderIndex = async (
  req,
  res,
  { error = null, status = 200, form = {} } = {},
) => {
  const locations = await getAllLocations();
  res.status(status).render("admin/locations/index", {
    title: "Kelola Lokasi",
    admin: req.session.admin,
    locations,
    error,
    form,
  });
};

export const listLocations = async (req, res, next) => {
  try {
    await renderIndex(req, res);
  } catch (err) {
    next(err);
  }
};

export const handleCreateLocation = async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    const lat = parseFloat(String(req.body.lat).replace(",", "."));
    const lng = parseFloat(String(req.body.lng).replace(",", "."));
    const radius = parseInt(req.body.radius_km, 10) || 500;

    if (
      !name ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      return renderIndex(req, res, {
        error:
          "Nama wajib diisi, lintang antara -90 dan 90, bujur antara -180 dan 180",
        status: 400,
        form: req.body,
      });
    }
    if (radius < 50 || radius > 3000) {
      return renderIndex(req, res, {
        error: "Radius harus 50 sampai 3000 km",
        status: 400,
        form: req.body,
      });
    }

    await createLocation({ name, lat, lng, radius_km: radius });
    res.redirect(`${res.locals.adminPath}/locations`);
  } catch (err) {
    next(err);
  }
};

export const handleDeleteLocation = async (req, res, next) => {
  try {
    await deleteLocation(req.params.id);
    res.redirect(`${res.locals.adminPath}/locations`);
  } catch (err) {
    next(err);
  }
};
