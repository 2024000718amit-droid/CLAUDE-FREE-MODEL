let currentChatId = null;
let chats = JSON.parse(localStorage.getItem('claude-chats')) || [];
let currentModel = 'claude-sonnet-4-6';

const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');

// Tailwind script already loaded in HTML
function initTailwind() {
  tailwind.config = { content: ["./**/*.{html,js}"] };
}

// Render chat list
function renderChatList() {
  chatList.innerHTML = chats.map(chat => `
    <div onclick="loadChat('${chat.id}')" 
         class="flex items-center justify-between px-4 py-3 hover:bg-gray-800 rounded-2xl cursor-pointer ${chat.id === currentChatId ? 'bg-gray-800' : ''}">
      <div class="truncate flex-1">${chat.title}</div>
      <button onclick="event.stopImmediatePropagation(); deleteChat('${chat.id}');" class="text-gray-500 hover:text-red-400 text-xl">×</button>
    </div>
  `).join('');
}

// Create new chat
async function newChat() {
  currentChatId = Date.now().toString();
  chats.unshift({
    id: currentChatId,
    title: "New Conversation",
    messages: [],
    model: currentModel
  });
  saveChats();
  renderChatList();
  loadChat(currentChatId);
}

// Load chat
function loadChat(id) {
  currentChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  
  currentChatTitle.textContent = chat.title;
  currentModel = chat.model || 'claude-sonnet-4-6';
  document.getElementById('model-select').value = currentModel;
  
  messagesDiv.innerHTML = chat.messages.map(msg => createMessageHTML(msg)).join('');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  renderChatList();
}

// Create message element
function createMessageHTML(msg) {
  const isUser = msg.role === 'user';
  return `
    <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
      <div class="message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'} px-6 py-4 text-base leading-relaxed">
        ${isUser ? msg.content : marked.parse(msg.content)}
      </div>
    </div>
  `;
}

// Send message
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || !currentChatId) return;

  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  // Add user message
  chat.messages.push({ role: 'user', content: text });
  messagesDiv.innerHTML += createMessageHTML({ role: 'user', content: text });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  userInput.value = '';

  // Update title if first message
  if (chat.messages.length === 1) {
    chat.title = text.substring(0, 35) + (text.length > 35 ? '...' : '');
    currentChatTitle.textContent = chat.title;
  }

  // Show loading
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');

  try {
    const responseDiv = document.createElement('div');
    responseDiv.className = 'flex justify-start';
    responseDiv.innerHTML = `
      <div class="assistant-bubble px-6 py-4 text-base leading-relaxed max-w-[80%]">
        <span id="streaming-text"></span>
      </div>
    `;
    messagesDiv.appendChild(responseDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const streamText = document.getElementById('streaming-text');

    const resp = await puter.ai.chat(text, {
      model: currentModel,
      stream: true
    });

    let fullText = '';
    for await (const part of resp) {
      if (part?.text) {
        fullText += part.text;
        streamText.innerHTML = marked.parse(fullText);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }

    // Save assistant message
    chat.messages.push({ role: 'assistant', content: fullText });
    saveChats();
  } catch (err) {
    console.error(err);
    alert('Error connecting to Claude. Make sure you are signed into Puter.');
  } finally {
    loading.classList.add('hidden');
    renderChatList();
  }
}

// Save chats to localStorage
function saveChats() {
  localStorage.setItem('claude-chats', JSON.stringify(chats));
}

// Delete single chat
function deleteChat(id) {
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) {
    currentChatId = null;
    messagesDiv.innerHTML = '';
    currentChatTitle.textContent = 'New Conversation';
  }
  renderChatList();
}

// Clear all chats
function clearAllChats() {
  if (confirm('Delete ALL chats permanently?')) {
    chats = [];
    saveChats();
    currentChatId = null;
    messagesDiv.innerHTML = '';
    currentChatTitle.textContent = 'New Conversation';
    renderChatList();
  }
}

// Switch model
function switchModel() {
  currentModel = document.getElementById('model-select').value;
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) chat.model = currentModel;
  saveChats();
}

// Keyboard shortcut
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initialize
initTailwind();
renderChatList();
if (chats.length > 0) {
  loadChat(chats[0].id);
} else {
  newChat();
}
