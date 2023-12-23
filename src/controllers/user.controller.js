import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";

// Register User
export const registerUser = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting details from user
   * TODO: Validating details
   * TODO: Check if user already exists - username, email
   * TODO: Check for images, avatar needed
   * TODO: Create user
   * TODO: Check if user is created
   * TODO: Sending response (Remove password and refreshToken from response)
   **/

  //* Getting data from user
  const { username, email, password, fullname } = req.body;

  //* Validating details
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const usernameRegex = /^[a-zA-Z0-9]+([_\-.][a-zA-Z0-9]+)*$/;
  if (!usernameRegex.test(username)) {
    throw new ApiError(
      400,
      "Username should only contain alphabets, numbers and (_ - .)"
    );
  }
  if (password.length <= 6) {
    throw new ApiError(400, "Password length must be minimum 6 characters");
  }

  //* Checking if User exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //* Checking for files
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload profile picture");
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } else {
    coverImageLocalPath = "";
  }

  //* Creating User
  const createdUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    avatar: avatarLocalPath,
    coverImage: coverImageLocalPath,
    password,
  });

  //* Check if user is created
  const user = await User.findById(createdUser._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(500, "Error creating user, Please try again!");
  }

  //* Sending RESPONSE
  return res.status(201).json(new ApiResponse(200, user, "User registered!"));
});

// Login User
export const loginUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "ok" });
});

// Logout User
export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "ok" });
});
