const App = {
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
      createBtn.addEventListener('click', () => {
        createBtn.disabled = true;
        createBtn.textContent = 'Đang tạo...';

        setTimeout(() => {
          const user = Auth.createAnonymousAccount();
          Utils.showToast('Tạo tài khoản thành công!', 'success');
          window.location.href = 'dashboard.html';
        }, 600);
      });
    }
  },

  initDashboard() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    this.renderFriendsList();

    Notifications.init();

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResult = document.getElementById('searchResult');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.app-sidebar');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });

      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
          if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
          }
        }
      });
    }

    if (searchBtn && searchInput) {
      const performSearch = () => {
        const query = searchInput.value.trim();
        if (!query) {
          searchResult.innerHTML = '';
          return;
        }

        const user = Friends.searchUser(query);
        const currentUser = Utils.getCurrentUser();

        if (!user) {
          searchResult.innerHTML = '<p class="not-found">Không tìm thấy người dùng với ID này</p>';
          return;
        }

        if (user.id === currentUser.id) {
          searchResult.innerHTML = '<p class="not-found">Đây là ID của bạn</p>';
          return;
        }

        const friends = Utils.getFriends();
        const isFriend = friends[currentUser.id] && friends[currentUser.id].includes(user.id);
        const sentRequests = Friends.getSentRequests();
        const hasPending = sentRequests.some(r => r.to === user.id);

        searchResult.innerHTML = `
          <div class="search-result">
            <img class="avatar" src="${Utils.getAvatarUrl(user.avatar)}" alt="">
            <div class="user-info">
              <div class="user-id-display">${Utils.escapeHtml(user.displayName || user.id)}</div>
              <div class="user-id-label">${Utils.escapeHtml(user.id)}</div>
            </div>
            ${isFriend
              ? '<span class="btn btn-sm btn-secondary" style="pointer-events: none;">Đã là bạn bè</span>'
              : hasPending
                ? '<span class="btn btn-sm btn-secondary" style="pointer-events: none;">Đã gửi lời mời</span>'
                : `<button class="btn btn-primary btn-sm" onclick="App.sendFriendRequest('${user.id}')">Kết bạn</button>`
            }
          </div>
        `;
      };

      searchBtn.addEventListener('click', performSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    Utils.listenBroadcast((data) => {
      if (['friend-request', 'friend-accept', 'friend-removed', 'user-update', 'new-message'].includes(data.type)) {
        this.renderFriendsList();
        Notifications.renderPanel();
        Notifications.renderBell();
      }
    });
  },

  initChat() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();

    const params = new URLSearchParams(window.location.search);
    const friendId = params.get('friend');

    if (!friendId || !Utils.validateId(friendId)) {
      window.location.href = 'dashboard.html';
      return;
    }

    const currentUser = Utils.getCurrentUser();
    const friends = Utils.getFriends();
    const friendList = friends[currentUser.id] || [];

    if (!friendList.includes(friendId)) {
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

    const settingsBtn = document.getElementById('chatSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        window.location.href = 'settings.html';
      });
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    this.renderChatSidebar(friendId);
  },

  initSettings() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    Settings.init();
    Notifications.init();

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.app-sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
          if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
          }
        }
      });
    }
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

  renderFriendsList() {
    const sidebarContainer = document.getElementById('friendsList');
    const mainContainer = document.getElementById('friendsListContainer');

    const friends = Friends.getFriendsList();
    const currentUser = Utils.getCurrentUser();

    const emptyHtml = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h3>Chưa có bạn bè</h3>
        <p>Tìm kiếm bạn bè bằng ID và gửi lời mời kết bạn</p>
      </div>
    `;

    const friendCardHtml = (f, compact) => {
      const unread = Chat.getUnreadCount(f.id);
      const displayName = f.displayName || f.id;

      if (compact) {
        return `
          <a href="chat.html?friend=${f.id}" class="friend-item">
            <img class="avatar avatar-sm" src="${Utils.getAvatarUrl(f.avatar)}" alt="">
            <div class="friend-info">
              <div class="friend-name">${Utils.escapeHtml(displayName)}</div>
              <div class="friend-id">${Utils.escapeHtml(f.id)}</div>
            </div>
            ${unread > 0 ? `<span class="badge">${unread}</span>` : ''}
          </a>
        `;
      }

      return `
        <a href="chat.html?friend=${f.id}" class="friend-card">
          <img class="avatar" src="${Utils.getAvatarUrl(f.avatar)}" alt="">
          <div class="friend-details">
            <div class="friend-name-display">${Utils.escapeHtml(displayName)}</div>
            <div class="friend-id-display">${Utils.escapeHtml(f.id)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${unread > 0 ? `<span class="badge">${unread}</span>` : ''}
            <span class="btn btn-primary btn-sm">Nhắn tin</span>
          </div>
        </a>
      `;
    };

    if (sidebarContainer) {
      if (friends.length === 0) {
        sidebarContainer.innerHTML = emptyHtml;
      } else {
        sidebarContainer.innerHTML = friends.map(f => friendCardHtml(f, true)).join('');
      }
    }

    if (mainContainer) {
      if (friends.length === 0) {
        mainContainer.innerHTML = emptyHtml;
      } else {
        mainContainer.innerHTML = friends.map(f => friendCardHtml(f, false)).join('');
      }
    }
  },

  renderChatHeader(friendId) {
    const friend = Friends.searchUser(friendId);
    if (!friend) return;

    const displayName = friend.displayName || friendId;
    const avatarContainer = document.getElementById('chatAvatar');
    const nameContainer = document.getElementById('chatUserName');
    const idContainer = document.getElementById('chatUserId');

    if (avatarContainer) avatarContainer.src = Utils.getAvatarUrl(friend.avatar);
    if (nameContainer) nameContainer.textContent = displayName;
    if (idContainer) idContainer.textContent = friendId;
  },

  renderChatSidebar(activeFriendId) {
    const container = document.getElementById('chatSidebarFriends');
    if (!container) return;

    const friends = Friends.getFriendsList();

    container.innerHTML = friends.map(f => {
      const isActive = f.id === activeFriendId;
      const displayName = f.displayName || f.id;
      const unread = Chat.getUnreadCount(f.id);

      return `
        <a href="chat.html?friend=${f.id}" class="friend-item ${isActive ? 'active' : ''}">
          <img class="avatar avatar-sm" src="${Utils.getAvatarUrl(f.avatar)}" alt="">
          <div class="friend-info">
            <div class="friend-name">${Utils.escapeHtml(displayName)}</div>
            <div class="friend-id">${Utils.escapeHtml(f.id)}</div>
          </div>
          ${unread > 0 ? `<span class="badge">${unread}</span>` : ''}
        </a>
      `;
    }).join('');
  },

  async sendFriendRequest(targetId) {
    const result = Friends.sendFriendRequest(targetId);

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
};

document.addEventListener('DOMContentLoaded', () => App.init());
