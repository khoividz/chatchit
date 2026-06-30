var Chat = {
  currentFriendId: null,
  typingTimer: null,
  isTyping: false,
  unsubscribeMessages: null,
  unsubscribeTyping: null,
  _lastRenderedMessages: null,

  openChat(friendId) {
    this.closeChat();
    this.currentFriendId = friendId;
    this.renderMessages([]);
    this.setupInputListeners(friendId);
    this.setupListeners(friendId);
    this.markAsSeen(friendId);
  },

  closeChat() {
    this.currentFriendId = null;
    if (this.unsubscribeMessages) { this.unsubscribeMessages(); this.unsubscribeMessages = null; }
    if (this.unsubscribeTyping) { this.unsubscribeTyping(); this.unsubscribeTyping = null; }
  },

  setupListeners(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;
    const convId = Utils.getConversationId(currentUser.id, friendId);

    this.unsubscribeMessages = DB.onMessages(convId, (messages) => {
      if (this.currentFriendId === friendId) {
        this.renderMessages(messages);
        this.markAsSeen(friendId);
        this.scrollToBottom();
      }
    });

    this.unsubscribeTyping = DB.onTyping(convId, (data) => {
      if (data && data.userId !== currentUser.id && this.currentFriendId === friendId) {
        this.showTypingIndicator(data.isTyping);
      }
    });
  },

  async sendMessage(friendId, text, type) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;
    if (type !== 'sticker' && !text.trim()) return;

    const convId = Utils.getConversationId(currentUser.id, friendId);
    var message = {
      from: currentUser.id,
      text: type === 'sticker' ? text : text.trim(),
      timestamp: Date.now(),
      seen: false,
    };
    if (type === 'sticker') message.type = 'sticker';

    await DB.sendMessage(convId, message);
    this.stopTyping(friendId);
  },

  renderMessages(messages) {
    this._lastRenderedMessages = messages;
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;

    if (!messages || messages.length === 0) {
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

    messages.forEach(msg => {
      const isSent = msg.from === currentUser.id;

      if (!Utils.isSameDay(lastTimestamp, msg.timestamp)) {
        html += '<div class="date-divider">' + Utils.formatDate(msg.timestamp) + '</div>';
      }
      lastTimestamp = msg.timestamp;

      const seenIcon = isSent && msg.seen
        ? '<span class="message-status seen" title="Đã xem">\u2713\u2713</span>'
        : isSent
          ? '<span class="message-status" title="Đã gửi">\u2713</span>'
          : '';

      var msgId = msg.id || '';
      var isSticker = msg.type === 'sticker';

      html += '<div class="message-row ' + (isSent ? 'sent' : 'received') + '">'
        + '<div class="message-bubble ' + (isSent ? 'sent' : 'received') + (isSticker ? ' message-sticker' : '') + '"'
        + ' data-msg-id="' + msgId + '"'
        + ' onclick="Reactions.showPicker(\'' + msgId + '\', this)"'
        + ' ontouchstart="Chat._touchStart(event, \'' + msgId + '\')"'
        + ' ontouchend="Chat._touchEnd(event)"'
        + '>'
        + (isSticker
            ? '<div class="sticker-display">' + msg.text + '</div>'
            : Utils.escapeHtml(msg.text))
        + '<span class="message-time">' + Utils.formatTime(msg.timestamp) + seenIcon + '</span>'
        + '</div>'
        + '<div class="message-reactions" id="reactions-' + msgId + '"></div>'
        + '</div>';
    });

    container.innerHTML = html;

    messages.forEach(function(msg) {
      var msgId = msg.id || '';
      if (msgId) {
        Reactions.attachToMessage(msgId);
        var rc = document.getElementById('reactions-' + msgId);
        if (rc) Reactions.renderReactions(msgId, rc);
      }
    });
  },

  _touchStart(event, msgId) {
    Chat._touchTimer = setTimeout(function() {
      Reactions.showPicker(msgId, event.currentTarget);
    }, 500);
  },

  _touchEnd() {
    clearTimeout(Chat._touchTimer);
  },

  async markAsSeen(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return;
    const convId = Utils.getConversationId(currentUser.id, friendId);
    await DB.markAllMessagesAsSeen(convId, currentUser.id);
  },

  setupInputListeners(friendId) {
    const textarea = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const stickerBtn = document.getElementById('stickerBtn');
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

    if (stickerBtn) {
      stickerBtn.onclick = function() {
        Stickers.openPicker(friendId, function(stickerHtml) {
          Chat.sendMessage(friendId, stickerHtml, 'sticker');
          Stickers.closePicker();
        });
      };
    }
  },

  startTyping(friendId) {
    const currentUser = Utils.getCurrentUser();
    const convId = Utils.getConversationId(currentUser.id, friendId);

    if (!this.isTyping) {
      this.isTyping = true;
      DB.setTyping(convId, currentUser.id, true);
    }

    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(friendId), 3000);
  },

  stopTyping(friendId) {
    if (!this.isTyping) return;
    this.isTyping = false;

    const currentUser = Utils.getCurrentUser();
    const convId = Utils.getConversationId(currentUser.id, friendId);
    DB.setTyping(convId, currentUser.id, false);
    clearTimeout(this.typingTimer);
  },

  showTypingIndicator(isTyping) {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;
    if (isTyping) indicator.classList.add('show');
    else indicator.classList.remove('show');
  },

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  getUnreadCount(messages) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser || !messages) return 0;
    return messages.filter(m => m.from !== currentUser.id && !m.seen).length;
  },
};
