import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProps } from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

const DashboardView = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeInsightTab, setActiveInsightTab] = useState("priority");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingEmailId, setLoadingEmailId] = useState(null);

  // Color palettes for charts
  const PRIORITY_COLORS = {
    high: "#ef4444", // Red
    medium: "#f59e0b", // Amber
    low: "#10b981", // Green
    urgent: "#7c3aed", // Purple
    important: "#3b82f6", // Blue
  };

  const SENTIMENT_COLORS = {
    positive: "#10b981", // Green
    neutral: "#9ca3af", // Gray
    negative: "#ef4444", // Red
  };

  const LABEL_COLORS = {
    work: "#3b82f6", // Blue
    personal: "#ec4899", // Pink
    meeting: "#8b5cf6", // Purple
    transaction: "#f59e0b", // Amber
    otp: "#a3e635", // Lime
    other: "#9ca3af", // Gray
    support: "#06b6d4", // Cyan
    marketing: "#f97316", // Orange
  };

  const INTENT_COLORS = {
    inform: "#3b82f6", // Blue
    request: "#8b5cf6", // Purple
    confirm: "#10b981", // Green
    escalate: "#ef4444", // Red
    notify: "#f59e0b", // Amber
  };

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
        setError(
          "Failed to load emails: " + (err.response?.data?.error || err.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  const priorityOptions = ["high", "medium", "low", "urgent", "important"];

  // First apply search filter, then category filter if selected
  const searchFilteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;

    const subject = email.subject?.toLowerCase() || "";
    const sender = email.from?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    return subject.includes(query) || sender.includes(query);
  });

  const filteredEmails = selectedCategory
    ? searchFilteredEmails.filter(
        (e) =>
          e.classification?.priority?.toLowerCase() ===
            selectedCategory.toLowerCase() ||
          e.classification?.label?.toLowerCase() ===
            selectedCategory.toLowerCase()
      )
    : searchFilteredEmails;

  const generateSummaryCounts = () => {
    const priorityMap = {};
    const sentimentMap = {};
    const labelMap = {};
    const intentMap = {};

    emails.forEach((e) => {
      const { priority, sentiment, label, intent } = e.classification || {};

      if (priority) {
        priorityMap[priority] = (priorityMap[priority] || 0) + 1;
      }
      if (sentiment) {
        sentimentMap[sentiment] = (sentimentMap[sentiment] || 0) + 1;
      }
      if (label) {
        labelMap[label] = (labelMap[label] || 0) + 1;
      }
      if (intent) {
        intentMap[intent] = (intentMap[intent] || 0) + 1;
      }
    });

    return { priorityMap, sentimentMap, labelMap, intentMap };
  };

  const { priorityMap, sentimentMap, labelMap, intentMap } =
    generateSummaryCounts();

  // Convert maps to arrays for charts
  const createChartData = (dataMap) => {
    return Object.entries(dataMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value as number,
    }));
  };

  const priorityData = createChartData(priorityMap);
  const sentimentData = createChartData(sentimentMap);
  const labelData = createChartData(labelMap);
  const intentData = createChartData(intentMap);

  // Custom tooltip component for charts
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 shadow-md border rounded-md">
          <p className="text-sm font-semibold">{`${payload[0].name}: ${payload[0].value}`}</p>
          <p className="text-xs text-gray-500">{`${Math.round(
            ((payload[0].value as number) / emails.length) * 100
          )}% of emails`}</p>
        </div>
      );
    }
    return null;
  };

  const handleNavigateToEmailDetails = (email) => {
    setLoadingEmailId(email.id);
    navigate(`/inbox/${email.id}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <img src="/logo.png" alt="AInbox Logo" className="w-10 h-10 mr-3" />
        AInbox Dashboard
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search by subject or sender..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {priorityOptions.map((p) => (
          <Button
            key={p}
            variant={selectedCategory === p ? "default" : "outline"}
            onClick={() => setSelectedCategory(p === selectedCategory ? "" : p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="mb-6">
            <CardHeader>
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : filteredEmails.length > 0 ? (
        selectedCategory || searchQuery ? (
          filteredEmails.map((email, index) => (
            <Card
              key={index}
              className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNavigateToEmailDetails(email)}
            >
              <CardHeader>
                <CardTitle className="text-md">{email.subject}</CardTitle>
                <CardDescription>From: {email.from}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">
                  Priority: {email.classification?.priority}
                </Badge>
                <Badge variant="outline">
                  Sentiment: {email.classification?.sentiment}
                </Badge>
                <Badge variant="outline">
                  Label: {email.classification?.label}
                </Badge>
                <Badge variant="outline">
                  Intent: {email.classification?.intent}
                </Badge>
                {loadingEmailId === email.id && (
                  <span className="text-xs text-blue-500 ml-auto">
                    Loading...
                  </span>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Email Summary Insights</CardTitle>
              <CardDescription>
                Interactive overview of AI classifications
              </CardDescription>
            </CardHeader>
            <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
              <TabsList className="mb-2">
                <TabsTrigger value="priority">Priority</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                <TabsTrigger value="label">Label</TabsTrigger>
                <TabsTrigger value="intent">Intent</TabsTrigger>
              </TabsList>

              <CardContent>
                <TabsContent value="priority" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <h3 className="font-semibold mb-2 text-center">
                        Priority Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={priorityData}
                            nameKey="name"
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {priorityData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  PRIORITY_COLORS[entry.name.toLowerCase()] ||
                                  "#9ca3af"
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Priority Details</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Priority</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priorityData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor:
                                        PRIORITY_COLORS[
                                          item.name.toLowerCase()
                                        ] || "#9ca3af",
                                    }}
                                  ></div>
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{`${Math.round(
                                (item.value / emails.length) * 100
                              )}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sentiment" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <h3 className="font-semibold mb-2 text-center">
                        Sentiment Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={sentimentData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="value" name="Count">
                            {sentimentData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  SENTIMENT_COLORS[entry.name.toLowerCase()] ||
                                  "#9ca3af"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Sentiment Details</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sentimentData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor:
                                        SENTIMENT_COLORS[
                                          item.name.toLowerCase()
                                        ] || "#9ca3af",
                                    }}
                                  ></div>
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{`${Math.round(
                                (item.value / emails.length) * 100
                              )}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="label" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <h3 className="font-semibold mb-2 text-center">
                        Label Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={labelData}
                            nameKey="name"
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {labelData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  LABEL_COLORS[entry.name.toLowerCase()] ||
                                  "#9ca3af"
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Label Details</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {labelData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor:
                                        LABEL_COLORS[item.name.toLowerCase()] ||
                                        "#9ca3af",
                                    }}
                                  ></div>
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{`${Math.round(
                                (item.value / emails.length) * 100
                              )}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="intent" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <h3 className="font-semibold mb-2 text-center">
                        Intent Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={intentData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="value" name="Count">
                            {intentData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  INTENT_COLORS[entry.name.toLowerCase()] ||
                                  "#9ca3af"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Intent Details</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Intent</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {intentData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor:
                                        INTENT_COLORS[
                                          item.name.toLowerCase()
                                        ] || "#9ca3af",
                                    }}
                                  ></div>
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{`${Math.round(
                                (item.value / emails.length) * 100
                              )}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )
      ) : (
        <p className="text-gray-500">
          No emails found matching your search criteria.
        </p>
      )}
    </div>
  );
};

export default DashboardView;
