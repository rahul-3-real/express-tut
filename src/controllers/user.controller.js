import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import {
  generateAccessAndRefresToken,
  options,
} from "../utils/generateTokens.js";
import {
  emailValidation,
  notEmptyValidation,
  passwordValidation,
  usernameValidation,
} from "../utils/validations.js";
import mongoose from "mongoose";

// Register User
export const registerUser = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting details from frontend
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
  notEmptyValidation([email, username, password]);
  usernameValidation(username);
  emailValidation(email);
  passwordValidation(password);

  //* Checking if User exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //* Checking for files
  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  } else {
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
   * TODO: Taking details from frontend
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

// Change Current Password
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting details from frontend
   * TODO: Getting user from cookie
   * TODO: Compating old password with the user password
   * TODO: If true, set new password as user password
   * TODO: Return response
   * **/

  //* Getting data from user
  const { oldPassword, newPassword } = req.body;

  //* Getting user from cookie
  const user = await User.findById(req.user?.id);

  //* Comparing Password
  const passwordCheck = await user.isPasswordCorrect(oldPassword);
  if (!passwordCheck) {
    throw new ApiError(400, "Invalid old password!");
  }

  //* Setting new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  //* Response
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Get Current User
export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, "Fetched current user!"));
});

// Update User Account
export const updateUserAccount = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting details from frontend
   * TODO: Validating details
   * TODO: Updating user
   * **/

  //* Getting details
  const { username, email, fullname } = req.body;

  //* Validating user
  notEmptyValidation([email, username]);
  usernameValidation(username);
  emailValidation(email);

  //* Checking if username or email already exist
  const existingUser = await User.findOne({
    $and: [{ _id: { $ne: req.user?._id } }, { $or: [{ email }, { username }] }],
  });

  if (existingUser) {
    throw new ApiError(409, "Email or username is already in use");
  }

  //* Updating user
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { username, email, fullname } },
    { new: true }
  ).select("-password -refreshToken");

  //* Response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Update Avatar Image
export const updateAvatarImage = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting file from frontend
   * TODO: Updating file
   * **/

  //* Getting file
  let localPath;
  if (!req.file) {
    throw new ApiError(400, "Please upload profile picture");
  }
  localPath = req.file?.path;

  //* Updating file
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: localPath } },
    { new: true }
  ).select("-password -refreshToken");

  res.status(200).json(new ApiResponse(200, { user }, "Avatar updated!"));
});

// Update Cover Image
export const updateCoverImage = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting file from frontend
   * TODO: Updating file
   * **/

  //* Getting file
  let localPath;
  if (req.file) {
    localPath = req.file?.path;
  } else {
    localPath = "";
  }

  //* Updating file
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: localPath } },
    { new: true }
  ).select("-password -refreshToken");

  res.status(200).json(new ApiResponse(200, { user }, "Avatar updated!"));
});

// Get User Channel Profile
export const getUserChannelProfile = asyncHandler(async (req, res) => {
  /**
   * TODO: Getting username from url
   * TODO: Writing pipeline
   * TODO: Response
   * **/

  //* Getting username from url
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(404, "Username not found");
  }

  //* Writing Pipeline
  const channel = await User.aggregate([
    //* Match username with params username
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    //* Lookup for getting subscribers
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    //* Lookup for getting subscriberTo
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //* Adding Field in model (subscribersCount, channelsSubscribedToCount, isSubscribed)
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    //* Project fields (returns information of a selected field/fields)
    {
      $project: {
        fullname: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist!");
  }

  //* Response
  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// Get Watch History
export const getWatchHistory = asyncHandler(async (req, res) => {
  /**
   * TODO: Writing aggregation pipeline to fetch watch history
   * TODO: Response
   * **/

  //* Aggregation Pipeline
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  //* Response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully!"
      )
    );
});
