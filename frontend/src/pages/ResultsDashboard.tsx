import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronUp,
  ChevronDown,
  BarChart3,
  ExternalLink,
  Shield,
  Clock,
  Eye,
  Filter,
  RotateCcw,
} from "lucide-react";
import apiService from "../services/api";
import { CrawlResult, ResultsFilter, PaginatedResponse } from "../types";

interface ResultsDashboardProps {
  className?: string;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  className = "",
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [filters, setFilters] = useState<ResultsFilter>({
    search: "",
    status: "all",
    sortBy: "crawled_at",
    sortOrder: "desc",
  });

  // Fetch results with pagination and filters
  const {
    data: resultsData,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<CrawlResult>>({
    queryKey: ["results", currentPage, pageSize, filters],
    queryFn: () =>
      apiService.getResults(
        currentPage,
        pageSize,
        filters.search,
        filters.status,
        filters.sortBy,
        filters.sortOrder
      ),
    placeholderData: (previousData) => previousData,
  });

  const queryClient = useQueryClient();

  // Bulk re-run analysis mutation
  const bulkRerunMutation = useMutation({
    mutationFn: async (resultIds: number[]) => {
      // Get URL IDs from results and trigger crawl restart
      const urlIds = results
        .filter((result) => resultIds.includes(result.id))
        .map((result) => result.url_id)
        .filter((id): id is number => id !== undefined);

      if (urlIds.length > 0) {
        await apiService.bulkStartCrawl(urlIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      setSelectedResults([]);
    },
  });

  // Smart auto-refresh - faster when crawling might be active
  useEffect(() => {
    const results = resultsData?.data || [];
    // Check if there might be active crawls (results that are recent)
    const recentThreshold = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const hasRecentActivity = results.some(
      (result) => new Date(result.crawled_at).getTime() > recentThreshold
    );

    // Use faster polling when there might be active crawls
    const pollInterval = hasRecentActivity ? 5000 : 15000; // 5s when recent activity, 15s when idle

    const interval = setInterval(() => {
      refetch();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [refetch, resultsData]);

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column as any,
      sortOrder:
        prev.sortBy === column && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const handleFilterChange = (status: "all" | "has_login_form") => {
    setFilters((prev) => ({ ...prev, status }));
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectResult = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedResults([...selectedResults, id]);
    } else {
      setSelectedResults(selectedResults.filter((resultId) => resultId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = results.map((result) => result.id);
      setSelectedResults(allIds);
    } else {
      setSelectedResults([]);
    }
  };

  const handleBulkRerun = () => {
    if (selectedResults.length > 0) {
      if (
        window.confirm(
          `Re-run analysis for ${selectedResults.length} result(s)?`
        )
      ) {
        bulkRerunMutation.mutate(selectedResults);
      }
    }
  };

  // Calculate totals for summary cards
  const totalResults = resultsData?.pagination.total || 0;
  const results = resultsData?.data || [];
  const loginFormsFound = results.filter((r) => r.has_login_form).length;
  const totalLinks = results.reduce(
    (sum, r) => sum + r.internal_links + r.external_links,
    0
  );
  const totalBrokenLinks = results.reduce((sum, r) => sum + r.broken_links, 0);

  // SortIcon component
  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (filters.sortBy !== column) {
      return <div className="w-4 h-4" />; // Placeholder
    }
    return filters.sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Loading state
  if (isLoading && !resultsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            ⚠️ Error Loading Results
          </div>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "Failed to load results"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Crawl Results Dashboard
          </h1>
          {isLoading && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Live updates</span>
            </div>
          )}
        </div>
        <p className="text-gray-600">
          View and analyze results from all completed URL crawls
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Results</p>
              <p className="text-2xl font-bold text-gray-900">{totalResults}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ExternalLink className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Links</p>
              <p className="text-2xl font-bold text-gray-900">{totalLinks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Broken Links</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalBrokenLinks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Login Forms</p>
              <p className="text-2xl font-bold text-gray-900">
                {loginFormsFound}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search URLs or titles..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Filter by status */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange(e.target.value as any)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              >
                <option value="all">All Results</option>
                <option value="has_login_form">Has Login Form</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedResults.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedResults.length} result(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkRerun}
                  disabled={bulkRerunMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-run Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {results.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600">
              {filters.search || filters.status !== "all"
                ? "Try adjusting your search or filters"
                : "Start by adding URLs and crawling them"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          results.length > 0 &&
                          selectedResults.length === results.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("url")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>URL</span>
                        <SortIcon column="url" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Title</span>
                        <SortIcon column="title" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HTML Ver
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("links")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Links (I/E)</span>
                        <SortIcon column="links" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Broken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Form
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("crawled_at")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Crawled At</span>
                        <SortIcon column="crawled_at" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedResults.includes(result.id)}
                          onChange={(e) =>
                            handleSelectResult(result.id, e.target.checked)
                          }
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {result.url}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {result.title || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {result.html_version}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.internal_links}/{result.external_links}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.broken_links > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {result.broken_links}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.has_login_form ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(result.crawled_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/results/${result.id}`)}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {resultsData && resultsData.pagination.total_pages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(
                          resultsData.pagination.total_pages,
                          currentPage + 1
                        )
                      )
                    }
                    disabled={
                      currentPage === resultsData.pagination.total_pages
                    }
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * pageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * pageSize,
                          resultsData.pagination.total
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {resultsData.pagination.total}
                      </span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
                      </button>
                      {/* Page numbers */}
                      {Array.from(
                        {
                          length: Math.min(
                            5,
                            resultsData.pagination.total_pages
                          ),
                        },
                        (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        }
                      )}
                      <button
                        onClick={() =>
                          setCurrentPage(
                            Math.min(
                              resultsData.pagination.total_pages,
                              currentPage + 1
                            )
                          )
                        }
                        disabled={
                          currentPage === resultsData.pagination.total_pages
                        }
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-5 h-5 rotate-90" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsDashboard;
