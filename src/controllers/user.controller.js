import { asyncHandler } from "../utils/asyncHandler.js";

// Register User
export const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "ok" });
});

// Login User
export const loginUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "ok" });
});

// Logout User
export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "ok" });
});
