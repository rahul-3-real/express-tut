import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAccount,
  updateAvatarImage,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/refresh-token").post(refreshAccessToken);

userRouter.route("/change-password").patch(verifyJWT, changeCurrentPassword);
userRouter.route("/get-user").get(verifyJWT, getCurrentUser);
userRouter.route("/update-user").patch(verifyJWT, updateUserAccount);
userRouter
  .route("/update-avatar")
  .patch(upload.single("avatar"), verifyJWT, updateAvatarImage);
userRouter
  .route("/update-cover-image")
  .patch(upload.single("coverImage"), verifyJWT, updateCoverImage);

export default userRouter;
