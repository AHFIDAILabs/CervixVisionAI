import { authRequest } from "../utils/axiosHelper";
import { User } from "../types/userType";
import { AnalysisResult } from "../types/common";

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

const getProfile = async () => {
  return authRequest<{ user: User }>({
    method: "GET",
    url: `${baseURL}/api/v1/users/profile`,
  });
};

const editProfile = async (data: FormData) => {
  return authRequest<{
    user: User;
    accessToken?: string;
    refreshToken?: string;
  }>({
    method: "PUT",
    url: `${baseURL}/api/v1/users/editProfile`,
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

const getAnalysisById = async (id: string) => {
  return authRequest<{ analysis: AnalysisResult }>({
    method: "GET",
    url: `${baseURL}/api/v1/analyses/${id}`,
  });
};

const getMyAnalyses = async () => {
  return authRequest<{ analyses: AnalysisResult[] }>({
    method: "GET",
    url: `${baseURL}/api/v1/analyses/my`,
  });
};

const uploadScan = async (data: FormData) => {
  return authRequest<{ analysis: AnalysisResult; message: string }>({
    method: "POST",
    url: `${baseURL}/api/v1/analyses/upload`,
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export { getProfile, editProfile, getAnalysisById, getMyAnalyses, uploadScan };
