import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Education {
  _id?: string;
  degree: string;
  specify_degree?: string;
  speciality: string;
  super_speciality?: string;
  pass_out_year?: number;
  university?: string;
  location?: string;
}

export interface Experience {
  _id?: string;
  years_of_experience: number;
  clinic_hospital_name: string;
  designation: string;
  start_date?: string;
  is_current: boolean;
}

export interface Reference {
  _id?: string;
  ref_name: string;
  ref_email: string;
  ref_contact_no: string;
  ref_profession: string;
}

export interface DoctorProfile {
  _id: string;
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  mobile_number: string;
  alternate_mobile_number?: string;
  email: string;
  doctor_unique_id: string;
  date_of_birth?: string;
  gender?: string;
  current_location_pincode: string;
  address_line1: string;
  address_line2?: string;
  city_district: string;
  state: string;
  doctor_license_no: string;
  medical_council_name: string;
  registration_date?: string;
  education: Education[];
  experience: Experience[];
  preferred_distance_km: number;
  preferred_pincode?: string;
  interested_in: string[];
  approval_status: string;
  is_verified: boolean;
  status: string;
  open_for_consultation?: boolean;
  open_for_duty_doctorship?: boolean;
  open_for_shift?: boolean;
  available_days?: string[];
  current_clinic_hospital_name?: string;
  is_fresher?: boolean;
  profile_pic_url?: string;
  resume_url?: string;
  references?: Reference[];
  is_profile_complete?: boolean;
  specialization?: string;
}

// ─── Context Type ───────────────────────────────────────────────────────────

interface AuthContextType {
  doctor: DoctorProfile | null;
  token: string | null;
  /** Call after successful login — stores doctor + token in memory */
  setAuth: (doctor: DoctorProfile, token: string) => void;
  /** Call after a profile PATCH to sync updated doctor into context */
  setDoctor: (doctor: DoctorProfile | null) => void;
  /** Clears session completely */
  logout: () => void;
  isRegistered: boolean;
}

// ─── Default context (safe fallback) ────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  token: null,
  setAuth: () => {},
  setDoctor: () => {},
  logout: () => {},
  isRegistered: false,
});

// ─── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [doctor, setDoctorState] = useState<DoctorProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  const setAuth = (newDoctor: DoctorProfile, newToken: string) => {
    setDoctorState(newDoctor);
    setTokenState(newToken);
  };

  const setDoctor = (d: DoctorProfile | null) => {
    setDoctorState(d);
  };

  const logout = () => {
    setDoctorState(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        token,
        setAuth,
        setDoctor,
        logout,
        isRegistered: !!doctor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
