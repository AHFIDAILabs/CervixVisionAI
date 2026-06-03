import { authRequest } from "../utils/axiosHelper";
import { User } from "../types/userType";
const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

// 👤 Get Profile

const getProfile = async () => {
  return authRequest<{ user: User }>({
    method: "GET",
    url: `${baseURL}/api/v1/users/profile`,
  });
};

// ✏️ Edit Profile
const editProfile = async (data: FormData) => {
  return authRequest<{
    user: User;
    accessToken?: string;
    refreshToken?: string;
  }>({
    method: "PUT",
    url: "/api/v1/users/editProfile",
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// 🔬 Get my analyses
const getMyAnalyses = async () => {
  return authRequest<{ analyses: any[] }>({
    method: "GET",
    url: `${baseURL}/api/v1/analyses/my`,
  });
};

// 📤 Upload scan
const uploadScan = async (data: FormData) => {
  return authRequest<{ analysis: any; message: string }>({
    method: "POST",
    url: `${baseURL}/api/v1/analyses/upload`,
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export {
    getProfile,
    editProfile,
    getMyAnalyses,
    uploadScan,
}