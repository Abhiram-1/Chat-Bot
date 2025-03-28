import os
import uuid
import base64
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
import google.generativeai as genai

# Initialize Flask app
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['CONVERSATIONS_FOLDER'] = 'conversations'

# Ensure required directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['CONVERSATIONS_FOLDER'], exist_ok=True)

# Configure the Gemini API
api_key = ""  # Replace with your API key
genai.configure(api_key=api_key)

# Store conversation history
conversation_history = {}

@app.route('/')
def index():
    """Render the main chat interface."""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Process user messages and generate responses."""
    data = request.json
    user_message = data.get('message', '')
    session_id = data.get('session_id', 'default')
    message_id = data.get('message_id', str(uuid.uuid4()))
    is_edited = data.get('is_edited', False)
    
    # Initialize conversation for new sessions
    if session_id not in conversation_history:
        conversation_history[session_id] = []
    
    # If message is edited, update existing message
    if is_edited:
        for i, msg in enumerate(conversation_history[session_id]):
            if msg.get('message_id') == message_id and msg.get('role') == 'user':
                conversation_history[session_id][i]['parts'] = [user_message]
                # Remove subsequent messages as they might not be relevant anymore
                conversation_history[session_id] = conversation_history[session_id][:i+1]
                break
    else:
        # Add user message to history with message_id
        conversation_history[session_id].append({
            'role': 'user',
            'parts': [user_message],
            'message_id': message_id,
            'timestamp': datetime.now().isoformat()
        })
    
    try:
        # Create a chat session with history
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        
        # Prepare chat history format for Gemini
        gemini_history = []
        for msg in conversation_history[session_id]:
            gemini_history.append({
                'role': msg['role'],
                'parts': msg['parts']
            })
        
        chat = model.start_chat(history=gemini_history)
        
        # Generate response using the session
        response = chat.send_message(user_message)
        bot_response = response.text
        
        # Add bot response to history with message_id
        bot_message_id = str(uuid.uuid4())
        conversation_history[session_id].append({
            'role': 'model',
            'parts': [bot_response],
            'message_id': bot_message_id,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'response': bot_response,
            'session_id': session_id,
            'user_message_id': message_id,
            'bot_message_id': bot_message_id
        })
    
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({
            'response': "I'm sorry, I encountered an error processing your request. Please try again.",
            'session_id': session_id,
            'error': str(e)
        }), 500

@app.route('/chat-with-image', methods=['POST'])
def chat_with_image():
    """Process user messages with image and generate responses."""
    try:
        # Get session ID and message
        session_id = request.form.get('session_id', 'default')
        user_message = request.form.get('message', 'Analyze this image')
        message_id = request.form.get('message_id', str(uuid.uuid4()))
        
        # Initialize conversation for new sessions
        if session_id not in conversation_history:
            conversation_history[session_id] = []
        
        # Process uploaded image
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
            
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
            
        # Generate unique filename for the image
        image_filename = f"{uuid.uuid4()}.jpg"
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        
        # Save image temporarily
        image_file.save(image_path)
        
        # Read the image file
        with open(image_path, 'rb') as img_file:
            image_data = img_file.read()
        
        # Add user message with image to history
        conversation_history[session_id].append({
            'role': 'user',
            'parts': [user_message],
            'has_image': True,
            'image_path': image_path,
            'message_id': message_id,
            'timestamp': datetime.now().isoformat()
        })
        
        # Initialize the multimodal model
        model = genai.GenerativeModel(model_name="gemini-1.5-pro")
        
        # Create content parts with both text and image
        content_parts = [
            user_message,
            {'inline_data': {
                'mime_type': 'image/jpeg',
                'data': base64.b64encode(image_data).decode('utf-8')
            }}
        ]
        
        # Generate response
        response = model.generate_content(content_parts)
        bot_response = response.text
        
        # Add bot response to history
        bot_message_id = str(uuid.uuid4())
        conversation_history[session_id].append({
            'role': 'model',
            'parts': [bot_response],
            'message_id': bot_message_id,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'response': bot_response,
            'session_id': session_id,
            'user_message_id': message_id,
            'bot_message_id': bot_message_id,
            'image_url': f'/uploads/{image_filename}'
        })
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/save-conversation', methods=['POST'])
def save_conversation():
    """Save the current conversation to a file."""
    data = request.json
    session_id = data.get('session_id', 'default')
    title = data.get('title', f'Conversation-{datetime.now().strftime("%Y%m%d-%H%M%S")}')
    
    if session_id not in conversation_history or not conversation_history[session_id]:
        return jsonify({'error': 'No conversation to save'}), 400
    
    try:
        # Create a safe filename
        safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        filename = f"{safe_title}-{str(uuid.uuid4())[:8]}.json"
        file_path = os.path.join(app.config['CONVERSATIONS_FOLDER'], filename)
        
        # Prepare conversation data
        conversation_data = {
            'title': title,
            'date': datetime.now().isoformat(),
            'session_id': session_id,
            'messages': conversation_history[session_id]
        }
        
        # Save to file
        with open(file_path, 'w') as f:
            json.dump(conversation_data, f, indent=2)
        
        return jsonify({
            'status': 'success',
            'message': 'Conversation saved successfully',
            'filename': filename
        })
    
    except Exception as e:
        print(f"Error saving conversation: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/get-conversations', methods=['GET'])
def get_conversations():
    """Get a list of saved conversations."""
    try:
        conversations = []
        for filename in os.listdir(app.config['CONVERSATIONS_FOLDER']):
            if filename.endswith('.json'):
                file_path = os.path.join(app.config['CONVERSATIONS_FOLDER'], filename)
                with open(file_path, 'r') as f:
                    conversation = json.load(f)
                    conversations.append({
                        'filename': filename,
                        'title': conversation.get('title', 'Untitled'),
                        'date': conversation.get('date', '')
                    })
        
        return jsonify({
            'conversations': sorted(conversations, key=lambda x: x['date'], reverse=True)
        })
    
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/load-conversation/<filename>', methods=['GET'])
def load_conversation(filename):
    """Load a saved conversation."""
    try:
        file_path = os.path.join(app.config['CONVERSATIONS_FOLDER'], filename)
        with open(file_path, 'r') as f:
            conversation_data = json.load(f)
        
        # Create a new session with the loaded conversation
        new_session_id = f"loaded_{str(uuid.uuid4())}"
        conversation_history[new_session_id] = conversation_data['messages']
        
        return jsonify({
            'status': 'success',
            'session_id': new_session_id,
            'title': conversation_data.get('title', 'Loaded Conversation'),
            'messages': conversation_data['messages']
        })
    
    except Exception as e:
        print(f"Error loading conversation: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/reset', methods=['POST'])
def reset_conversation():
    """Reset the conversation history."""
    data = request.json
    session_id = data.get('session_id', 'default')
    
    if session_id in conversation_history:
        conversation_history[session_id] = []
    
    return jsonify({
        'status': 'success',
        'message': 'Conversation reset successfully',
        'session_id': session_id
    })

if __name__ == '__main__':
    app.run(debug=True, port=5005)  