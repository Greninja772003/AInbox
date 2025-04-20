import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, User, Shield, Bell, Mail } from "lucide-react";

const Settings = () => {
  const location = useLocation();
  const [emailFrequency, setEmailFrequency] = useState(50);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    // Check if there's a tab parameter in the URL and set the active tab
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["account", "ai", "notification", "security"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  return (
    <AppShell>
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b mb-4">
            <TabsList className="w-full justify-start bg-transparent border-b-0">
              <TabsTrigger
                value="account"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                <User size={16} className="mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                <Bot size={16} className="mr-2" />
                AI Preferences
              </TabsTrigger>
              <TabsTrigger
                value="notification"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                <Bell size={16} className="mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                <Shield size={16} className="mr-2" />
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your personal information and email preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue="jane.doe@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Job Title</Label>
                    <Input id="role" defaultValue="Product Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" defaultValue="Acme Corp" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">Email Preferences</h3>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="signature"
                      className="flex flex-col space-y-1"
                    >
                      <span>Email Signature</span>
                      <span className="font-normal text-sm text-gray-500">
                        Add a personal signature to your emails
                      </span>
                    </Label>
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Edit Signature
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Configuration</CardTitle>
                <CardDescription>
                  Configure how the AI assistant analyzes and responds to your
                  emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Email Analysis</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-summarize">
                        Automatic Email Summarization
                      </Label>
                      <p className="text-sm text-gray-500">
                        Generate concise summaries of incoming emails
                      </p>
                    </div>
                    <Switch id="auto-summarize" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="extract-action">
                        Extract Action Items
                      </Label>
                      <p className="text-sm text-gray-500">
                        Identify and list required actions from emails
                      </p>
                    </div>
                    <Switch id="extract-action" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-categorize">
                        Automatic Categorization
                      </Label>
                      <p className="text-sm text-gray-500">
                        Apply tags and categories to incoming emails
                      </p>
                    </div>
                    <Switch id="auto-categorize" defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">Response Generation</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="suggest-replies">
                        Suggest Reply Templates
                      </Label>
                      <p className="text-sm text-gray-500">
                        Offer contextual reply templates
                      </p>
                    </div>
                    <Switch id="suggest-replies" defaultChecked />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="formality">Response Tone</Label>
                      <span className="text-sm text-gray-500">Casual</span>
                    </div>
                    <Slider
                      defaultValue={[50]}
                      max={100}
                      step={10}
                      className="w-full"
                      id="formality"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Casual</span>
                      <span>Formal</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">AI Behavior</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="learn-style">Learn from My Style</Label>
                      <p className="text-sm text-gray-500">
                        AI adapts to your communication style over time
                      </p>
                    </div>
                    <Switch id="learn-style" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="data-sharing">
                        Anonymous Data Sharing
                      </Label>
                      <p className="text-sm text-gray-500">
                        Share anonymized data to improve AI capabilities
                      </p>
                    </div>
                    <Switch id="data-sharing" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Email Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="urgent-emails">Urgent Emails</Label>
                      <p className="text-sm text-gray-500">
                        Notify me about high-priority emails
                      </p>
                    </div>
                    <Switch id="urgent-emails" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="vip-sender">VIP Senders</Label>
                      <p className="text-sm text-gray-500">
                        Notify me about emails from important contacts
                      </p>
                    </div>
                    <Switch id="vip-sender" defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">AI Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai-insights">AI Insights</Label>
                      <p className="text-sm text-gray-500">
                        Notify me about AI-generated insights
                      </p>
                    </div>
                    <Switch id="ai-insights" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="follow-reminders">
                        Follow-up Reminders
                      </Label>
                      <p className="text-sm text-gray-500">
                        Remind me to follow up on important emails
                      </p>
                    </div>
                    <Switch id="follow-reminders" defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">Notification Delivery</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Frequency</Label>
                      <p className="text-sm text-gray-500">
                        How often to check for new emails
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Slider
                      defaultValue={[emailFrequency]}
                      max={100}
                      step={25}
                      onValueChange={(val) => setEmailFrequency(val[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Real-time</span>
                      <span>
                        {emailFrequency <= 25
                          ? "Every 5 min"
                          : emailFrequency <= 50
                          ? "Every 15 min"
                          : emailFrequency <= 75
                          ? "Every 30 min"
                          : "Hourly"}
                      </span>
                      <span>Manual</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Save Notifications</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and data privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Account Security</h3>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="flex gap-2">
                      <Input
                        id="password"
                        type="password"
                        value="••••••••••••"
                        disabled
                        className="flex-1"
                      />
                      <Button variant="outline">Change</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">
                        Two-Factor Authentication
                      </Label>
                      <p className="text-sm text-gray-500">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch id="two-factor" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">Privacy</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="data-privacy">Data Privacy</Label>
                      <p className="text-sm text-gray-500">
                        How your email data is stored and processed
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Privacy Policy
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="data-export">Export Your Data</Label>
                      <p className="text-sm text-gray-500">
                        Download a copy of your data
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Settings;
