import { apiClient } from "@/services/api.service";

export interface UserProfileDto {
  id: number;
  name: string;
  email: string;
  contactNumber: string | null;
  country: string | null;
  role: string;
  teamName: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  contactNumber: string;
  country: string;
}

export const userProfileService = {
  async getProfile(): Promise<UserProfileDto> {
    const { data } = await apiClient.get<UserProfileDto>("/users/me");
    return data;
  },

  async updateProfile(request: UpdateProfileRequest): Promise<UserProfileDto> {
    const { data } = await apiClient.patch<UserProfileDto>("/users/me", request);
    return data;
  },
};
