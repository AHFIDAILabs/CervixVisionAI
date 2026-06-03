// types/user.ts
export type UserRole = "patient" | "doctor" | "lab_technician" | "admin";

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface MedicalHistory {
  condition: string;
  diagnosedAt: string; // ISO date string
  notes?: string;
}

export interface Notification {
  message: string;
  isRead: boolean;
  createdAt: string; // ISO date string
}

export interface UserImage {
   url: string | null; 
    public_id?: string; // Optional: Cloudinary public ID for image management
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  userImage?: string | null; // URL or path to profile image
  address?: Address[];
  role: UserRole;
  specialization?: string;
  licenseNumber?: string;
  hospitalAffiliation?: string;
  dateOfBirth?: string; // ISO date
  gender?: "male" | "female" | "other";
  medicalHistory?: MedicalHistory[];
  assignedDoctor?: string; // ObjectId reference
  notifications?: Notification[];
  lastLogin?: string; // ISO date
  createdAt?: string;
  updatedAt?: string;
}
