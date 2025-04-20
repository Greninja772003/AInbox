import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Send,
  Bold,
  Italic,
  List,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePollinationsText } from "@pollinations/react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import DOMPurify from "dompurify";

const EmailSummaryAndReply = ({ email }) => {
  const navigate = useNavigate();
  const [showFullBody, setShowFullBody] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const textareaRef = useRef(null);
  const [displayMode, setDisplayMode] = useState("formatted"); // "formatted" or "plain"

  // Format email content for proper display
  const formatEmailContent = (content) => {
    if (!content) return "No content available.";

    // Check if content appears to be HTML (has HTML tags)
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

    if (hasHtmlTags) {
      // Content is HTML, sanitize it
      return DOMPurify.sanitize(content);
    } else {
      // Content is plain text, convert to HTML with proper spacing
      // Replace newlines with <br> tags
      const withLineBreaks = content.replace(/\n/g, "<br>");

      // Auto-linkify URLs
      const withLinks = withLineBreaks.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // Detect quoted text (lines starting with >)
      const withQuotes = withLinks.replace(
        /^(&gt;|>)(.+)$/gm,
        '<div class="pl-2 border-l-2 border-gray-300 text-gray-600">$2</div>'
      );

      return withQuotes;
    }
  };

  // Process the body content for display
  const processedBody = formatEmailContent(email.body);

  // Create a shorter version for the truncated view
  const createTruncatedBody = () => {
    // First remove HTML tags to get plain text for length calculation
    const plainText = processedBody.replace(/<[^>]*>/g, "");

    if (plainText.length <= 250) return processedBody;

    // For HTML content, we need to be careful about truncation
    // This is a simple approach - for complex HTML you'd need a more sophisticated parser
    const truncatedText = plainText.substring(0, 250) + "...";
    return formatEmailContent(truncatedText);
  };

  const truncatedBody = createTruncatedBody();

  // 🧠 Call Pollinations API correctly (like HaikuComponent)
  const priorityText = usePollinationsText(
    `Rate the urgency of the following email on a scale of 0 (low priority) to 100 (high priority). Respond with only the number:\n\n"${email.body}"`,
    {
      seed: 42,
      model: "mistral",
      systemPrompt:
        "You are a helpful assistant that gives only numeric priority scores.",
    }
  );

  const parsedScore = parseInt(priorityText, 10);
  const priorityScore = isNaN(parsedScore) ? 0 : Math.min(parsedScore, 100);

  const handleReply = () => {
    setIsReplying(true);
    // Populate with suggested reply if available
    if (email.reply) {
      setReplyContent(email.reply);
    }
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };

  const formatReplyBody = (content) => {
    const formattedDate = new Date().toLocaleString();
    const quoteOriginal = email.body
      ? `<br><br>
      <div style="padding-left: 10px; margin-top: 20px; margin-bottom: 20px; border-left: 2px solid #ccc; color: #555;">
        <p><b>On ${email.date}, ${email.from} wrote:</b></p>
        <blockquote>${email.body}</blockquote>
      </div>`
      : "";

    return `<p>${content}</p>${quoteOriginal}`;
  };

  const toggleDisplayMode = () => {
    setDisplayMode(displayMode === "formatted" ? "plain" : "formatted");
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    try {
      setSendingReply(true);

      await axios.post(
        "http://localhost:5000/api/email/send",
        {
          to: email.from,
          subject: `Re: ${email.subject}`,
          body: formatReplyBody(replyContent),
          inReplyTo: email.id,
        },
        { withCredentials: true }
      );

      toast.success("Reply sent successfully!");
      setIsReplying(false);
      setReplyContent("");

      // Navigate back to inbox after a short delay
      setTimeout(() => {
        navigate("/inbox");
      }, 1500);
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  const insertTextFormat = (format) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = replyContent.substring(start, end);
    let formattedText = "";

    switch (format) {
      case "bold":
        formattedText = `<strong>${selectedText || "bold text"}</strong>`;
        break;
      case "italic":
        formattedText = `<em>${selectedText || "italic text"}</em>`;
        break;
      case "list":
        formattedText = `\n<ul>\n  <li>${
          selectedText || "List item"
        }</li>\n  <li>Another item</li>\n</ul>`;
        break;
      default:
        return;
    }

    const newText =
      replyContent.substring(0, start) +
      formattedText +
      replyContent.substring(end);
    setReplyContent(newText);

    // Set focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formattedText.length,
        start + formattedText.length
      );
    }, 0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 pb-10">
      {/* Back Button */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inbox
        </Button>
      </div>

      {/* Email Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {email.subject}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>From:</strong> {email.from}
          </p>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDisplayMode}
                className="text-xs"
              >
                {displayMode === "formatted"
                  ? "View Plain Text"
                  : "View Formatted"}
              </Button>
            </div>
            <div className="text-sm bg-gray-50 border border-gray-200 p-4 rounded-md relative break-words">
              {displayMode === "formatted" ? (
                <div
                  className="email-content"
                  dangerouslySetInnerHTML={{
                    __html: showFullBody ? processedBody : truncatedBody,
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans">
                  {email.body || "No content available."}
                </pre>
              )}

              {email.body?.length > 250 && (
                <div className="text-right mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullBody((prev) => !prev)}
                    className="text-blue-600 hover:underline"
                  >
                    {showFullBody ? (
                      <>
                        Show less <ChevronUp className="ml-1 w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="ml-1 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Reply Button */}
          {!isReplying && (
            <div className="mt-4">
              <Button onClick={handleReply} className="w-full sm:w-auto">
                Reply to this email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Form */}
      {isReplying && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-md font-medium">Compose Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 border-b pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertTextFormat("bold")}
              >
                <Bold size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertTextFormat("italic")}
              >
                <Italic size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertTextFormat("list")}
              >
                <List size={16} />
              </Button>
            </div>

            <Textarea
              ref={textareaRef}
              placeholder="Type your reply here..."
              className="min-h-[150px]"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />

            {/* Preview Panel */}
            {replyContent && (
              <div className="border rounded-md p-3">
                <div className="text-sm text-gray-500 mb-1">Preview:</div>
                <div
                  className="text-sm prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: replyContent }}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelReply}
                disabled={sendingReply}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="flex items-center gap-2"
              >
                {sendingReply ? "Sending..." : "Send Reply"}
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium">📌 AI Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-800">
            {email.summary || "No summary available."}
          </p>
        </CardContent>
      </Card>

      {/* Suggested Reply */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium">
            💬 Suggested Reply
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-800">
            {email.reply || "No reply suggestion available."}
          </p>
          {email.reply && !isReplying && (
            <Button variant="outline" className="mt-2" onClick={handleReply}>
              Use this reply
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Priority Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium flex items-center gap-2">
            📊 Priority Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-in-out ${
                priorityScore < 40
                  ? "bg-green-400"
                  : priorityScore < 70
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${priorityScore}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Low Priority (0)</span>
            <span>High Priority (100)</span>
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">
            Score: {priorityText ? `${priorityScore}%` : "Analyzing..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSummaryAndReply;
