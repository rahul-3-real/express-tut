import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import {
  generateAccessAndRefresToken,
  options,
} from "../utils/generateTokens.js";

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
  /**
   * TODO: Taking details from user
   * TODO: Finding user
   * TODO: Password check
   * TODO: Generating Access & Refresh Token
   * TODO: Send cookie + response
   **/

  //* Getting details from user
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Usermail/Email is required");
  }

  //* Finding User
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(400, "User not found, try signing up!");
  }

  //* Checking Password
  const passwordCheck = await user.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(401, "Wrong credientials!");
  }

  //* Generate Token
  const { accessToken, refreshToken } = await generateAccessAndRefresToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //* Returning response & cookies
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedin successfully!"
      )
    );
});

// Logout User
export const logoutUser = asyncHandler(async (req, res) => {
  /**
   * TODO: Clearing cookies
   * TODO: Clearing refresh token from database
   **/

  //? verifyJWT middleware is set, which finds user, sets refreshToken in DB as undefined
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );

  //* DEMO RESPONSE
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// Refresh Access Token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting refresh token from cookie
   * TODO: Decode refresh token data
   * TODO: Check if user exists with that token
   * TODO: Comparing cookie refresh token with user refresh token stored in DB
   * TODO: If True, Generating new access token
   * TODO: Sending response with new access token in cookie
   * **/

  //* Gettig refresh token
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    //* Decoding refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //* Getting user by refresh token
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    //* Comparing cookie refresh token with user refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refres token is expired!");
    }

    //* Generating new Access token
    const { accessToken, refreshToken } = await generateAccessAndRefresToken(
      user._id
    );

    //* Response
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
  }
});
