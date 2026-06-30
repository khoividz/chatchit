const App = {
  unsubFriends: null,
  unsubFriendIds: null,
  messageUnsubs: {},

  init() {
    const user = Utils.getCurrentUser();
    if (user && user.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    }

    const path = window.location.pathname.split('/').pop() || 'index.html';

    switch (path) {
      case 'index.html':
      case '':
        this.initLanding();
        break;
      case 'dashboard.html':
        this.initDashboard();
        break;
      case 'chat.html':
        this.initChat();
        break;
      case 'settings.html':
        this.initSettings();
        break;
    }
  },

  initLanding() {
    if (Auth.redirectIfLoggedIn()) return;

    const createBtn = document.getElementById('createAccountBtn');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        createBtn.disabled = true;
        createBtn.textContent = 'Đang tạo...';

        try {
          await Auth.createAnonymousAccount();
          Utils.showToast('Tạo tài khoản thành công!', 'success');
          window.location.href = 'dashboard.html';
        } catch (e) {
          Utils.showToast('Có lỗi xảy ra, vui lòng thử lại', 'error');
          createBtn.disabled = false;
          createBtn.textContent = 'Tạo tài khoản ẩn danh';
        }
      });
    }
  },

  async initDashboard() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    Notifications.init();
    this.setupFriendsSubscription();
    this.setupSearchHandlers();
    this.setupMobileMenu('.app-sidebar', 'mobileMenuBtn');
  },

  setupFriendsSubscription() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    if (this.unsubFriendIds) this.unsubFriendIds();

    this.unsubFriendIds = DB.onFriendIds(user.id, (friendIds) => {
      this.loadAndRenderFriends(friendIds);
    });
  },

  async loadAndRenderFriends(friendIds) {
    const user = Utils.getCurrentUser();
    if (!user) return;

    this.unsubscribeMessageListeners();

    let friends = [];
    if (friendIds.length > 0) {
      const promises = friendIds.map(id => DB.getUser(id));
      const users = await Promise.all(promises);
      friends = friendIds.map((id, i) => {
        const u = users[i];
        return u ? { id, displayName: u.displayName || '', avatar: u.avatar || 'default' }
                 : { id, displayName: '', avatar: 'default' };
      }).filter(Boolean);
    }

    this.renderFriendsList(friends);
    this.setupMessageListeners(friendIds);
  },

  setupMessageListeners(friendIds) {
    const user = Utils.getCurrentUser();
    if (!user) return;

    friendIds.forEach(id => {
      const convId = Utils.getConversationId(user.id, id);
      const unsub = DB.onMessages(convId, (messages) => {
        this.renderFriendsList(null, { [id]: Chat.getUnreadCount(messages) });
      });
      this.messageUnsubs[convId] = unsub;
    });
  },

  unsubscribeMessageListeners() {
    Object.values(this.messageUnsubs).forEach(fn => fn());
    this.messageUnsubs = {};
  },

  renderFriendsList(friends, unreadOverrides) {
    const sidebarContainer = document.getElementById('friendsList');
    const mainContainer = document.getElementById('friendsListContainer');

    if (!sidebarContainer && !mainContainer) return;

    const emptyHtml =
      '<div class="empty-state">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>'
      + '<circle cx="9" cy="7" r="4"/>'
      + '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>'
      + '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
      + '</svg>'
      + '<h3>Chưa có bạn bè</h3>'
      + '<p>Tìm kiếm bạn bè bằng ID và gửi lời mời kết bạn</p>'
      + '</div>';

    const cardHtml = (f, compact) => {
      const unread = unreadOverrides && unreadOverrides[f.id] !== undefined
        ? unreadOverrides[f.id] : 0;
      const displayName = Utils.escapeHtml(f.displayName || f.id);

      if (compact) {
        return '<div class="friend-item" onclick="window.location.href=\'chat.html?friend=' + f.id + '\'">'
          + '<img class="avatar avatar-sm" src="' + Utils.getAvatarUrl(f.avatar) + '" alt="">'
          + '<div class="friend-info">'
          + '<div class="friend-name">' + displayName + '</div>'
          + '<div class="friend-id">' + Utils.escapeHtml(f.id) + '</div>'
          + '</div>'
          + (unread > 0 ? '<span class="badge">' + unread + '</span>' : '')
          + '</div>';
      }

      return '<div class="friend-card" onclick="window.location.href=\'chat.html?friend=' + f.id + '\'">'
        + '<img class="avatar" src="' + Utils.getAvatarUrl(f.avatar) + '" alt="">'
        + '<div class="friend-details">'
        + '<div class="friend-name-display">' + displayName + '</div>'
        + '<div class="friend-id-display">' + Utils.escapeHtml(f.id) + '</div>'
        + '</div>'
        + '<div style="display: flex; align-items: center; gap: 8px;">'
        + (unread > 0 ? '<span class="badge">' + unread + '</span>' : '')
        + '<span class="btn btn-primary btn-sm">Nhắn tin</span>'
        + '</div></div>';
    };

    const friendsList = friends || this._lastFriends || [];

    if (sidebarContainer) {
      sidebarContainer.innerHTML = friendsList.length === 0
        ? emptyHtml
        : friendsList.map(f => cardHtml(f, true)).join('');
    }

    if (mainContainer) {
      mainContainer.innerHTML = friendsList.length === 0
        ? emptyHtml
        : friendsList.map(f => cardHtml(f, false)).join('');
    }

    if (friends) this._lastFriends = friends;
  },

  setupSearchHandlers() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResult = document.getElementById('searchResult');

    if (!searchBtn || !searchInput) return;

    const performSearch = async () => {
      const query = searchInput.value.trim();
      if (!query) { searchResult.innerHTML = ''; return; }

      const user = await Friends.searchUser(query);
      const currentUser = Utils.getCurrentUser();

      if (!user) {
        searchResult.innerHTML = '<p class="not-found">Không tìm thấy người dùng với ID này</p>';
        return;
      }

      if (user.id === currentUser.id) {
        searchResult.innerHTML = '<p class="not-found">Đây là ID của bạn</p>';
        return;
      }

      const friendIds = await DB.getFriendIds(currentUser.id);
      const isFriend = friendIds.includes(user.id);

      const sentReqs = await DB.getSentRequests(currentUser.id);
      const hasPending = sentReqs.some(r => r.to === user.id && r.status === 'pending');

      const displayName = Utils.escapeHtml(user.displayName || user.id);

      searchResult.innerHTML =
        '<div class="search-result">'
        + '<img class="avatar" src="' + Utils.getAvatarUrl(user.avatar) + '" alt="">'
        + '<div class="user-info">'
        + '<div class="user-id-display">' + displayName + '</div>'
        + '<div class="user-id-label">' + Utils.escapeHtml(user.id) + '</div>'
        + '</div>'
        + (isFriend
            ? '<span class="btn btn-sm btn-secondary" style="pointer-events: none;">Đã là bạn bè</span>'
            : hasPending
              ? '<span class="btn btn-sm btn-secondary" style="pointer-events: none;">Đã gửi lời mời</span>'
              : '<button class="btn btn-primary btn-sm" onclick="App.sendFriendRequest(\'' + user.id + '\')">Kết bạn</button>')
        + '</div>';
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  },

  async sendFriendRequest(targetId) {
    const result = await Friends.sendFriendRequest(targetId);

    if (result.success) {
      Utils.showToast('Đã gửi lời mời kết bạn', 'success');
      const btn = document.querySelector('.search-result .btn');
      if (btn) {
        btn.textContent = 'Đã gửi lời mời';
        btn.className = 'btn btn-sm btn-secondary';
        btn.style.pointerEvents = 'none';
        btn.onclick = null;
      }
    } else {
      const messages = {
        self_request: 'Không thể gửi lời mời cho chính mình',
        invalid_id: 'ID không hợp lệ',
        user_not_found: 'Không tìm thấy người dùng',
        already_friends: 'Đã là bạn bè',
        request_pending: 'Đã gửi lời mời trước đó',
        not_logged_in: 'Vui lòng đăng nhập',
      };
      Utils.showToast(messages[result.error] || 'Có lỗi xảy ra', 'error');
    }
  },

  async initChat() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();

    const params = new URLSearchParams(window.location.search);
    const friendId = params.get('friend');

    if (!friendId || !Utils.validateId(friendId)) {
      window.location.href = 'dashboard.html';
      return;
    }

    const currentUser = Utils.getCurrentUser();
    const friendIds = await DB.getFriendIds(currentUser.id);

    if (!friendIds.includes(friendId)) {
      window.location.href = 'dashboard.html';
      return;
    }

    this.renderChatHeader(friendId);
    Chat.openChat(friendId);

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
      });
    }

    this.setupMobileMenu('.app-sidebar', 'sidebarToggle');

    this.renderChatSidebar(friendId);
  },

  async initSettings() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    Settings.init();
    Notifications.init();
    this.setupMobileMenu('.app-sidebar', 'mobileMenuBtn');
  },

  renderUserInfo() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    const avatarEl = document.getElementById('userAvatar');
    const idEl = document.getElementById('userId');
    const nameEl = document.getElementById('userDisplayName');

    if (avatarEl) avatarEl.src = Utils.getAvatarUrl(user.avatar);
    if (idEl) idEl.textContent = user.id;
    if (nameEl) nameEl.textContent = user.displayName || user.id;
  },

  renderChatHeader(friendId) {
    DB.getUser(friendId).then(friend => {
      if (!friend) return;
      const displayName = friend.displayName || friendId;
      const avatarContainer = document.getElementById('chatAvatar');
      const nameContainer = document.getElementById('chatUserName');
      const idContainer = document.getElementById('chatUserId');

      if (avatarContainer) avatarContainer.src = Utils.getAvatarUrl(friend.avatar);
      if (nameContainer) nameContainer.textContent = displayName;
      if (idContainer) idContainer.textContent = friendId;
    });
  },

  async renderChatSidebar(activeFriendId) {
    const container = document.getElementById('chatSidebarFriends');
    if (!container) return;

    const user = Utils.getCurrentUser();
    const friendIds = await DB.getFriendIds(user.id);

    if (friendIds.length === 0) {
      container.innerHTML =
        '<div class="empty-state" style="padding: 20px;">'
        + '<p style="font-size: 0.8125rem; color: var(--text-muted);">Chưa có bạn bè</p>'
        + '</div>';
      return;
    }

    const promises = friendIds.map(id => DB.getUser(id));
    const users = await Promise.all(promises);

    container.innerHTML = friendIds.map((id, i) => {
      const u = users[i];
      const displayName = Utils.escapeHtml(u && u.displayName ? u.displayName : id);
      const avatar = u ? Utils.getAvatarUrl(u.avatar) : Utils.getAvatarUrl('default');
      const isActive = id === activeFriendId;

      return '<a href="chat.html?friend=' + id + '" class="friend-item ' + (isActive ? 'active' : '') + '">'
        + '<img class="avatar avatar-sm" src="' + avatar + '" alt="">'
        + '<div class="friend-info">'
        + '<div class="friend-name">' + displayName + '</div>'
        + '<div class="friend-id">' + Utils.escapeHtml(id) + '</div>'
        + '</div>'
        + '</a>';
    }).join('');
  },

  setupMobileMenu(sidebarSelector, btnId) {
    const btn = document.getElementById(btnId);
    const sidebar = document.querySelector(sidebarSelector);
    if (btn && sidebar) {
      btn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
          if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
          }
        }
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
