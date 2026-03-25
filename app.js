/* Unlimited Claude - Premium Chat with File Upload Support */

let currentChatId = null;
let chats = JSON.parse(localStorage.getItem('claude-chats')) || [];
let currentModel = 'claude-sonnet-4-6';
let attachedFiles = []; // Stores uploaded file info

// DOM Elements
const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');
const modelDisplay = document.getElementById('model-display');
const attachedFilesDiv = document.getElementById('attached-files');
const loadingDiv = document.getElementById('loading');
const sendBtn = document.getElementById('send-btn');

// Toast notification
function showToast(message, icon = '✓', duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  toastMessage.textContent = message;
  toastIcon.textContent = icon;
  toast.classList.remove('translate-x-full');
  
  setTimeout(() => {
    toast.classList.add('translate-x-full');
  }, duration);
}

// File Upload - Trigger file picker
async function triggerFileUpload() {
  try {
    // Use Puter's file picker
    const files = await puter.ui.showOpenFilePicker({
      multiple: true,
      accept: 'image/*,.pdf,.doc,.docx'
    });
    
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      await uploadFile(file);
    }
  } catch (err) {
    console.error('File picker error:', err);
    showToast('Failed to open file picker', '✗');
  }
}

// Upload file to Puter and attach
async function uploadFile(file) {
  try {
    showToast(`Uploading ${file.name}...`, '⬆️', 2000);
    
    // Upload to Puter's temporary storage
    const uploadedPath = await puter.fs.upload(file);
    
    // Create file attachment object
    const fileAttachment = {
      name: file.name,
      type: file.type,
      size: file.size,
      path: uploadedPath,
      isImage: file.type.startsWith('image/'),
      isDocument: file.type.includes('pdf') || file.name.endsWith('.pdf') || 
                  file.name.endsWith('.doc') || file.name.endsWith('.docx')
    };
    
    // If image, get data URL for preview
    if (fileAttachment.isImage) {
      fileAttachment.preview = await fileToDataURL(file);
    }
    
    attachedFiles.push(fileAttachment);
    renderAttachedFiles();
    showToast(`${file.name} attached`, '✓');
    
  } catch (err) {
    console.error('Upload error:', err);
    showToast(`Failed to upload ${file.name}`, '✗');
  }
}

// Convert file to data URL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Render attached files preview
function renderAttachedFiles() {
  if (attachedFiles.length === 0) {
    attachedFilesDiv.classList.add('hidden');
    return;
  }
  
  attachedFilesDiv.classList.remove('hidden');
  attachedFilesDiv.innerHTML = attachedFiles.map((file, index) => {
    if (file.isImage && file.preview) {
      return `
        <div class="relative group">
          <img src="${file.preview}" alt="${file.name}" class="file-thumbnail">
          <button onclick="removeAttachedFile(${index})" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
        </div>
      `;
    } else {
      return `
        <div class="file-attachment relative group">
          <svg class="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span class="text-[#a3a3a3]">${file.name}</span>
          <button onclick="removeAttachedFile(${index})" class="ml-2 text-gray-500 hover:text-red-400">×</button>
        </div>
      `;
    }
  }).join('');
}

// Remove attached file
function removeAttachedFile(index) {
  attachedFiles.splice(index, 1);
  renderAttachedFiles();
}

