const Notifications = {
  panelOpen: false,
  unsubscribes: [],

  init() {
    this.renderBell();
    this.renderPanel();
    this.setupBroadcastListener();
    this.setupClickOutside();

    const user = Utils.getCurrentUser();
    if (user && user.soundEnabled) {
      this.createNotificationSound();
    }
  },

  createNotificationSound() {
    if (document.getElementById('notif-sound')) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const sound = {
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
          } catch (e) {}
        },
      };
      window.__notifSound = sound;
    } catch (e) {}
  },

  playNotificationSound() {
    const user = Utils.getCurrentUser();
    if (user && user.soundEnabled && window.__notifSound) {
      window.__notifSound.play();
    }
  },

  getUnreadCount() {
    const requests = Friends.getPendingRequests();
    const unreadMessages = Chat.getAllUnreadCounts();
    return requests.length + unreadMessages;
  },

  renderBell() {
    const container = document.getElementById('notificationBell');
    if (!container) return;

    const count = this.getUnreadCount();
    const badgeHtml = count > 0 ? `<span class="badge">${count > 99 ? '99+' : count}</span>` : '';

    container.innerHTML = `
      <div class="header-notif-wrapper">
        <button class="btn btn-ghost btn-icon notification-bell" onclick="Notifications.togglePanel()" title="Thông báo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          ${badgeHtml}
        </button>
      </div>
    `;
  },

  renderPanel() {
    const container = document.getElementById('notificationPanel');
    if (!container) return;

    const requests = Friends.getPendingRequests();
    const currentUser = Utils.getCurrentUser();

    let itemsHtml = '';

    if (requests.length === 0) {
      itemsHtml = `
        <div class="empty-state" style="padding: 40px 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); opacity: 0.5;">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <h3 style="font-size: 0.9375rem; margin-top: 12px;">Không có thông báo</h3>
          <p style="font-size: 0.8125rem;">Khi có lời mời kết bạn, bạn sẽ thấy ở đây</p>
        </div>
      `;
    } else {
      itemsHtml = requests.map(req => {
        const fromUser = Friends.searchUser(req.from);
        const displayName = fromUser && fromUser.displayName ? fromUser.displayName : req.from;
        const timeAgo = Utils.formatTime(req.createdAt);

        return `
          <div class="notification-item">
            <img class="avatar avatar-sm" src="${Utils.getAvatarUrl(fromUser ? fromUser.avatar : 'default')}" alt="">
            <div class="notif-content">
              <div class="notif-text">
                <strong>${Utils.escapeHtml(displayName)}</strong> đã gửi lời mời kết bạn
              </div>
              <div class="notif-time">${timeAgo}</div>
            </div>
            <div class="notif-actions">
              <button class="btn btn-primary btn-sm" onclick="Notifications.acceptRequest('${req.id}')">Đồng ý</button>
              <button class="btn btn-secondary btn-sm" onclick="Notifications.rejectRequest('${req.id}')">Xóa</button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="notification-panel" id="notificationPanelDropdown">
        <div class="notification-panel-header">
          <h3>Thông báo</h3>
          ${requests.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="Notifications.rejectAll()">Xóa tất cả</button>` : ''}
        </div>
        <div class="notification-list">
          ${itemsHtml}
        </div>
      </div>
    `;

    const dropdown = document.getElementById('notificationPanelDropdown');
    if (dropdown) {
      dropdown.style.display = this.panelOpen ? 'flex' : 'none';
      dropdown.style.flexDirection = 'column';
    }

    this.renderBell();
  },

  togglePanel() {
    this.panelOpen = !this.panelOpen;
    const dropdown = document.getElementById('notificationPanelDropdown');
    if (dropdown) {
      dropdown.style.display = this.panelOpen ? 'flex' : 'none';
      dropdown.style.flexDirection = 'column';
    }
  },

  closePanel() {
    this.panelOpen = false;
    const dropdown = document.getElementById('notificationPanelDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  },

  setupClickOutside() {
    document.addEventListener('click', (e) => {
      const bell = document.querySelector('.notification-bell');
      const panel = document.getElementById('notificationPanelDropdown');
      if (bell && panel && !bell.contains(e.target) && !panel.contains(e.target)) {
        this.closePanel();
      }
    });
  },

  setupBroadcastListener() {
    const unsub = Utils.listenBroadcast((data) => {
      if (['friend-request', 'friend-accept', 'new-message'].includes(data.type)) {
        this.renderPanel();
        this.renderBell();

        if (data.type === 'friend-request') {
          const currentUser = Utils.getCurrentUser();
          if (currentUser && data.request && data.request.to === currentUser.id) {
            this.playNotificationSound();
            Utils.showToast('Bạn có lời mời kết bạn mới', 'info');
          }
        }

        if (data.type === 'new-message') {
          const currentUser = Utils.getCurrentUser();
          if (currentUser && data.message && data.message.from !== currentUser.id) {
            const isOnChatPage = window.location.pathname.includes('chat.html');
            const chatFriendId = Chat.currentFriendId;
            const msgConvParts = data.conversationId ? data.conversationId.split('_') : [];

            if (!isOnChatPage || (isOnChatPage && chatFriendId && !msgConvParts.includes(chatFriendId))) {
              this.playNotificationSound();
            }
          }
        }
      }
    });
    this.unsubscribes.push(unsub);
  },

  async acceptRequest(requestId) {
    const result = Friends.acceptRequest(requestId);

    if (result.success) {
      this.renderPanel();
      Utils.showToast('Đã chấp nhận lời mời kết bạn', 'success');
    } else {
      Utils.showToast('Có lỗi xảy ra', 'error');
    }
  },

  async rejectRequest(requestId) {
    Friends.rejectRequest(requestId);
    this.renderPanel();
    Utils.showToast('Đã xóa lời mời', 'info');
  },

  rejectAll() {
    const requests = Friends.getPendingRequests();
    requests.forEach(req => Friends.rejectRequest(req.id));
    this.renderPanel();
    Utils.showToast('Đã xóa tất cả thông báo', 'info');
  },

  destroy() {
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
  },
};
