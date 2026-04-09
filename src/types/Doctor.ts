export interface Doctor {
  _id: string;
  name: string;
  mobile_number: string;
  email?: string;
  specialization?: string;
  experience_years?: number;
  qualification?: string;
  clinic_address?: string;
  created_at: string;
}

export interface RegisterDoctorPayload {
  name: string;
  mobile_number: string;
  email?: string;
  specialization?: string;
  experience_years?: number;
  qualification?: string;
  clinic_address?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  doctor?: T;
  doctors?: T[];
}
