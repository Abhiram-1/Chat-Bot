document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  const typingIndicator = document.getElementById("typing-indicator");
  const resetBtn = document.getElementById("reset-btn");
  const imageUploadBtn = document.getElementById("image-upload-btn");
  const imageInput = document.getElementById("image-input");
  const saveBtn = document.getElementById("save-btn");
  const loadBtn = document.getElementById("load-btn");
  const saveModal = new bootstrap.Modal(document.getElementById("saveModal"));
  const loadModal = new bootstrap.Modal(document.getElementById("loadModal"));
  const imagePreviewModal = new bootstrap.Modal(
    document.getElementById("imagePreviewModal")
  );
  const previewImage = document.getElementById("previewImage");
  const imageCaption = document.getElementById("image-caption");
  const sendImageBtn = document.getElementById("send-image-btn");
  const editInfo = document.getElementById("edit-info");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  // Message editing state
  let editingMessageId = null;

  // Get or generate a session ID
  let sessionId = localStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem("chat_session_id", sessionId);
  }

  // Initialize marked for Markdown rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Event Listeners
  chatForm.addEventListener("submit", sendMessage);
  resetBtn.addEventListener("click", resetChat);
  imageUploadBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", handleImageSelect);
  saveBtn.addEventListener("click", showSaveModal);
  loadBtn.addEventListener("click", showLoadModal);
  sendImageBtn.addEventListener("click", sendImageMessage);
  cancelEditBtn.addEventListener("click", cancelEditing);
  document
    .getElementById("save-conversation-btn")
    .addEventListener("click", saveConversation);

  // Focus input on page load
  userInput.focus();

  // Automatically scroll to bottom when page loads
  scrollToBottom();

  /**
   * Send user message to backend and handle response
   */
  function sendMessage(e) {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    // Check if editing a message
    const isEditing = editingMessageId !== null;

    // Prepare message data
    const messageData = {
      message: message,
      session_id: sessionId,
    };

    if (isEditing) {
      messageData.message_id = editingMessageId;
      messageData.is_edited = true;

      // Update the edited message UI
      const messageElement = document.querySelector(
        `.message[data-message-id="${editingMessageId}"]`
      );
      if (messageElement) {
        const messageContent = messageElement.querySelector(".message-content");
        messageContent.innerHTML = `<p>${escapeHTML(message)}</p>`;
        messageContent.classList.add("edited");

        // Add edited indicator if not already present
        if (!messageElement.querySelector(".edited-indicator")) {
          const editedIndicator = document.createElement("span");
          editedIndicator.className = "edited-indicator";
          editedIndicator.textContent = "(edited)";
          messageContent.appendChild(editedIndicator);
        }
      }

      // Remove all subsequent messages from UI
      let nextElement = messageElement.nextElementSibling;
      while (nextElement) {
        const temp = nextElement.nextElementSibling;
        nextElement.remove();
        nextElement = temp;
      }

      // Clear editing state
      exitEditMode();
    } else {
      // Generate a new message ID
      const messageId = generateMessageId();
      messageData.message_id = messageId;

      // Add user message to chat
      addMessageToChat(message, "user", messageId);
    }

    // Clear input
    userInput.value = "";

    // Show typing indicator
    showTypingIndicator();

    // Send message to backend
    fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Hide typing indicator
        hideTypingIndicator();

        // Add bot response to chat
        addMessageToChat(data.response, "bot", data.bot_message_id);
      })
      .catch((error) => {
        console.error("Error:", error);
        hideTypingIndicator();
        addMessageToChat(
          "I'm sorry, I encountered an error processing your request. Please try again.",
          "bot",
          generateMessageId()
        );
      });
  }

  /**
   * Add a message to the chat area
   */
  function addMessageToChat(message, sender, messageId, imageUrl = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    messageDiv.setAttribute("data-message-id", messageId);

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    // If it's a user message with an image
    if (sender === "user" && imageUrl) {
      const imageContainer = document.createElement("div");
      imageContainer.className = "image-container";

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Uploaded image";
      img.className = "uploaded-image";
      img.addEventListener("click", () => {
        previewImage.src = imageUrl;
        imagePreviewModal.show();
      });

      imageContainer.appendChild(img);
      messageContent.appendChild(imageContainer);

      if (message && message !== "Analyze this image") {
        messageContent.innerHTML += `<p>${escapeHTML(message)}</p>`;
      }
    } else {
      // Use marked to render markdown for bot messages
      if (sender === "bot") {
        messageContent.innerHTML = marked.parse(message);
      } else {
        messageContent.innerHTML = `<p>${escapeHTML(message)}</p>`;

        // Add message actions for user messages
        const messageActions = document.createElement("div");
        messageActions.className = "message-actions";

        const editButton = document.createElement("button");
        editButton.className = "action-btn edit-btn";
        editButton.innerHTML = '<i class="fas fa-pen"></i>';
        editButton.title = "Edit message";
        editButton.addEventListener("click", () =>
          editMessage(messageId, message)
        );

        messageActions.appendChild(editButton);
        messageDiv.appendChild(messageActions);
      }
    }

    messageDiv.appendChild(messageContent);

    // Add to chat container
    const container = chatMessages.querySelector(".container");
    container.appendChild(messageDiv);

    // Scroll to bottom
    scrollToBottom();
  }

  /**
   * Handle image selection for upload
   */
  function handleImageSelect(e) {
    if (!imageInput.files.length) return;

    const file = imageInput.files[0];

    // Validate file type
    if (!file.type.match("image.*")) {
      alert("Please select an image file.");
      return;
    }

    // Preview the image
    const reader = new FileReader();
    reader.onload = function (event) {
      previewImage.src = event.target.result;
      imageCaption.value = "";
      imagePreviewModal.show();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Send message with image to the server
   */
  function sendImageMessage() {
    if (!imageInput.files.length) return;

    const file = imageInput.files[0];
    const caption = imageCaption.value.trim() || "Analyze this image";

    // Create FormData
    const formData = new FormData();
    formData.append("image", file);
    formData.append("message", caption);
    formData.append("session_id", sessionId);
    formData.append("message_id", generateMessageId());

    // Hide modal
    imagePreviewModal.hide();

    // Show loading indicator
    showTypingIndicator();

    // Send to server
    fetch("/chat-with-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        hideTypingIndicator();

        // Add the image message to chat
        addMessageToChat(caption, "user", data.user_message_id, data.image_url);

        // Add bot response
        addMessageToChat(data.response, "bot", data.bot_message_id);

        // Clear the file input
        imageInput.value = "";
      })
      .catch((error) => {
        console.error("Error:", error);
        hideTypingIndicator();
        alert("Error uploading image. Please try again.");

        // Clear the file input
        imageInput.value = "";
      });
  }

  /**
   * Edit a message
   */
  function editMessage(messageId, messageText) {
    // Set editing state
    editingMessageId = messageId;
    userInput.value = messageText;
    userInput.focus();

    // Show editing info
    editInfo.style.display = "block";

    // Highlight the message being edited
    const messageElement = document.querySelector(
      `.message[data-message-id="${messageId}"]`
    );
    if (messageElement) {
      messageElement.classList.add("editing");
    }
  }

  /**
   * Cancel message editing
   */
  function cancelEditing() {
    exitEditMode();
  }

  /**
   * Exit edit mode and clean up
   */
  function exitEditMode() {
    // Clear editing state
    editingMessageId = null;
    userInput.value = "";

    // Hide editing info
    editInfo.style.display = "none";

    // Remove highlighting from any edited message
    const editingElement = document.querySelector(".message.editing");
    if (editingElement) {
      editingElement.classList.remove("editing");
    }
  }

  /**
   * Show the save conversation modal
   */
  function showSaveModal() {
    document.getElementById(
      "conversation-title"
    ).value = `Conversation ${new Date().toLocaleDateString()}`;
    saveModal.show();
  }

  /**
   * Save the current conversation
   */
  function saveConversation() {
    const title =
      document.getElementById("conversation-title").value.trim() ||
      `Conversation ${new Date().toLocaleDateString()}`;

    fetch("/save-conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        title: title,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        saveModal.hide();
        if (data.status === "success") {
          alert("Conversation saved successfully!");
        } else {
          alert("Error: " + data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        saveModal.hide();
        alert("Error saving conversation. Please try again.");
      });
  }

  /**
   * Show the load conversation modal and populate with saved conversations
   */
  function showLoadModal() {
    const conversationsList = document.getElementById("conversations-list");
    conversationsList.innerHTML =
      '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading conversations...</p></div>';

    fetch("/get-conversations")
      .then((response) => response.json())
      .then((data) => {
        if (data.conversations && data.conversations.length > 0) {
          conversationsList.innerHTML = "";

          data.conversations.forEach((conv) => {
            const date = new Date(conv.date).toLocaleString();
            const item = document.createElement("a");
            item.href = "#";
            item.className = "list-group-item list-group-item-action";
            item.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">${escapeHTML(conv.title)}</h5>
                            <small>${date}</small>
                        </div>
                        <small>Click to load this conversation</small>
                    `;

            item.addEventListener("click", (e) => {
              e.preventDefault();
              loadConversation(conv.filename);
            });

            conversationsList.appendChild(item);
          });
        } else {
          conversationsList.innerHTML = `
                    <div class="text-center py-3 no-conversations-msg">
                        <i class="fas fa-comment-slash fs-3 mb-3"></i>
                        <p>No saved conversations found</p>
                    </div>
                `;
        }

        loadModal.show();
      })
      .catch((error) => {
        console.error("Error:", error);
        conversationsList.innerHTML = `
                <div class="text-center py-3 error-msg">
                    <i class="fas fa-exclamation-circle fs-3 mb-3"></i>
                    <p>Error loading conversations</p>
                </div>
            `;
        loadModal.show();
      });
  }

  /**
   * Load a saved conversation
   */
  function loadConversation(filename) {
    fetch(`/load-conversation/${filename}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          // Update session ID
          sessionId = data.session_id;
          localStorage.setItem("chat_session_id", sessionId);

          // Clear current chat
          const container = chatMessages.querySelector(".container");
          container.innerHTML = "";

          // Load messages
          data.messages.forEach((msg) => {
            if (msg.role === "user") {
              if (msg.has_image) {
                // Handle messages with images
                addMessageToChat(
                  msg.parts[0],
                  "user",
                  msg.message_id,
                  msg.image_path
                );
              } else {
                addMessageToChat(msg.parts[0], "user", msg.message_id);
              }
            } else if (msg.role === "model") {
              addMessageToChat(msg.parts[0], "bot", msg.message_id);
            }
          });

          // Close modal
          loadModal.hide();

          // Scroll to bottom
          scrollToBottom();
        } else {
          alert("Error: " + data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error loading conversation. Please try again.");
      });
  }

  /**
   * Reset the chat
   */
  function resetChat() {
    // Show confirmation before resetting
    if (
      confirm(
        "Are you sure you want to start a new chat? This will clear your conversation history."
      )
    ) {
      // Reset UI
      const container = chatMessages.querySelector(".container");
      container.innerHTML = `
            <div class="message bot-message" data-message-id="welcome">
                <div class="message-content">
                    <p>Hello! I'm your Gemini-powered AI assistant. How can I help you today?</p>
                </div>
            </div>
        `;

      // Reset session on server
      fetch("/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Chat reset:", data);
          // Generate new session ID
          sessionId = generateSessionId();
          localStorage.setItem("chat_session_id", sessionId);

          // Exit edit mode if active
          if (editingMessageId) {
            exitEditMode();
          }
        })
        .catch((error) => {
          console.error("Error resetting chat:", error);
        });
    }
  }

  /**
   * Show the typing indicator
   */
  function showTypingIndicator() {
    typingIndicator.style.display = "block";
  }

  /**
   * Hide the typing indicator
   */
  function hideTypingIndicator() {
    typingIndicator.style.display = "none";
  }

  /**
   * Scroll to the bottom of the chat
   */
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Generate a random session ID
   */
  function generateSessionId() {
    return "session_" + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate a message ID
   */
  function generateMessageId() {
    return "msg_" + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
