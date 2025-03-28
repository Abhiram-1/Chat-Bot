# 🤖 Gemini Chat Bot

A modern conversational AI bot powered by Google's Gemini language models, featuring image analysis capabilities and an intuitive chat interface.

## ✨ Features

### Core Functionality
- **Contextual Conversations**: Maintains conversation history for coherent interactions
- **Image Analysis**: Upload and analyze images using Gemini's multimodal capabilities
- **Message Editing**: Edit previous messages and regenerate responses
- **Conversation Management**: Save, browse, and load chat histories

### User Experience
- **Modern Interface**: Clean, responsive design with intuitive controls
- **Markdown Support**: Rich text responses with formatting
- **Real-time Feedback**: Typing indicators and loading states
- **Mobile Responsive**: Works seamlessly across devices

## 🧠 Implementation Method

The bot uses **Context-Augmented Generation (CAG)** to provide intelligent responses:

- **Full Context Window**: Utilizes Gemini's extensive context window capabilities
- **Multimodal Processing**: Analyzes both text and images within the same conversation flow
- **Conversation Memory**: Preserves chat history for more coherent responses
- **Session Management**: Maintains separate conversation contexts for different users

## 🛠️ Technology Stack

- **Backend**: Python with Flask
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Google Generative AI (Gemini 1.5 Flash and Pro)
- **Text Formatting**: Marked.js for Markdown rendering
- **UI Framework**: Bootstrap 5

## 📋 Prerequisites

- Python 3.8+
- Google Generative AI API key
- Modern web browser

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gemini-chat-bot.git
   cd gemini-chat-bot
   ```

2. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up your Gemini API key in `app.py`:
   ```python
   api_key = "YOUR_API_KEY_HERE"  # Replace with your actual API key
   ```

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:5002
   ```

## 📁 Project Structure

```
gemini-chat-bot/
│
├── app.py                  # Flask application
├── requirements.txt        # Dependencies
├── static/                 # Static files
│   ├── css/
│   │   └── style.css       # CSS styling
│   └── js/
│       └── script.js       # Frontend logic
├── templates/              # HTML templates
│   └── index.html          # Chat interface
├── uploads/                # Temporary storage for uploaded images
└── conversations/          # Saved conversation history
```

## 🔧 How to Use

### Chat Basics
- Type a message and press Enter or click the send button
- The bot will respond based on the conversation context
- Scroll through conversation history

### Image Analysis
1. Click the image icon in the chat input area
2. Select an image from your device
3. Add an optional caption or question about the image
4. Send the image and wait for the AI to analyze it

### Message Editing
1. Hover over one of your previous messages
2. Click the edit icon that appears
3. Modify your message in the input field
4. Press Enter to update the conversation
5. The bot will regenerate responses based on your edited message

### Saving & Loading Conversations
1. Click "Save Chat" to store the current conversation
2. Enter a descriptive title
3. Click "Load Chat" to browse and restore previous conversations

## 💡 Advanced Usage Examples

The Gemini Bot can handle a variety of tasks:

- **General Knowledge Q&A**: Ask questions on a wide range of topics
- **Image Analysis**: Upload images for description, object identification, or text extraction
- **Creative Writing**: Request stories, poems, or creative content
- **Code Assistance**: Ask for help with coding problems
- **Explanations**: Get concepts explained in simple terms
- **Conversation Continuity**: Reference previous messages or images


