import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to get user-friendly error message
export const getErrorMessage = (error: unknown): { title: string; description: string } => {
    // Handle axios errors with response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string };
        };
      };
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;
      
      // Handle specific HTTP status codes
      switch (status) {
        case 409: // Conflict - duplicate URL
          return {
            title: "Job Already Exists",
            description: "A job with this URL has already been added to the system. Please check the existing jobs or use a different URL."
          };
        case 400: // Bad Request
          return {
            title: "Invalid Data",
            description: responseData?.message || "Please check your input and ensure all fields are filled correctly."
          };
        case 500: // Internal Server Error
          return {
            title: "Server Error",
            description: "An internal server error occurred. Please try again later."
          };
        case 404: // Not Found
          return {
            title: "Service Not Found",
            description: "The job service is currently unavailable. Please try again later."
          };
        default:
          // Use server message if available
          if (responseData?.message) {
            return {
              title: "Error Adding Job",
              description: responseData.message
            };
          }
      }
    }
    
    // Handle regular Error objects
    if (error instanceof Error) {
      const message = error.message;
      
      // Handle network errors
      if (message.includes("Network Error") || message.includes("fetch")) {
        return {
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection and try again."
        };
      }
      
      // Handle timeout errors
      if (message.includes("timeout")) {
        return {
          title: "Request Timeout",
          description: "The request took too long to complete. Please try again."
        };
      }
      
      // Default error with original message
      return {
        title: "Error Adding Job",
        description: message
      };
    }
    
    // Unknown error
    return {
      title: "Unknown Error",
      description: "An unexpected error occurred. Please try again."
    };
  };
