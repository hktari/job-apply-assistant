import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface JobPreferences {
  roles: string[];
  experience: string;
  level: string;
  locations: string[];
  salary: string;
}

export interface ProfileData {
  data: {
    jobPreferences: JobPreferences;
  };
}

export const getProfile = async (): Promise<ProfileData> => {
  const response = await axios.get(`${API_URL}/profile`);
  return response.data;
};

export const updateProfile = async (
  profileData: ProfileData,
): Promise<ProfileData> => {
  const response = await axios.put(`${API_URL}/profile`, profileData);
  return response.data;
};
