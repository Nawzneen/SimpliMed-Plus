/*global chrome*/
import React from "react";
import "./aiagent.css";
// import icon
import { ArrowUpRight } from "react-bootstrap-icons";

export default function AiAgent() {
  const textareaRef = React.useRef(null);
  const [initialQuestion, setInitialQuestion] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState([
    {
      sender: "ai",
      message: "Aks a question and i will find relevant keywords for you",
    },
  ]);
  const [isTyping, setIsTyping] = React.useState(false);
  function submitUserQuestion() {
    const newUserChat = {
      sender: "user",
      message: initialQuestion,
    };
    setChatHistory((prevChatHistory) => [...prevChatHistory, newUserChat]);
    setIsTyping(true);
    chrome.runtime.sendMessage(
      {
        action: "requestKeywords",
        initialQuestion,
      },
      function (response) {
        console.log("ai response in front", response.aiResponse);

        // Split suggestedKeywords into an array of lines
        const suggestedKeywordsArray =
          response.aiResponse.suggestedKeywords.split("\n");
        // Create a new chat message for each line
        const newAiChats = suggestedKeywordsArray.map((keyword) => {
          const searchQuery = keyword
            .replace(/^\d+\.\s*"?(.*?)"?$/, "$1")
            .replace(/\s+/g, "+"); // Replace spaces with '+'
          const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${searchQuery}`;
          return {
            sender: "ai",
            message: (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {keyword}
                <ArrowUpRight />
              </a>
            ),
          };
        });

        setIsTyping(false);
        newAiChats.forEach((newChat) => {
          setChatHistory((prevChatHistory) => [...prevChatHistory, newChat]);
        });
      }
    );
    // clear input field
    textareaRef.current.value = "";
    setInitialQuestion("");
  }
  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitUserQuestion();
    }
  }
  return (
    <div className="aiagent aiagent-container mt-1 ">
      {/* Render Chat History  */}
      <div className="chatbox">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`chat-container mt-1 ${
              chat.sender === "ai" ? "ai" : "user"
            }`}
          >
            {chat.sender === "user" ? (
              <>
                <div className="message">{chat.message}</div>
                <div className="avatar"></div>
              </>
            ) : (
              <>
                <div className="avatar"></div>
                <div className="message">{chat.message}</div>
              </>
            )}
          </div>
        ))}
        {isTyping && (
          <>
            <div className="chat-container mt-1 isTyping">
              <div className="avatar"></div>
              <div className="message ">
                <div class="dot-elastic"></div>
              </div>
            </div>
          </>
        )}
      </div>
      <div class="input-container mt-1">
        <textarea
          onChange={(e) => setInitialQuestion(e.target.value)}
          ref={textareaRef}
          type="text"
          id="user-input"
          placeholder="Type your message here"
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={submitUserQuestion}
          id="send-button"
          className="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}
