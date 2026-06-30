const Auth = {
  createAnonymousAccount() {
    let id;
    let users = Utils.getUsers();

    do {
      id = Utils.generateId();
    } while (users.find(u => u.id === id));

    const user = {
      id,
      displayName: '',
      avatar: 'default',
      theme: 'light',
      soundEnabled: true,
      notificationsEnabled: true,
      createdAt: Date.now(),
    };

    users.push({ id, displayName: '', avatar: 'default' });
    Utils.saveUsers(users);

    localStorage.setItem('currentUser', JSON.stringify(user));

    Utils.broadcast({ type: 'user-created', userId: id });

    return user;
  },

  login(id) {
    if (!Utils.validateId(id)) return null;

    const users = Utils.getUsers();
    const found = users.find(u => u.id === id);
    if (!found) return null;

    let userData = localStorage.getItem('currentUser_' + id);
    let user;
    if (userData) {
      user = JSON.parse(userData);
    } else {
      user = {
        id: found.id,
        displayName: found.displayName || '',
        avatar: found.avatar || 'default',
        theme: 'light',
        soundEnabled: true,
        notificationsEnabled: true,
        createdAt: Date.now(),
      };
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  logout() {
    const user = Utils.getCurrentUser();
    if (user) {
      localStorage.removeItem('currentUser');
    }
  },

  deleteAccount() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    const userId = user.id;

    let users = Utils.getUsers();
    users = users.filter(u => u.id !== userId);
    Utils.saveUsers(users);

    let friends = Utils.getFriends();
    delete friends[userId];
    Object.keys(friends).forEach(friendId => {
      if (friends[friendId]) {
        friends[friendId] = friends[friendId].filter(id => id !== userId);
      }
    });
    Utils.saveFriends(friends);

    let requests = Utils.getFriendRequests();
    requests = requests.filter(r => r.from !== userId && r.to !== userId);
    Utils.saveFriendRequests(requests);

    const allMessages = Object.keys(localStorage).filter(k => k.startsWith('messages_'));
    allMessages.forEach(k => {
      if (k.includes(userId)) {
        localStorage.removeItem(k);
      }
    });

    localStorage.removeItem('currentUser');

    Utils.broadcast({ type: 'user-deleted', userId });
  },

  updateProfile(updates) {
    const user = Utils.getCurrentUser();
    if (!user) return;

    Object.assign(user, updates);
    localStorage.setItem('currentUser', JSON.stringify(user));

    let users = Utils.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].displayName = user.displayName || '';
      users[idx].avatar = user.avatar || 'default';
      Utils.saveUsers(users);
    }

    Utils.broadcast({ type: 'user-update', userId: user.id, updates });
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
