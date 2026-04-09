import { Doctor, RegisterDoctorPayload, ApiResponse } from '../types/doctor';

// 🔧 Replace with your actual backend URL
const BASE_URL = 'http://10.0.2.2:8080';

export const DoctorService = {
  registerDoctor: async (
    payload: RegisterDoctorPayload,
  ): Promise<ApiResponse<Doctor>> => {
    const response = await fetch(`${BASE_URL}/doctors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<Doctor> = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  getAllDoctors: async (): Promise<ApiResponse<Doctor>> => {
    const response = await fetch(`${BASE_URL}/doctors`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data: ApiResponse<Doctor> = await response.json();
    if (!response.ok)
      throw new Error(data.message || 'Failed to fetch doctors');
    return data;
  },
};
