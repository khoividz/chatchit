const Chat = {
  currentFriendId: null,
  typingTimer: null,
  isTyping: false,
  unsubscribe: null,

  openChat(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;

    this.currentFriendId = friendId;
    this.renderMessages(friendId);
    this.markAsSeen(friendId);

    this.setupInputListeners(friendId);
    this.setupBroadcastListener(friendId);
  },

  closeChat() {
    this.currentFriendId = null;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  getMessages(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return [];

    const convId = Utils.getConversationId(currentUser.id, friendId);
    return Utils.getMessages(convId);
  },

  sendMessage(friendId, text) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser || !text.trim()) return;

    const convId = Utils.getConversationId(currentUser.id, friendId);
    const messages = Utils.getMessages(convId);

    const message = {
      id: Utils.generateUUID(),
      from: currentUser.id,
      text: text.trim(),
      timestamp: Date.now(),
      seen: false,
    };

    messages.push(message);
    Utils.saveMessages(convId, messages);

    this.renderMessages(friendId);
    this.scrollToBottom();

    Utils.broadcast({
      type: 'new-message',
      conversationId: convId,
      message,
    });

    this.stopTyping(friendId);
  },

  renderMessages(friendId) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const messages = this.getMessages(friendId);
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>Chưa có tin nhắn</h3>
          <p>Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện</p>
        </div>
      `;
      return;
    }

    let html = '';
    let lastTimestamp = 0;

    messages.forEach((msg, idx) => {
      const isSent = msg.from === currentUser.id;

      if (!Utils.isSameDay(lastTimestamp, msg.timestamp)) {
        html += `<div class="date-divider">${Utils.formatDate(msg.timestamp)}</div>`;
      }
      lastTimestamp = msg.timestamp;

      const seenIcon = isSent && msg.seen
        ? '<span class="message-status seen" title="Đã xem">✓✓</span>'
        : isSent
          ? '<span class="message-status" title="Đã gửi">✓</span>'
          : '';

      html += `
        <div class="message-row ${isSent ? 'sent' : 'received'}">
          <div class="message-bubble ${isSent ? 'sent' : 'received'}">
            ${Utils.escapeHtml(msg.text)}
            <span class="message-time">${Utils.formatTime(msg.timestamp)}${seenIcon}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  markAsSeen(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;

    const convId = Utils.getConversationId(currentUser.id, friendId);
    const messages = Utils.getMessages(convId);
    let changed = false;

    messages.forEach(msg => {
      if (msg.from !== currentUser.id && !msg.seen) {
        msg.seen = true;
        changed = true;
      }
    });

    if (changed) {
      Utils.saveMessages(convId, messages);

      Utils.broadcast({
        type: 'messages-seen',
        conversationId: convId,
        userId: currentUser.id,
      });
    }
  },

  setupInputListeners(friendId) {
    const textarea = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!textarea || !sendBtn) return;

    const send = () => {
      const text = textarea.value.trim();
      if (text) {
        this.sendMessage(friendId, text);
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.disabled = true;
        this.stopTyping(friendId);
      }
    };

    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    };

    textarea.oninput = () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      sendBtn.disabled = !textarea.value.trim();

      if (textarea.value.trim()) {
        this.startTyping(friendId);
      } else {
        this.stopTyping(friendId);
      }
    };

    sendBtn.onclick = send;
    sendBtn.disabled = true;
  },

  setupBroadcastListener(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;

    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = Utils.listenBroadcast((data) => {
      if (data.type === 'typing') {
        const convId = Utils.getConversationId(currentUser.id, friendId);
        if (data.conversationId === convId && data.userId !== currentUser.id) {
          this.showTypingIndicator(data.isTyping);
        }
      }
      if (data.type === 'new-message') {
        const convId = Utils.getConversationId(currentUser.id, friendId);
        if (data.conversationId === convId && data.message.from !== currentUser.id) {
          this.renderMessages(friendId);
          this.markAsSeen(friendId);
        }
      }
      if (data.type === 'messages-seen') {
        const convId = Utils.getConversationId(currentUser.id, friendId);
        if (data.conversationId === convId) {
          this.renderMessages(friendId);
        }
      }
    });
  },

  startTyping(friendId) {
    const currentUser = Utils.getCurrentUser();

    if (!this.isTyping) {
      this.isTyping = true;
      const convId = Utils.getConversationId(currentUser.id, friendId);
      Utils.broadcast({
        type: 'typing',
        conversationId: convId,
        userId: currentUser.id,
        isTyping: true,
      });
    }

    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(friendId), 3000);
  },

  stopTyping(friendId) {
    if (!this.isTyping) return;
    this.isTyping = false;

    const currentUser = Utils.getCurrentUser();
    const convId = Utils.getConversationId(currentUser.id, friendId);

    Utils.broadcast({
      type: 'typing',
      conversationId: convId,
      userId: currentUser.id,
      isTyping: false,
    });

    clearTimeout(this.typingTimer);
  },

  showTypingIndicator(isTyping) {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;

    if (isTyping) {
      indicator.classList.add('show');
    } else {
      indicator.classList.remove('show');
    }
  },

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },

  getUnreadCount(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return 0;

    const messages = this.getMessages(friendId);
    return messages.filter(m => m.from !== currentUser.id && !m.seen).length;
  },

  getAllUnreadCounts() {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return 0;

    const friends = Friends.getFriendsList();
    let total = 0;

    friends.forEach(f => {
      total += this.getUnreadCount(f.id);
    });

    return total;
  },
};
