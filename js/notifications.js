var Notifications = {
  panelOpen: false,
  pendingRequests: [],
  unsubRequests: null,
  unsubFriends: null,

  init() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    Utils.createNotificationSound();
    this.setupListeners(user.id);
    this.renderBell();
    this.setupClickOutside();
  },

  setupListeners(userId) {
    if (this.unsubRequests) this.unsubRequests();

    this.unsubRequests = DB.onFriendRequestsForUser(userId, (requests) => {
      this.pendingRequests = requests.filter(r => r.status === 'pending');
      this.renderPanel();
      this.renderBell();
    });
  },

  destroy() {
    if (this.unsubRequests) { this.unsubRequests(); this.unsubRequests = null; }
    if (this.unsubFriends) { this.unsubFriends(); this.unsubFriends = null; }
  },

  getRequestCount() {
    return this.pendingRequests ? this.pendingRequests.length : 0;
  },

  renderBell() {
    const container = document.getElementById('notificationBell');
    if (!container) return;

    const count = this.getRequestCount();
    const badgeHtml = count > 0
      ? '<span class="badge">' + (count > 99 ? '99+' : count) + '</span>'
      : '';

    container.innerHTML =
      '<div class="header-notif-wrapper">'
      + '<button class="btn btn-ghost btn-icon notification-bell" onclick="Notifications.togglePanel()" title="Thông báo">'
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>'
      + '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'
      + '</svg>'
      + badgeHtml
      + '</button></div>';
  },

  renderPanel() {
    const container = document.getElementById('notificationPanel');
    if (!container) return;

    const user = Utils.getCurrentUser();
    let itemsHtml = '';

    if (this.pendingRequests.length === 0) {
      itemsHtml =
        '<div class="empty-state" style="padding: 40px 20px;">'
        + '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); opacity: 0.5;">'
        + '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>'
        + '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
        + '</svg>'
        + '<h3 style="font-size: 0.9375rem; margin-top: 12px;">Không có thông báo</h3>'
        + '<p style="font-size: 0.8125rem;">Khi có lời mời kết bạn, bạn sẽ thấy ở đây</p>'
        + '</div>';
    } else {
      itemsHtml = this.pendingRequests.map(req => {
        const displayName = Utils.escapeHtml(req.fromDisplayName || req.from);
        const timeAgo = Utils.formatTime(req.createdAt);
        return '<div class="notification-item">'
          + '<img class="avatar avatar-sm" src="assets/images/avatar-default.svg" alt="">'
          + '<div class="notif-content">'
          + '<div class="notif-text"><strong>' + displayName + '</strong> đã gửi lời mời kết bạn</div>'
          + '<div class="notif-time">' + timeAgo + '</div>'
          + '</div>'
          + '<div class="notif-actions">'
          + '<button class="btn btn-primary btn-sm" onclick="Notifications.acceptRequest(\'' + req.id + '\')">Đồng ý</button>'
          + '<button class="btn btn-secondary btn-sm" onclick="Notifications.rejectRequest(\'' + req.id + '\')">Xóa</button>'
          + '</div>'
          + '</div>';
      }).join('');
    }

    container.innerHTML =
      '<div class="notification-panel" id="notificationPanelDropdown">'
      + '<div class="notification-panel-header">'
      + '<h3>Thông báo</h3>'
      + (this.pendingRequests.length > 0
          ? '<button class="btn btn-ghost btn-sm" onclick="Notifications.rejectAll()">Xóa tất cả</button>'
          : '')
      + '</div>'
      + '<div class="notification-list">' + itemsHtml + '</div>'
      + '</div>';

    const dropdown = document.getElementById('notificationPanelDropdown');
    if (dropdown) {
      dropdown.style.display = this.panelOpen ? 'flex' : 'none';
      dropdown.style.flexDirection = 'column';
    }
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
    if (dropdown) dropdown.style.display = 'none';
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

  async acceptRequest(requestId) {
    const result = await Friends.acceptRequest(requestId);
    if (result.success) {
      Utils.showToast('Đã chấp nhận lời mời kết bạn', 'success');
    } else {
      Utils.showToast('Có lỗi xảy ra', 'error');
    }
  },

  async rejectRequest(requestId) {
    await Friends.rejectRequest(requestId);
    Utils.showToast('Đã xóa lời mời', 'info');
  },

  rejectAll() {
    this.pendingRequests.forEach(req => {
      DB.updateFriendRequest(req.id, { status: 'rejected' });
    });
    Utils.showToast('Đã xóa tất cả thông báo', 'info');
  },
};
