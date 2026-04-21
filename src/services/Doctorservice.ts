import { Doctor, RegisterDoctorPayload, ApiResponse } from '../types/doctor';

// 🔧 Replace with your actual backend URL
const BASE_URL =
  'https://locumhtbe-h6fvftgnfudxc5hw.centralindia-01.azurewebsites.net';

export const DoctorService = {
  registerDoctor: async (
    payload: RegisterDoctorPayload,
  ): Promise<ApiResponse<Doctor>> => {
    const response = await fetch(`${BASE_URL}/api/doctors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    console.log('RAW RESPONSE:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON from server: ' + text);
    }
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