// Render chat list
function renderChatList() {
  chatList.innerHTML = chats.map(chat => `
    <div onclick="loadChat('${chat.id}')" 
         class="chat-item flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer ${chat.id === currentChatId ? 'active bg-[#262626]' : ''}">
      <div class="truncate flex-1 text-sm ${chat.id === currentChatId ? 'text-white' : 'text-[#a3a3a3]'}">${chat.title}</div>
      <button onclick="event.stopImmediatePropagation(); deleteChat('${chat.id}');" 
              class="text-[#737373] hover:text-red-400 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#404040] transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
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
  attachedFiles = [];
  renderAttachedFiles();
}

// Load chat
function loadChat(id) {
  currentChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  
  // Close sidebar on mobile
  if (window.innerWidth < 1024) {
    document.getElementById('sidebar').classList.remove('open');
  }
  
  currentChatTitle.textContent = chat.title;
  currentModel = chat.model || 'claude-sonnet-4-6';
  document.getElementById('model-select').value = currentModel;
  updateModelDisplay();
  
  messagesDiv.innerHTML = chat.messages.map(msg => createMessageHTML(msg)).join('');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  renderChatList();
  
  // Clear attached files when switching chats
  attachedFiles = [];
  renderAttachedFiles();
}

// Update model display
function updateModelDisplay() {
  const modelNames = {
    'claude-opus-4-6': 'Claude Opus 4.6',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6',
    'claude-haiku-4-5': 'Claude Haiku 4.5'
  };
  modelDisplay.textContent = modelNames[currentModel] || currentModel;
}

// Create message element with action buttons
function createMessageHTML(msg, isStreaming = false) {
  const isUser = msg.role === 'user';
  const content = isStreaming ? '' : marked.parse(msg.content);
  const filesHtml = msg.files && msg.files.length > 0 ? renderMessageFiles(msg.files) : '';
  
  return `
    <div class="flex ${isUser ? 'justify-end' : 'justify-start'} group" data-msg-id="${msg.id || ''}">
      <div class="message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'} px-5 py-4 text-[15px] leading-relaxed">
        ${filesHtml}
        <div class="markdown-content ${isStreaming ? 'streaming-text' : ''}">${isUser ? escapeHtml(msg.content) : content}</div>
        ${!isStreaming && !isUser ? `
          <div class="action-btn flex items-center gap-2 mt-3 pt-2 border-t border-[#404040]/50">
            <button onclick="copyMessage(this)" class="text-[#737373] hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-[#404040] transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Copy
            </button>
            <button onclick="regenerateMessage()" class="text-[#737373] hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-[#404040] transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Regenerate
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Render files attached to a message
function renderMessageFiles(files) {
  return files.map(file => {
    if (file.isImage && file.preview) {
      return `<div class="mb-2"><img src="${file.preview}" alt="${file.name}" class="max-h-48 rounded-lg border border-[#404040]"></div>`;
    } else {
      return `
        <div class="file-attachment mb-2">
          <svg class="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span>${file.name}</span>
        </div>
      `;
    }
  }).join('');
}

// Escape HTML for user messages
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Copy message to clipboard
function copyMessage(btn) {
  const bubble = btn.closest('.message-bubble');
  const content = bubble.querySelector('.markdown-content').textContent;
  navigator.clipboard.writeText(content).then(() => {
    showToast('Copied to clipboard', '✓');
  });
}

// Regenerate last message
async function regenerateMessage() {
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat || chat.messages.length < 2) return;
  
  // Remove last assistant message
  const lastMsg = chat.messages[chat.messages.length - 1];
  if (lastMsg.role === 'assistant') {
    chat.messages.pop();
    saveChats();
    loadChat(currentChatId);
    
    // Resend with last user message
    const lastUserMsg = chat.messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg) {
      userInput.value = lastUserMsg.content;
      attachedFiles = lastUserMsg.files || [];
      renderAttachedFiles();
      await sendMessage();
    }
  }
}

// Send message with file support
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text && attachedFiles.length === 0) return;
  if (!currentChatId) return;

  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  // Disable send button
  sendBtn.disabled = true;
  
  // Build message content with file context
  let fullContent = text;
  let fileContext = '';
  
  if (attachedFiles.length > 0) {
    const imageCount = attachedFiles.filter(f => f.isImage).length;
    const docCount = attachedFiles.filter(f => f.isDocument).length;
    
    if (imageCount > 0) {
      fileContext += `\n\n[Attached: ${imageCount} image${imageCount > 1 ? 's' : ''}]`;
    }
    if (docCount > 0) {
      const docNames = attachedFiles.filter(f => f.isDocument).map(f => f.name).join(', ');
      fileContext += `\n\n[Attached documents: ${docNames}]`;
    }
  }
  
  fullContent += fileContext;

  // Add user message
  const userMsg = { 
    role: 'user', 
    content: text || '[File attachment]',
    files: [...attachedFiles],
    id: Date.now().toString()
  };
  chat.messages.push(userMsg);
  
  messagesDiv.innerHTML += createMessageHTML(userMsg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  userInput.value = '';
  
  // Clear attached files
  attachedFiles = [];
  renderAttachedFiles();

  // Update title if first message
  if (chat.messages.length === 1) {
    chat.title = (text || 'File Analysis').substring(0, 35) + ((text || '').length > 35 ? '...' : '');
    currentChatTitle.textContent = chat.title;
    renderChatList();
  }

  // Show loading
  loadingDiv.classList.remove('hidden');
  scrollToBottom();

  try {
    // Prepare message for AI with file references
    let aiPrompt = fullContent;
    
    // If we have images, we need to handle them specially for vision models
    const images = userMsg.files.filter(f => f.isImage);
    const documents = userMsg.files.filter(f => f.isDocument);
    
    // Build the options for puter.ai.chat
    const chatOptions = {
      model: currentModel,
      stream: true
    };
    
    // Add images if present
    if (images.length > 0 && images[0].preview) {
      chatOptions.image = images[0].preview; // Puter supports image URLs/data URLs
    }

    const resp = await puter.ai.chat(aiPrompt, chatOptions);

    // Create streaming response element
    const msgId = 'msg-' + Date.now();
    const streamingMsg = {
      role: 'assistant',
      content: '',
      id: msgId
    };
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createMessageHTML(streamingMsg, true);
    messagesDiv.appendChild(tempDiv);
    
    const streamText = tempDiv.querySelector('.streaming-text');
    let fullResponse = '';

    for await (const part of resp) {
      if (part?.text) {
        fullResponse += part.text;
        streamText.innerHTML = marked.parse(fullResponse);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }

    // Save final assistant message
    streamingMsg.content = fullResponse;
    chat.messages.push(streamingMsg);
    saveChats();
    
    // Reload to show proper formatted message with action buttons
    loadChat(currentChatId);
    
  } catch (err) {
    console.error('Chat error:', err);
    showToast('Error connecting to Claude. Please sign into Puter.', '✗', 5000);
    
    // Add error message
    const errorMsg = {
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please make sure you are signed into Puter and try again.',
      id: Date.now().toString()
    };
    chat.messages.push(errorMsg);
    saveChats();
    loadChat(currentChatId);
    
  } finally {
    loadingDiv.classList.add('hidden');
    sendBtn.disabled = false;
  }
}

// Save chats to localStorage
function saveChats() {
  localStorage.setItem('claude-chats', JSON.stringify(chats));
}

// Delete single chat
function deleteChat(id) {
  if (!confirm('Delete this conversation?')) return;
  
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) {
    currentChatId = null;
    messagesDiv.innerHTML = '';
    currentChatTitle.textContent = 'New Conversation';
    attachedFiles = [];
    renderAttachedFiles();
  }
  renderChatList();
  showToast('Chat deleted', '🗑️');
}

// Clear all chats
function clearAllChats() {
  if (!confirm('Delete ALL conversations permanently? This cannot be undone.')) return;
  
  chats = [];
  saveChats();
  currentChatId = null;
  messagesDiv.innerHTML = '';
  currentChatTitle.textContent = 'New Conversation';
  attachedFiles = [];
  renderAttachedFiles();
  renderChatList();
  showToast('All chats cleared', '🗑️');
}

// Switch model
function switchModel() {
  currentModel = document.getElementById('model-select').value;
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) {
    chat.model = currentModel;
    saveChats();
  }
  updateModelDisplay();
  showToast(`Switched to ${document.getElementById('model-select').options[document.getElementById('model-select').selectedIndex].text}`, '🤖');
}

// Toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// Scroll to bottom
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Show/hide scroll to bottom button
messagesDiv.addEventListener('scroll', () => {
  const scrollBtn = document.getElementById('scroll-bottom');
  const isNearBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 100;
  scrollBtn.classList.toggle('hidden', isNearBottom);
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
});

// Keyboard shortcuts
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  
  // Ctrl/Cmd + N for new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    newChat();
  }
  
  // Escape to close sidebar on mobile
  if (e.key === 'Escape') {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// Handle paste events for images
userInput.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        await uploadFile(file);
        showToast('Image pasted from clipboard', '📋');
      }
    }
  }
});

// Initialize app
function init() {
  // Configure marked for safe HTML
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
  
  renderChatList();
  updateModelDisplay();
  
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    newChat();
  }
  
  // Check if Puter is ready
  if (typeof puter !== 'undefined') {
    console.log('✓ Puter.js loaded');
  } else {
    console.warn('Puter.js not loaded yet');
  }
}

// Start the app
init();
