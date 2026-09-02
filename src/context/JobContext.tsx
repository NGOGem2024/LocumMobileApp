import React, { createContext, useContext, useState, ReactNode } from 'react';

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