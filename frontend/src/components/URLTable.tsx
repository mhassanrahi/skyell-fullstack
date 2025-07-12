import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Square,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import apiService from "../services/api";
import {
  URLEntry,
  CrawlStatus,
  TableFilter,
  PaginatedResponse,
} from "../types";

interface URLTableProps {
  className?: string;
}

const URLTable: React.FC<URLTableProps> = ({ className = "" }) => {
  const [selectedURLs, setSelectedURLs] = useState<number[]>([]);
  const [filters, setFilters] = useState<TableFilter>({
    search: "",
    status: "all",
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch URLs with pagination and filters
  const {
    data: urlsData,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<URLEntry>>({
    queryKey: ["urls", currentPage, pageSize, filters],
    queryFn: () =>
      apiService.getURLs(currentPage, pageSize, filters.search, filters.status),
    placeholderData: (previousData) => previousData,
  });

  // Smart auto-refresh - faster when crawling is active
  useEffect(() => {
    const urls = urlsData?.data || [];
    const hasActiveCrawls = urls.some(
      (url) => url.status === "running" || url.status === "queued"
    );

    // Use faster polling when there are active crawls
    const pollInterval = hasActiveCrawls ? 2000 : 10000; // 2s when active, 10s when idle

    const interval = setInterval(() => {
      refetch();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [refetch, urlsData]);

  // Mutations for crawl operations
  const startCrawlMutation = useMutation({
    mutationFn: (id: number) => apiService.startCrawl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
    },
  });

  const stopCrawlMutation = useMutation({
    mutationFn: (id: number) => apiService.stopCrawl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
    },
  });

  const bulkStartMutation = useMutation({
    mutationFn: (ids: number[]) => apiService.bulkStartCrawl(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      setSelectedURLs([]);
    },
  });

  const bulkStopMutation = useMutation({
    mutationFn: (ids: number[]) => apiService.bulkStopCrawl(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      setSelectedURLs([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteURL(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => apiService.bulkDeleteURLs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      setSelectedURLs([]);
    },
  });

  // Event handlers
  const handleStartCrawl = (id: number) => {
    startCrawlMutation.mutate(id);
  };

  const handleStopCrawl = (id: number) => {
    stopCrawlMutation.mutate(id);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this URL?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkStart = () => {
    if (selectedURLs.length > 0) {
      bulkStartMutation.mutate(selectedURLs);
    }
  };

  const handleBulkStop = () => {
    if (selectedURLs.length > 0) {
      bulkStopMutation.mutate(selectedURLs);
    }
  };

  const handleBulkDelete = () => {
    if (
      selectedURLs.length > 0 &&
      window.confirm(
        `Are you sure you want to delete ${selectedURLs.length} URL(s)?`
      )
    ) {
      bulkDeleteMutation.mutate(selectedURLs);
    }
  };

  const handleSelectURL = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedURLs([...selectedURLs, id]);
    } else {
      setSelectedURLs(selectedURLs.filter((urlId) => urlId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = urlsData?.data.map((url: URLEntry) => url.id) || [];
      setSelectedURLs(allIds);
    } else {
      setSelectedURLs([]);
    }
  };

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column as any,
      sortOrder:
        prev.sortBy === column && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  // Status badge component with enhanced animations
  const StatusBadge: React.FC<{ status: CrawlStatus }> = ({ status }) => {
    const statusConfig = {
      queued: {
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        label: "Queued",
        pulse: true,
      },
      running: {
        icon: Loader2,
        color: "bg-blue-100 text-blue-800 border border-blue-200",
        label: "Running",
        pulse: false,
      },
      completed: {
        icon: CheckCircle,
        color: "bg-green-100 text-green-800 border border-green-200",
        label: "Completed",
        pulse: false,
      },
      error: {
        icon: XCircle,
        color: "bg-red-100 text-red-800 border border-red-200",
        label: "Error",
        pulse: false,
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          config.color
        } ${config.pulse ? "animate-pulse" : ""}`}
      >
        <Icon
          className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`}
        />
        {config.label}
      </span>
    );
  };

  // Sort icon component
  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (filters.sortBy !== column) return null;
    return filters.sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading URLs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">
            Failed to load URLs. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const urls = urlsData?.data || [];
  const pagination = urlsData?.pagination;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Your URLs</h2>
            {isLoading && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search URLs..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as any,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedURLs.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedURLs.length} URL(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkStart}
                  disabled={bulkStartMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Start
                </button>
                <button
                  onClick={handleBulkStop}
                  disabled={bulkStopMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    urls.length > 0 && selectedURLs.length === urls.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("url")}
              >
                <div className="flex items-center gap-1">
                  URL
                  <SortIcon column="url" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon column="status" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-1">
                  Added
                  <SortIcon column="created_at" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {urls.map((url: URLEntry) => (
              <tr key={url.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedURLs.includes(url.id)}
                    onChange={(e) => handleSelectURL(url.id, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div
                    className="text-sm text-gray-900 max-w-xs truncate"
                    title={url.url}
                  >
                    {url.url}
                  </div>
                  {url.error_message && (
                    <div className="text-xs text-red-600 mt-1">
                      {url.error_message}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={url.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(url.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {url.status === "running" ? (
                      <button
                        onClick={() => handleStopCrawl(url.id)}
                        disabled={stopCrawlMutation.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
                        title="Stop crawling"
                      >
                        <Square className="w-3 h-3" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartCrawl(url.id)}
                        disabled={startCrawlMutation.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                        title="Start crawling"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(url.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                      title="Delete URL"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {urls.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            No URLs found. Add your first URL above to get started!
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(
                    Math.min(pagination.total_pages, currentPage + 1)
                  )
                }
                disabled={currentPage === pagination.total_pages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default URLTable;
