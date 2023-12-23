import ApiError from "./apiError.js";

// Not Empty Validation
export const notEmptyValidation = (fields) => {
  if (fields.some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  return fields;
};

// Username Validation
export const usernameValidation = (username) => {
  const usernameRegex = /^[a-zA-Z0-9]+([_\-.][a-zA-Z0-9]+)*$/;
  if (!usernameRegex.test(username)) {
    throw new ApiError(
      400,
      "Username should only contain alphabets, numbers and (_ - .)"
    );
  }
  return username;
};

// Email Validation
export const emailValidation = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Please enter a valid email!");
  }
  return email;
};

// Password Validation
export const passwordValidation = (password) => {
  if (password.length <= 6) {
    throw new ApiError(400, "Password length must be minimum 6 characters");
  }
  return password;
};
