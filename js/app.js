var App = {
  unsubFriendIds: null,
  messageUnsubs: {},
  _lastFriends: null,

  init: function() {
    var user = Utils.getCurrentUser();
    if (user && user.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    }

    var path = window.location.pathname.split('/').pop() || 'index.html';

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

  initLanding: function() {
    if (Auth.redirectIfLoggedIn()) return;

    var createBtn = document.getElementById('createAccountBtn');
    if (!createBtn) return;

    createBtn.addEventListener('click', async function() {
      if (createBtn.disabled) return;

      createBtn.disabled = true;
      createBtn.textContent = 'Đang tạo...';

      if (!DB.isReady() || !DB.isConfigured()) {
        Utils.showToast('Chưa cấu hình Firebase. Vui lòng cập nhật thông tin Firebase trong file js/db.js', 'error');
        createBtn.disabled = false;
        createBtn.textContent = 'Tạo tài khoản ẩn danh';
        return;
      }

      try {
        await Auth.createAnonymousAccount();
        Utils.showToast('Tạo tài khoản thành công!', 'success');
        window.location.href = 'dashboard.html';
      } catch (e) {
        var msg = e && e.message ? e.message : 'Có lỗi xảy ra, vui lòng thử lại';
        Utils.showToast(msg, 'error');
        createBtn.disabled = false;
        createBtn.textContent = 'Tạo tài khoản ẩn danh';
      }
    });
  },

  initDashboard: async function() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    Notifications.init();

    if (!DB.isReady()) {
      Utils.showToast('Lỗi kết nối cơ sở dữ liệu. Vui lòng kiểm tra cấu hình.', 'error');
      return;
    }

    this.setupFriendsSubscription();
    this.setupSearchHandlers();
    this.setupMobileMenu('.app-sidebar', 'mobileMenuBtn');
    this.setupGroupHandlers();
  },

  setupFriendsSubscription: function() {
    var self = this;
    var user = Utils.getCurrentUser();
    if (!user) return;

    if (this.unsubFriendIds) this.unsubFriendIds();

    this.unsubFriendIds = DB.onFriendIds(user.id, function(friendIds) {
      self.loadAndRenderFriends(friendIds);
    });
  },

  loadAndRenderFriends: async function(friendIds) {
    var user = Utils.getCurrentUser();
    if (!user) return;

    this.unsubscribeMessageListeners();

    var friends = [];
    if (friendIds.length > 0) {
      var promises = friendIds.map(function(id) { return DB.getUser(id); });
      var users = await Promise.all(promises);
      friends = friendIds.map(function(id, i) {
        var u = users[i];
        return u
          ? { id: id, displayName: u.displayName || '', avatar: u.avatar || 'default' }
          : { id: id, displayName: '', avatar: 'default' };
      }).filter(Boolean);
    }

    this._lastFriends = friends;
    this.renderFriendsList(friends);
    this.setupMessageListeners(friendIds);
    Groups.renderGroupList();
  },

  setupMessageListeners: function(friendIds) {
    var self = this;
    var user = Utils.getCurrentUser();
    if (!user) return;

    friendIds.forEach(function(id) {
      var convId = Utils.getConversationId(user.id, id);
      var unsub = DB.onMessages(convId, function(messages) {
        var unread = 0;
        if (messages) {
          unread = messages.filter(function(m) { return m.from !== user.id && !m.seen; }).length;
        }
        var overrides = {};
        overrides[id] = unread;
        self.renderFriendsList(null, overrides);
      });
      self.messageUnsubs[convId] = unsub;
    });
  },

  unsubscribeMessageListeners: function() {
    var self = this;
    Object.keys(this.messageUnsubs).forEach(function(key) {
      if (self.messageUnsubs[key]) self.messageUnsubs[key]();
    });
    this.messageUnsubs = {};
  },

  renderFriendsList: function(friends, unreadOverrides) {
    var sidebarContainer = document.getElementById('friendsList');
    var mainContainer = document.getElementById('friendsListContainer');

    if (!sidebarContainer && !mainContainer) return;

    var emptyHtml =
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

    var list = friends || this._lastFriends || [];

    if (sidebarContainer) {
      if (list.length === 0) {
        sidebarContainer.innerHTML = emptyHtml;
      } else {
        sidebarContainer.innerHTML = list.map(function(f) {
          return App._friendItemHtml(f, unreadOverrides);
        }).join('');
      }
    }

    if (mainContainer) {
      if (list.length === 0) {
        mainContainer.innerHTML = emptyHtml;
      } else {
        mainContainer.innerHTML = list.map(function(f) {
          return App._friendCardHtml(f, unreadOverrides);
        }).join('');
      }
    }
  },

  _friendItemHtml: function(f, unreadOverrides) {
    var unread = unreadOverrides && unreadOverrides[f.id] !== undefined ? unreadOverrides[f.id] : 0;
    var displayName = Utils.escapeHtml(f.displayName || f.id);
    var avatar = Utils.getAvatarUrl(f.avatar);

    return '<div class="friend-item" onclick="window.location.href=\'chat.html?friend=' + f.id + '\'">'
      + '<img class="avatar avatar-sm" src="' + avatar + '" alt="">'
      + '<div class="friend-info">'
      + '<div class="friend-name">' + displayName + '</div>'
      + '<div class="friend-id">' + Utils.escapeHtml(f.id) + '</div>'
      + '</div>'
      + (unread > 0 ? '<span class="badge">' + unread + '</span>' : '')
      + '</div>';
  },

  _friendCardHtml: function(f, unreadOverrides) {
    var unread = unreadOverrides && unreadOverrides[f.id] !== undefined ? unreadOverrides[f.id] : 0;
    var displayName = Utils.escapeHtml(f.displayName || f.id);
    var avatar = Utils.getAvatarUrl(f.avatar);

    return '<div class="friend-card" onclick="window.location.href=\'chat.html?friend=' + f.id + '\'">'
      + '<img class="avatar" src="' + avatar + '" alt="">'
      + '<div class="friend-details">'
      + '<div class="friend-name-display">' + displayName + '</div>'
      + '<div class="friend-id-display">' + Utils.escapeHtml(f.id) + '</div>'
      + '</div>'
      + '<div style="display: flex; align-items: center; gap: 8px;">'
      + (unread > 0 ? '<span class="badge">' + unread + '</span>' : '')
      + '<span class="btn btn-primary btn-sm">Nhắn tin</span>'
      + '</div></div>';
  },

  setupSearchHandlers: function() {
    var searchBtn = document.getElementById('searchBtn');
    var searchInput = document.getElementById('searchInput');
    var searchResult = document.getElementById('searchResult');

    if (!searchBtn || !searchInput) return;

    var performSearch = async function() {
      var query = searchInput.value.trim();
      if (!query) { searchResult.innerHTML = ''; return; }

      try {
        var user = await Friends.searchUser(query);
        var currentUser = Utils.getCurrentUser();

        if (!user) {
          searchResult.innerHTML = '<p class="not-found">Không tìm thấy người dùng với ID này</p>';
          return;
        }

        if (user.id === currentUser.id) {
          searchResult.innerHTML = '<p class="not-found">Đây là ID của bạn</p>';
          return;
        }

        var friendIds = await DB.getFriendIds(currentUser.id);
        var isFriend = friendIds.indexOf(user.id) !== -1;

        var sentReqs = await DB.getSentRequests(currentUser.id);
        var hasPending = sentReqs.some(function(r) { return r.to === user.id && r.status === 'pending'; });

        var displayName = Utils.escapeHtml(user.displayName || user.id);

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
      } catch (e) {
        searchResult.innerHTML = '<p class="not-found">Lỗi kết nối: ' + Utils.escapeHtml(e.message || 'Không thể kết nối đến máy chủ') + '</p>';
      }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') performSearch();
    });
  },

  sendFriendRequest: async function(targetId) {
    try {
      var result = await Friends.sendFriendRequest(targetId);

      if (result.success) {
        Utils.showToast('Đã gửi lời mời kết bạn', 'success');
        var btn = document.querySelector('.search-result .btn');
        if (btn) {
          btn.textContent = 'Đã gửi lời mời';
          btn.className = 'btn btn-sm btn-secondary';
          btn.style.pointerEvents = 'none';
          btn.onclick = null;
        }
      } else {
        var messages = {
          self_request: 'Không thể gửi lời mời cho chính mình',
          invalid_id: 'ID không hợp lệ',
          user_not_found: 'Không tìm thấy người dùng',
          already_friends: 'Đã là bạn bè',
          request_pending: 'Đã gửi lời mời trước đó',
          not_logged_in: 'Vui lòng đăng nhập',
        };
        Utils.showToast(messages[result.error] || 'Có lỗi xảy ra', 'error');
      }
    } catch (e) {
      Utils.showToast(e.message || 'Lỗi kết nối đến máy chủ', 'error');
    }
  },

  initChat: async function() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();

    var params = new URLSearchParams(window.location.search);
    var friendId = params.get('friend');
    var groupId = params.get('group');

    if (groupId) {
      await this.initGroupChat(groupId);
      return;
    }

    if (!friendId || !Utils.validateId(friendId)) {
      window.location.href = 'dashboard.html';
      return;
    }

    try {
      var currentUser = Utils.getCurrentUser();
      var friendIds = await DB.getFriendIds(currentUser.id);

      if (friendIds.indexOf(friendId) === -1) {
        window.location.href = 'dashboard.html';
        return;
      }

      this.renderChatHeader(friendId);
      Chat.openChat(friendId);

      var convId = Utils.getConversationId(currentUser.id, friendId);
      var wallpaperBtn = document.getElementById('wallpaperBtn');
      if (wallpaperBtn) {
        wallpaperBtn.addEventListener('click', function() {
          Wallpaper.openSettings(convId);
        });
      }
      Wallpaper.applyWallpaper(convId);

      var backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          window.location.href = 'dashboard.html';
        });
      }

      this.setupMobileMenu('.app-sidebar', 'sidebarToggle');
      this.renderChatSidebar(friendId);
    } catch (e) {
      Utils.showToast('Lỗi kết nối: ' + (e.message || ''), 'error');
    }
  },

  initGroupChat: async function(groupId) {
    try {
      var currentUser = Utils.getCurrentUser();
      var group = await Groups.getGroup(groupId);
      if (!group || !group.members || !group.members[currentUser.id]) {
        window.location.href = 'dashboard.html';
        return;
      }

      this.renderGroupChatHeader(group);
      Groups.openGroupChat(groupId);

      var convId = 'group_' + groupId;
      var wallpaperBtn = document.getElementById('wallpaperBtn');
      if (wallpaperBtn) {
        wallpaperBtn.addEventListener('click', function() {
          Wallpaper.openSettings(convId);
        });
      }
      Wallpaper.applyWallpaper(convId);

      var backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          window.location.href = 'dashboard.html';
        });
      }

      this.setupMobileMenu('.app-sidebar', 'sidebarToggle');
      this.renderChatSidebar();
    } catch (e) {
      Utils.showToast('Lỗi kết nối: ' + (e.message || ''), 'error');
    }
  },

  renderGroupChatHeader: function(group) {
    var avatarContainer = document.getElementById('chatAvatar');
    var nameContainer = document.getElementById('chatUserName');
    var idContainer = document.getElementById('chatUserId');
    if (avatarContainer) {
      avatarContainer.src = 'assets/images/avatar-default.svg';
      avatarContainer.style.borderRadius = '12px';
    }
    if (nameContainer) nameContainer.textContent = group.name || 'Nhóm';
    if (idContainer) {
      var memberCount = group.members ? Object.keys(group.members).length : 0;
      idContainer.textContent = memberCount + ' thành viên';
    }
  },

  initSettings: function() {
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    Settings.init();
    Notifications.init();
    this.setupMobileMenu('.app-sidebar', 'mobileMenuBtn');
  },

  renderUserInfo: function() {
    var user = Utils.getCurrentUser();
    if (!user) return;

    var avatarEl = document.getElementById('userAvatar');
    var idEl = document.getElementById('userId');
    var nameEl = document.getElementById('userDisplayName');

    if (avatarEl) avatarEl.src = Utils.getAvatarUrl(user.avatar);
    if (idEl) idEl.textContent = user.id;
    if (nameEl) nameEl.textContent = user.displayName || user.id;
  },

  renderChatHeader: function(friendId) {
    DB.getUser(friendId).then(function(friend) {
      if (!friend) return;
      var displayName = friend.displayName || friendId;
      var avatarContainer = document.getElementById('chatAvatar');
      var nameContainer = document.getElementById('chatUserName');
      var idContainer = document.getElementById('chatUserId');

      if (avatarContainer) avatarContainer.src = Utils.getAvatarUrl(friend.avatar);
      if (nameContainer) nameContainer.textContent = displayName;
      if (idContainer) idContainer.textContent = friendId;
    }).catch(function() {});
  },

  renderChatSidebar: async function(activeFriendId) {
    var container = document.getElementById('chatSidebarFriends');
    if (!container) return;

    try {
      var user = Utils.getCurrentUser();
      var friendIds = await DB.getFriendIds(user.id);

      if (friendIds.length === 0) {
        container.innerHTML =
          '<div class="empty-state" style="padding: 20px;">'
          + '<p style="font-size: 0.8125rem; color: var(--text-muted);">Chưa có bạn bè</p>'
          + '</div>';
        return;
      }

      var promises = friendIds.map(function(id) { return DB.getUser(id); });
      var users = await Promise.all(promises);

      container.innerHTML = friendIds.map(function(id, i) {
        var u = users[i];
        var displayName = Utils.escapeHtml(u && u.displayName ? u.displayName : id);
        var avatar = u ? Utils.getAvatarUrl(u.avatar) : Utils.getAvatarUrl('default');
        var isActive = id === activeFriendId;

        return '<a href="chat.html?friend=' + id + '" class="friend-item ' + (isActive ? 'active' : '') + '">'
          + '<img class="avatar avatar-sm" src="' + avatar + '" alt="">'
          + '<div class="friend-info">'
          + '<div class="friend-name">' + displayName + '</div>'
          + '<div class="friend-id">' + Utils.escapeHtml(id) + '</div>'
          + '</div>'
          + '</a>';
      }).join('');
    } catch (e) {
      container.innerHTML = '<p style="padding: 20px; color: var(--text-muted); font-size: 0.875rem;">Lỗi tải danh sách bạn bè</p>';
    }
  },

  setupGroupHandlers: function() {
    var createBtn = document.getElementById('createGroupBtn');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        Groups.showCreateModal();
      });
    }
  },

  setupMobileMenu: function(sidebarSelector, btnId) {
    var btn = document.getElementById(btnId);
    var sidebar = document.querySelector(sidebarSelector);
    if (btn && sidebar) {
      btn.addEventListener('click', function() {
        sidebar.classList.toggle('mobile-open');
      });
      document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
          if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
          }
        }
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
