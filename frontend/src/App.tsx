import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOut, Plus, BarChart3 } from "lucide-react";
import URLManagement from "./pages/URLManagement";
import ResultsDashboard from "./pages/ResultsDashboard";
import ResultDetail from "./pages/ResultDetail";
import LoginForm from "./components/LoginForm";
import apiService from "./services/api";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<"urls" | "results">("urls");
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    setIsAuthenticated(apiService.isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setSelectedResultId(null);
    queryClient.clear(); // Clear all cached data
  };

  const handleViewDetails = (resultId: number) => {
    setSelectedResultId(resultId);
  };

  const handleBackToResults = () => {
    setSelectedResultId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {!isAuthenticated ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Skyell URL Crawler
                </h1>
                <p className="text-gray-600 mt-2">
                  {currentPage === "urls"
                    ? "Add URLs to crawl and analyze their content and structure."
                    : "View and analyze results from all completed URL crawls."}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </header>

            {/* Navigation Tabs */}
            {!selectedResultId && (
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setCurrentPage("urls")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        currentPage === "urls"
                          ? "border-primary-500 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      URL Management
                    </button>
                    <button
                      onClick={() => setCurrentPage("results")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        currentPage === "results"
                          ? "border-primary-500 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Results Dashboard
                    </button>
                  </nav>
                </div>
              </div>
            )}

            {/* Page Content */}
            {selectedResultId ? (
              <ResultDetail
                resultId={selectedResultId}
                onBack={handleBackToResults}
              />
            ) : currentPage === "urls" ? (
              <URLManagement />
            ) : (
              <ResultsDashboard onViewDetails={handleViewDetails} />
            )}
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}

export default App;
