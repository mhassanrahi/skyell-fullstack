import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import apiService from "../services/api";
import { URLFormData } from "../types";
import { ERROR_MESSAGES } from "../constants";

// Validation schema
const schema = yup.object({
  url: yup
    .string()
    .required(ERROR_MESSAGES.URL_REQUIRED)
    .test("valid-url", ERROR_MESSAGES.INVALID_URL, function (value) {
      if (!value) return false;

      // Clean the URL by adding protocol if missing
      let testUrl = value.trim();
      if (!testUrl.match(/^https?:\/\//)) {
        testUrl = `https://${testUrl}`;
      }

      // Use URL constructor for robust validation
      try {
        const url = new URL(testUrl);

        // Additional checks for valid hostname
        const hostname = url.hostname;

        // Must have at least one dot for domain.tld format
        if (!hostname.includes(".")) {
          return false;
        }

        // Must end with a valid TLD (at least 2 characters)
        const tldMatch = hostname.match(/\.([a-z]{2,})$/i);
        if (!tldMatch) {
          return false;
        }

        // Must not be just numbers or invalid characters
        const domainParts = hostname.split(".");
        if (domainParts.some((part) => part.length === 0)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    }),
});

interface URLFormProps {
  className?: string;
}

const URLForm: React.FC<URLFormProps> = ({ className = "" }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<URLFormData>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const addURLMutation = useMutation({
    mutationFn: (data: URLFormData) => apiService.addURL(data),
    onSuccess: () => {
      // Invalidate and refetch URLs
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      reset();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    },
    onError: (error: any) => {
      console.error("Failed to add URL:", error.message);
    },
  });

  const onSubmit = (data: URLFormData) => {
    // Automatically prepend https:// if no protocol is provided
    let { url } = data;
    if (!url.match(/^https?:\/\//)) {
      url = `https://${url}`;
    }

    addURLMutation.mutate({ url });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New URL</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Website URL
          </label>
          <div className="relative">
            <input
              type="text"
              id="url"
              placeholder="Enter website URL (e.g., www.google.com or https://example.com)"
              {...register("url")}
              className={`
                w-full px-4 py-3 border rounded-md shadow-sm transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${
                  errors.url
                    ? "border-red-300 bg-red-50 text-red-900 placeholder-red-400"
                    : "border-gray-300 bg-white"
                }
              `}
            />
            {errors.url && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            )}
          </div>
          {errors.url && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {errors.url.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isValid || addURLMutation.isPending}
            className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium
              transition-all duration-200 shadow-sm
              ${
                isValid && !addURLMutation.isPending
                  ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {addURLMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add URL
              </>
            )}
          </button>

          {isSuccess && (
            <div className="inline-flex items-center gap-2 text-green-600 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                URL added successfully!
              </span>
            </div>
          )}
        </div>

        {addURLMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                {addURLMutation.error instanceof Error
                  ? addURLMutation.error.message
                  : "Failed to add URL. Please try again."}
              </p>
            </div>
          </div>
        )}
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          What happens next?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your URL will be queued for crawling</li>
          <li>• We'll analyze the page structure and content</li>
          <li>• Results will appear in the table below once complete</li>
        </ul>
      </div>
    </div>
  );
};

export default URLForm;
