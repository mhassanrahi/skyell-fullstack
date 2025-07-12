import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  Globe,
  Shield,
  AlertTriangle,
  Check,
  X,
  Search,
  Eye,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import apiService from "../services/api";
import { CrawlResult } from "../types";

const ResultDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const resultId = id ? parseInt(id, 10) : 0;
  const [linksPage, setLinksPage] = useState(1);
  const [linksFilter, setLinksFilter] = useState<
    "all" | "internal" | "external" | "broken"
  >("all");
  const [linksSearch, setLinksSearch] = useState("");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Fetch result detail
  const {
    data: result,
    isLoading,
    error,
  } = useQuery<CrawlResult>({
    queryKey: ["result-detail", resultId],
    queryFn: () => apiService.getResultDetail(resultId),
  });

  // Fetch links with pagination
  const {
    data: linksData,
    isLoading: linksLoading,
    error: linksError,
  } = useQuery({
    queryKey: ["result-links", resultId, linksPage, linksFilter, linksSearch],
    queryFn: () =>
      apiService.getResultLinks(
        resultId,
        linksPage,
        50,
        linksFilter === "all" ? undefined : linksFilter,
        linksSearch
      ),
    enabled: !!result,
  });

  // Chart data for link analysis
  const linkChartData = result?.chart_data
    ? [
        {
          name: "Internal Links",
          value: result.chart_data.internal_links,
          color: "#3b82f6",
        },
        {
          name: "External Links",
          value: result.chart_data.external_links,
          color: "#10b981",
        },
        {
          name: "Broken Links",
          value: result.chart_data.broken_links,
          color: "#ef4444",
        },
      ]
    : [];

  // Bar chart data
  const barChartData = result?.chart_data
    ? [
        { name: "Internal", count: result.chart_data.internal_links },
        { name: "External", count: result.chart_data.external_links },
        { name: "Broken", count: result.chart_data.broken_links },
      ]
    : [];

  // Heading counts data
  const headingData = result
    ? [
        { name: "H1", count: result.h1_count },
        { name: "H2", count: result.h2_count },
        { name: "H3", count: result.h3_count },
        { name: "H4", count: result.h4_count },
        { name: "H5", count: result.h5_count },
        { name: "H6", count: result.h6_count },
      ].filter((h) => h.count > 0)
    : [];

  const handleLinksFilterChange = (
    filter: "all" | "internal" | "external" | "broken"
  ) => {
    setLinksFilter(filter);
    setLinksPage(1);
  };

  const handleLinksSearch = (search: string) => {
    setLinksSearch(search);
    setLinksPage(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading result details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            ⚠️ Error Loading Result
          </div>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to load result details"}
          </p>
          <button
            onClick={() => navigate("/results")}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const links = linksData?.links || [];
  const linksPagination = linksData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/results")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Results
          </button>
          <div className="flex items-center gap-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              <ExternalLink className="w-4 h-4" />
              Visit Site
            </a>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {result.title || "Untitled Page"}
        </h1>
        <p className="text-gray-600 break-all">{result.url}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(result.crawled_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            {result.html_version}
          </div>
          {result.has_login_form && (
            <div className="flex items-center gap-1 text-orange-600">
              <Shield className="w-4 h-4" />
              Login Form Detected
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExternalLink className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Links</p>
              <p className="text-2xl font-bold text-gray-900">
                {result.internal_links + result.external_links}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Internal Links
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {result.internal_links}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                External Links
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {result.external_links}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Broken Links</p>
              <p className="text-2xl font-bold text-gray-900">
                {result.broken_links}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Link Analysis Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Link Analysis
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChartType("bar")}
                className={`p-2 rounded-md ${
                  chartType === "bar"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType("pie")}
                className={`p-2 rounded-md ${
                  chartType === "pie"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <PieChart className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              ) : (
                <RechartsPieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={linkChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {linkChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heading Analysis Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Heading Structure
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All Links
          </h3>

          {/* Links Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search links..."
                  value={linksSearch}
                  onChange={(e) => handleLinksSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(["all", "internal", "external", "broken"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => handleLinksFilterChange(filter)}
                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                      linksFilter === filter
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Links List */}
        <div className="overflow-x-auto">
          {linksLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading links...</p>
            </div>
          ) : linksError ? (
            <div className="p-8 text-center text-red-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
              <p>Failed to load links</p>
            </div>
          ) : links.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No links found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anchor Text
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {links.map((link: any) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm text-gray-900 max-w-md truncate"
                        title={link.url}
                      >
                        {link.url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm text-gray-900 max-w-xs truncate"
                        title={link.anchor_text}
                      >
                        {link.anchor_text || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          link.type === "internal"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {link.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {link.is_broken ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <X className="w-3 h-3 mr-1" />
                          {link.status_code || "Broken"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Visit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Links Pagination */}
        {linksPagination && linksPagination.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {(linksPage - 1) * 50 + 1} to{" "}
                {Math.min(linksPage * 50, linksPagination.total)} of{" "}
                {linksPagination.total} links
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLinksPage(Math.max(1, linksPage - 1))}
                  disabled={linksPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setLinksPage(
                      Math.min(linksPagination.total_pages, linksPage + 1)
                    )
                  }
                  disabled={linksPage === linksPagination.total_pages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDetail;
