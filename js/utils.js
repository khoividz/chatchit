var Utils = {
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
    return 'kv-dev-' + num;
  },

  generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const oneDay = 86400000;

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
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

    if (date.toDateString() === now.toDateString()) return 'Hôm nay';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  isSameDay(t1, t2) {
    const d1 = new Date(t1);
    const d2 = new Date(t2);
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
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

  getAvatarUrl(avatar) {
    if (!avatar || avatar === 'default') return 'assets/images/avatar-default.svg';
    return avatar;
  },

  withTimeout(promise, ms) {
    var timer;
    var timeout = new Promise(function(_, reject) {
      timer = setTimeout(function() { reject(new Error('timeout')); }, ms);
    });
    return Promise.race([promise, timeout]).finally(function() {
      clearTimeout(timer);
    });
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
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  createNotificationSound() {
    if (window.__notifSound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      window.__notifSound = {
        play() {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) { /* ignore */ }
        },
      };
    } catch (e) { /* ignore */ }
  },

  playNotificationSound() {
    const user = this.getCurrentUser();
    if (user && user.soundEnabled && window.__notifSound) {
      window.__notifSound.play();
    }
  },
};
