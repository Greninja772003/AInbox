import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

const Inbox = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmailId, setLoadingEmailId] = useState(null);
  const [error, setError] = useState("");
  const [visitedEmails, setVisitedEmails] = useState(() => {
    // Load visited emails from localStorage
    const saved = localStorage.getItem("visitedEmails");
    return saved ? JSON.parse(saved) : [];
  });

  const navigate = useNavigate();

  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/api/emails");
        setEmails(res.data);
        setError("");
      } catch (err) {
        console.error("Error fetching emails:", err);
        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(
            `Failed to load emails: ${err.response?.data?.error || err.message}`
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  // Check if an email has been visited
  const isVisited = (emailId) => {
    return visitedEmails.includes(emailId);
  };

  const handleRetry = () => {
    setError("");
    setLoading(true);
    axios
      .get("http://localhost:5000/api/emails")
      .then((res) => setEmails(res.data))
      .catch((err) => {
        console.error("Retry error:", err);
        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(
            `Failed to load emails: ${err.response?.data?.error || err.message}`
          );
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleNavigateToDetails = (emailId) => {
    setLoadingEmailId(emailId);

    // Mark the email as visited
    if (!isVisited(emailId)) {
      const updatedVisitedEmails = [...visitedEmails, emailId];
      setVisitedEmails(updatedVisitedEmails);
      // Save to localStorage
      localStorage.setItem(
        "visitedEmails",
        JSON.stringify(updatedVisitedEmails)
      );
    }

    navigate(`/inbox/${emailId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Inbox</h1>

      {error && (
        <div className="mb-4 text-red-500">
          <p>{error}</p>
          <Button onClick={handleRetry} className="mt-2">
            Retry
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
          {emails.map((email) => (
            <li
              key={email.id}
              className={`border p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                isVisited(email.id)
                  ? "bg-gray-50"
                  : "border-l-4 border-l-blue-500"
              }`}
              onClick={() => handleNavigateToDetails(email.id)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {!isVisited(email.id) && (
                    <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mr-1" />
                  )}
                  <h3 className="text-sm font-medium">{email.subject}</h3>
                </div>
                <div className="flex items-center">
                  {!isVisited(email.id) && (
                    <Badge
                      variant="outline"
                      className="mr-1 text-xs py-0 bg-blue-50 text-blue-700 border-blue-300"
                    >
                      New
                    </Badge>
                  )}
                  {loadingEmailId === email.id && (
                    <span className="text-xs text-blue-500">Loading...</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>From: {email.from.split("<")[0]}</span>
                <span className="text-gray-400">
                  {email.date
                    ? format(new Date(email.date), "d MMM, h:mm a")
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Inbox;
