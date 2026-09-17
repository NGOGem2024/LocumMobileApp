import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '../services/axiosConfig';
import { useAuth } from './AuthContext';

export type Job = {
  id: string;
  hospital: string;
  location: string;
  date: string;
  specialization: string;
  pay: string;
  payType: string;
  urgency: string;
  distance: string;
  pincode?: string;
  department?: string;
  status?: string;
  rawDetails?: any; // Ensure rawDetails is supported in the context
};

type JobContextType = {
  savedJobs: Job[];
  appliedJobs: Job[];
  saveJob: (job: Job) => void;
  unsaveJob: (jobId: string) => void;
  applyJob: (job: Job) => void;
  isJobSaved: (jobId: string) => boolean;
  isJobApplied: (jobId: string) => boolean;
};

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  
  const { token } = useAuth(); // Pull the token to ensure the user is logged in

  // Fetch initial saved and applied jobs when the app loads or user logs in
  useEffect(() => {
    const fetchInitialUserJobs = async () => {
      if (!token) return; // Prevent fetching if unauthenticated

      try {
        const [savedRes, appliedRes] = await Promise.all([
          api.get('/api/doctors/saved-jobs'),
          api.get('/api/doctors/applied-jobs')
        ]);

        if (savedRes.data?.success && savedRes.data.jobs) {
          const mappedSaved = savedRes.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name || reqItem.hospital_details?.hospital_name || '',
            location: `${reqItem.city}, ${reqItem.state}`,
            date: new Date(reqItem.shift_start_date).toLocaleDateString(),
            specialization: reqItem.speciality,
            pay: `₹${reqItem.offered_rate}`,
            payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
            urgency: reqItem.vacancy_status === 'Urgent' ? 'urgent' : 'normal',
            distance: 'N/A',
            rawDetails: reqItem, 
          }));
          setSavedJobs(mappedSaved);
        }

        if (appliedRes.data?.success && appliedRes.data.jobs) {
          const mappedApplied = appliedRes.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name || reqItem.hospital_details?.hospital_name || '',
            location: `${reqItem.city}, ${reqItem.state}`,
            date: new Date(reqItem.shift_start_date).toLocaleDateString(),
            specialization: reqItem.speciality,
            pay: `₹${reqItem.offered_rate}`,
            payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
            urgency: reqItem.vacancy_status === 'Urgent' ? 'urgent' : 'normal',
            distance: 'N/A',
            rawDetails: reqItem, 
          }));
          setAppliedJobs(mappedApplied);
        }
      } catch (error) {
        console.error("Error fetching initial user jobs for Context:", error);
      }
    };

    fetchInitialUserJobs();
  }, [token]);

  const saveJob = (job: Job) => {
    setSavedJobs(prev => (prev.some(j => j.id === job.id) ? prev : [...prev, job]));
  };

  const unsaveJob = (jobId: string) => {
    setSavedJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const applyJob = (job: Job) => {
    setAppliedJobs(prev => (prev.some(j => j.id === job.id) ? prev : [...prev, job]));
  };

  const isJobSaved = (jobId: string) => savedJobs.some(j => j.id === jobId);
  const isJobApplied = (jobId: string) => appliedJobs.some(j => j.id === jobId);

  return (
    <JobContext.Provider
      value={{ savedJobs, appliedJobs, saveJob, unsaveJob, applyJob, isJobSaved, isJobApplied }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) throw new Error('useJobs must be used within a JobProvider'); 
  return context;
}; 