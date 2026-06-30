var Auth = {
  createAnonymousAccount: async function() {
    if (!DB.isReady()) {
      throw new Error('Firebase chưa được cấu hình. Vui lòng cập nhật thông tin Firebase trong file js/db.js');
    }

    var id;
    var attempts = 0;

    while (attempts < 20) {
      id = Utils.generateId();
      try {
        var existing = await DB.getUser(id);
        if (!existing) break;
      } catch (e) {
        throw e;
      }
      attempts++;
    }

    if (attempts >= 20) {
      throw new Error('Không thể tạo ID duy nhất. Vui lòng thử lại.');
    }

    var user = {
      displayName: '',
      avatar: 'default',
      theme: 'light',
      soundEnabled: true,
      notificationsEnabled: true,
      createdAt: Date.now(),
    };

    await DB.createUser(id, user);

    var session = { id: id };
    Object.keys(user).forEach(function(k) { session[k] = user[k]; });
    localStorage.setItem('currentUser', JSON.stringify(session));

    return session;
  },

  login: async function(id) {
    if (!Utils.validateId(id)) return null;
    try {
      var data = await DB.getUser(id);
      if (!data) return null;
      var user = { id: id };
      Object.keys(data).forEach(function(k) { user[k] = data[k]; });
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (e) {
      console.error('Login failed:', e);
      return null;
    }
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
