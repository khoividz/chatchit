const Auth = {
  async createAnonymousAccount() {
    let id;
    let attempts = 0;

    do {
      id = Utils.generateId();
      const existing = await DB.getUser(id);
      if (!existing) break;
      attempts++;
    } while (attempts < 20);

    const user = {
      displayName: '',
      avatar: 'default',
      theme: 'light',
      soundEnabled: true,
      notificationsEnabled: true,
      createdAt: Date.now(),
    };

    await DB.createUser(id, user);

    const session = { id, ...user };
    localStorage.setItem('currentUser', JSON.stringify(session));

    return session;
  },

  async login(id) {
    if (!Utils.validateId(id)) return null;
    const data = await DB.getUser(id);
    if (!data) return null;

    const user = { id, ...data };
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem('currentUser');
  },

  async deleteAccount() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    const friendIds = await DB.getFriendIds(user.id);
    for (const fid of friendIds) {
      await DB.removeFriend(user.id, fid);
      const convId = Utils.getConversationId(user.id, fid);
      await DB.deleteConversation(convId);
    }

    await DB.deleteUserData(user.id);
    localStorage.removeItem('currentUser');
  },

  async updateProfile(updates) {
    const user = Utils.getCurrentUser();
    if (!user) return;

    await DB.updateUser(user.id, updates);

    Object.assign(user, updates);
    localStorage.setItem('currentUser', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!Utils.getCurrentUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return true;
    }
    return false;
  },
};
