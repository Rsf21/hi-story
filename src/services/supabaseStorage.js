import crypto from "crypto";
import supabase from "../config/supabase.js";

const BUCKET = "story-images";

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const createImageUpload = async (mimeType) => {
  const extension = ALLOWED_TYPES[mimeType];

  if (!extension) {
    throw new Error("Format gambar tidak didukung");
  }

  const filename = `${crypto.randomUUID()}${extension}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filename);

  if (error) throw error;

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
};

export const getPublicImageUrl = (filename) => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return data.publicUrl;
};

export const deleteImage = async (filename) => {
  if (!filename) return;

  const { error } = await supabase.storage.from(BUCKET).remove([filename]);

  if (error) throw error;
};
