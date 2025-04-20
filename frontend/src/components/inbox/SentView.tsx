"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

const SentView = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmailId, setLoadingEmailId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchSentEmails = async () => {
      try {
        setLoading(true);
        console.log("Fetching sent emails...");
        const res = await axios.get("http://localhost:5000/api/emails/sent", {
          // Add timeout to prevent long-hanging requests
          timeout: 15000, // Increased timeout to 15 seconds
          // Add cache-busting parameter when retrying
          params: retryCount > 0 ? { refresh: true } : {},
          // Ensure credentials are sent
          withCredentials: true,
        });

        console.log("Sent emails response:", res.data);
        // Debug email structure
        if (res.data && res.data.length > 0) {
          console.log(
            "First email structure:",
            JSON.stringify(res.data[0], null, 2)
          );
        }

        setEmails(res.data);
        setError("");
      } catch (err) {
        console.error("Error fetching sent emails:", err);

        if (err.code === "ECONNABORTED") {
          setError("Request timed out. Please try again.");
        } else if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
          // Redirect to login page after session expiry
          setTimeout(() => navigate("/"), 2000);
        } else if (err.response?.status === 404) {
          // No sent emails found, but this isn't an error
          setEmails([]);
          setError("");
        } else {
          setError(
            `Failed to load sent emails: ${
              err.response?.data?.error || err.message
            }`
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSentEmails();
  }, [navigate, retryCount]);

  useEffect(() => {
    const refresh = searchParams.get("refresh");
    if (refresh === "true") {
      setRetryCount((prev) => prev + 1);
    }
  }, [searchParams]);

  const handleRetry = () => {
    setError("");
    setLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  const handleNavigateToDetails = (emailId) => {
    console.log(`Navigating to sent email details with ID: ${emailId}`);
    setLoadingEmailId(emailId);
    navigate(`/sent/${emailId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Sent Emails</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-md text-red-700">
          <p>{error}</p>
          <Button
            onClick={handleRetry}
            className="mt-2"
            variant="outline"
            size="sm"
            disabled={loading}
          >
            Try Again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {emails.length > 0 ? (
            emails.map((email) => (
              <li
                key={email.id || `email-${Math.random()}`}
                className="border p-2 rounded-md cursor-pointer hover:bg-gray-50"
                onClick={() => handleNavigateToDetails(email.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium">{email.subject}</h3>
                  </div>
                  <div className="flex items-center">
                    {loadingEmailId === email.id && (
                      <span className="text-xs text-blue-500">Loading...</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>To: {email.to}</span>
                  <span className="text-gray-400">
                    {email.date
                      ? format(new Date(email.date), "d MMM, h:mm a")
                      : ""}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <div className="text-center p-8 border border-gray-100 rounded-md bg-gray-50">
              <p className="text-gray-500 mb-2">No sent emails found.</p>
              <p className="text-sm text-gray-400">
                When you send emails, they'll appear here.
              </p>
            </div>
          )}
        </ul>
      )}
    </div>
  );
};

export default SentView;
