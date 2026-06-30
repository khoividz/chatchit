const Utils = {
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  validateId(id) {
    return /^kv-dev-\d{6}$/.test(id);
  },

  generateId() {
    const num = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return `kv-dev-${num}`;
  },

  generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 86400000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    if (diff < 2 * oneDay) {
      return 'Hôm qua ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 86400000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return 'Hôm nay';
    }

    if (diff < 2 * oneDay) {
      return 'Hôm qua';
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  isSameDay(timestamp1, timestamp2) {
    const d1 = new Date(timestamp1);
    const d2 = new Date(timestamp2);
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  },

  getConversationId(id1, id2) {
    return [id1, id2].sort().join('_');
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem('currentUser');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getUsers() {
    try {
      const data = localStorage.getItem('users');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
  },

  getFriends() {
    try {
      const data = localStorage.getItem('friends');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveFriends(friends) {
    localStorage.setItem('friends', JSON.stringify(friends));
  },

  getFriendRequests() {
    try {
      const data = localStorage.getItem('friendRequests');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveFriendRequests(requests) {
    localStorage.setItem('friendRequests', JSON.stringify(requests));
  },

  getMessages(conversationId) {
    try {
      const data = localStorage.getItem('messages_' + conversationId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMessages(conversationId, messages) {
    localStorage.setItem('messages_' + conversationId, JSON.stringify(messages));
  },

  getAvatarUrl(avatar) {
    if (!avatar || avatar === 'default') {
      return 'assets/images/avatar-default.svg';
    }
    return avatar;
  },

  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  showToast(message, type) {
    type = type || 'info';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  broadcast(data) {
    try {
      const channel = new BroadcastChannel('anonymous-chat');
      channel.postMessage(data);
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }
  },

  listenBroadcast(handler) {
    try {
      const channel = new BroadcastChannel('anonymous-chat');
      channel.onmessage = (e) => handler(e.data);
      return () => channel.close();
    } catch (e) {
      console.warn('BroadcastChannel not supported');
      return () => {};
    }
  },
};
