// types/auth.ts
import { User } from "./userType";

export interface AddressDetail {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  cPassword?: string; // Confirm Password (frontend only, not sent to backend)
  role?: User["role"];
  phone?: string;
  address?: AddressDetail[];
  specialization?: string;
  licenseNumber?: string;
  hospitalAffiliation?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type AuthStackParamList = {
  home: undefined;
  WelcomeScreen: undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
};
