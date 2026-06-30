var Auth = {
  async register(username, password) {
    if (!DB.isReady()) {
      throw new Error('Firebase chưa được cấu hình.');
    }

    username = username.trim().toLowerCase();
    if (!username || username.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new Error('Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới');
    }
    if (!password || password.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự');
    }

    var existing = await DB.getUserIdByUsername(username);
    if (existing) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }

    var id;
    var attempts = 0;
    while (attempts < 30) {
      id = Utils.generateId();
      var userData = await DB.getUser(id);
      if (!userData) break;
      attempts++;
    }
    if (attempts >= 30) {
      throw new Error('Không thể tạo ID. Vui lòng thử lại.');
    }

    var user = {
      username: username,
      password: password,
      displayName: '',
      avatar: 'default',
      theme: 'light',
      soundEnabled: true,
      notificationsEnabled: true,
      createdAt: Date.now(),
    };

    await DB.createUser(id, user);
    await DB.setUsernameIndex(username, id);

    var session = { id: id };
    Object.keys(user).forEach(function(k) { session[k] = user[k]; });
    localStorage.setItem('currentUser', JSON.stringify(session));

    return session;
  },

  async login(username, password) {
    username = username.trim().toLowerCase();
    if (!username) throw new Error('Vui lòng nhập tên đăng nhập');
    if (!password) throw new Error('Vui lòng nhập mật khẩu');

    var userId = await DB.getUserIdByUsername(username);
    if (!userId) {
      throw new Error('Tên đăng nhập không tồn tại');
    }

    var data = await DB.getUser(userId);
    if (!data) {
      throw new Error('Tài khoản không tồn tại');
    }
    if (data.password !== password) {
      throw new Error('Mật khẩu không đúng');
    }

    var user = { id: userId };
    Object.keys(data).forEach(function(k) { user[k] = data[k]; });
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  logout: function() {
    localStorage.removeItem('currentUser');
  },

  deleteAccount: async function() {
    var user = Utils.getCurrentUser();
    if (!user) return;

    try {
      var friendIds = await DB.getFriendIds(user.id);
      for (var i = 0; i < friendIds.length; i++) {
        await DB.removeFriend(user.id, friendIds[i]);
        var convId = Utils.getConversationId(user.id, friendIds[i]);
        await DB.deleteConversation(convId);
      }

      if (user.username) {
        await DB.removeUsernameIndex(user.username);
      }
      await DB.deleteUserData(user.id);
      localStorage.removeItem('currentUser');
    } catch (e) {
      console.error('Delete account failed:', e);
      throw e;
    }
  },

  updateProfile: async function(updates) {
    var user = Utils.getCurrentUser();
    if (!user) return;

    try {
      await DB.updateUser(user.id, updates);
      Object.keys(updates).forEach(function(k) { user[k] = updates[k]; });
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (e) {
      console.error('Update profile failed:', e);
      throw e;
    }
  },

  isLoggedIn: function() {
    return !!Utils.getCurrentUser();
  },

  requireAuth: function() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  redirectIfLoggedIn: function() {
    if (this.isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return true;
    }
    return false;
  },
};
