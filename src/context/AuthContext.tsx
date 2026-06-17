import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  end_date(end_date: any): React.ReactNode;
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
  availability: any;
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
  isLoading: boolean; // ← NEW: needed to block navigation until auth is restored
  setAuth: (doctor: DoctorProfile, token: string) => void;
  setDoctor: (doctor: DoctorProfile | null) => void;
  logout: () => void;
  isRegistered: boolean;
}

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  token: null,
  isLoading: true, // ← default true so splash waits
  setAuth: () => {},
  setDoctor: () => {},
  logout: () => {},
  isRegistered: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [doctor, setDoctorState] = useState<DoctorProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // ← NEW

  // ── Restore session on app launch ──────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedDoctor = await AsyncStorage.getItem('auth_doctor');
        console.log('=== RESTORE SESSION ===');
        console.log('Token found:', !!storedToken);
        console.log('Doctor found:', !!storedDoctor);
        if (storedToken && storedDoctor) {
          setTokenState(storedToken);
          setDoctorState(JSON.parse(storedDoctor));
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const setAuth = async (newDoctor: DoctorProfile, newToken: string) => {
    setDoctorState(newDoctor);
    setTokenState(newToken);
    // Persist to storage
    await AsyncStorage.setItem('auth_token', newToken);
    await AsyncStorage.setItem('auth_doctor', JSON.stringify(newDoctor));
  };

  const setDoctor = async (d: DoctorProfile | null) => {
    setDoctorState(d);
    if (d) {
      await AsyncStorage.setItem('auth_doctor', JSON.stringify(d));
    } else {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_doctor');
    }
  };

  const logout = async () => {
    try {
      setDoctorState(null);
      setTokenState(null);
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_doctor');
      console.log('Logout success — storage cleared');
    } catch (e) {
      console.warn('Logout failed:', e);
      // Force clear state even if storage fails
      setDoctorState(null);
      setTokenState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        token,
        isLoading,
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
