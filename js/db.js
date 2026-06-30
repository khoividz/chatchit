const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const DB = {
  // ==================== USERS ====================
  async createUser(userId, data) {
    await db.ref('users/' + userId).set(data);
  },

  async getUser(userId) {
    const snap = await db.ref('users/' + userId).once('value');
    return snap.val();
  },

  async updateUser(userId, data) {
    await db.ref('users/' + userId).update(data);
  },

  async deleteUser(userId) {
    await db.ref('users/' + userId).remove();
  },

  async getAllUsers() {
    const snap = await db.ref('users').once('value');
    const data = snap.val();
    return data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
  },

  onUsers(callback) {
    const ref = db.ref('users');
    const handler = (snap) => {
      const data = snap.val();
      callback(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  onUser(userId, callback) {
    const ref = db.ref('users/' + userId);
    const handler = (snap) => callback(snap.val());
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  // ==================== FRIEND REQUESTS ====================
  async sendFriendRequest(request) {
    const ref = await db.ref('friendRequests').push(request);
    return ref.key;
  },

  async getFriendRequestsForUser(userId) {
    const snap = await db.ref('friendRequests')
      .orderByChild('to')
      .equalTo(userId)
      .once('value');
    const data = snap.val();
    return data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
  },

  onFriendRequestsForUser(userId, callback) {
    const ref = db.ref('friendRequests')
      .orderByChild('to')
      .equalTo(userId);
    const handler = (snap) => {
      const data = snap.val();
      callback(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  async getSentRequests(userId) {
    const snap = await db.ref('friendRequests')
      .orderByChild('from')
      .equalTo(userId)
      .once('value');
    const data = snap.val();
    return data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
  },

  async updateFriendRequest(requestId, data) {
    await db.ref('friendRequests/' + requestId).update(data);
  },

  async removeFriendRequest(requestId) {
    await db.ref('friendRequests/' + requestId).remove();
  },

  // ==================== FRIENDS ====================
  async addFriend(userId, friendId) {
    await Promise.all([
      db.ref('friends/' + userId + '/' + friendId).set(true),
      db.ref('friends/' + friendId + '/' + userId).set(true),
    ]);
  },

  async removeFriend(userId, friendId) {
    await Promise.all([
      db.ref('friends/' + userId + '/' + friendId).remove(),
      db.ref('friends/' + friendId + '/' + userId).remove(),
    ]);
  },

  async getFriendIds(userId) {
    const snap = await db.ref('friends/' + userId).once('value');
    const data = snap.val();
    return data ? Object.keys(data) : [];
  },

  onFriendIds(userId, callback) {
    const ref = db.ref('friends/' + userId);
    const handler = (snap) => {
      const data = snap.val();
      callback(data ? Object.keys(data) : []);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  // ==================== MESSAGES ====================
  async sendMessage(conversationId, message) {
    const ref = await db.ref('messages/' + conversationId).push(message);
    return ref.key;
  },

  async getMessages(conversationId) {
    const snap = await db.ref('messages/' + conversationId)
      .orderByChild('timestamp')
      .once('value');
    const data = snap.val();
    return data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
  },

  onMessages(conversationId, callback) {
    const ref = db.ref('messages/' + conversationId)
      .orderByChild('timestamp');
    const handler = (snap) => {
      const data = snap.val();
      callback(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  async markAllMessagesAsSeen(conversationId, userId) {
    const snap = await db.ref('messages/' + conversationId).once('value');
    const data = snap.val();
    if (!data) return;

    const updates = {};
    Object.keys(data).forEach(key => {
      if (data[key].from !== userId && !data[key].seen) {
        updates[key + '/seen'] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      await db.ref('messages/' + conversationId).update(updates);
    }
  },

  async deleteConversation(conversationId) {
    await db.ref('messages/' + conversationId).remove();
  },

  // ==================== TYPING ====================
  setTyping(conversationId, userId, isTyping) {
    return db.ref('typing/' + conversationId).set({
      userId,
      isTyping,
      timestamp: Date.now(),
    });
  },

  onTyping(conversationId, callback) {
    const ref = db.ref('typing/' + conversationId);
    const handler = (snap) => callback(snap.val());
    ref.on('value', handler);
    return () => ref.off('value', handler);
  },

  // ==================== CLEANUP ====================
  async deleteUserData(userId) {
    await db.ref('users/' + userId).remove();
    await db.ref('friends/' + userId).remove();

    const snap = await db.ref('friendRequests').once('value');
    const reqs = snap.val();
    if (reqs) {
      const removes = [];
      Object.keys(reqs).forEach(key => {
        if (reqs[key].from === userId || reqs[key].to === userId) {
          removes.push(db.ref('friendRequests/' + key).remove());
        }
      });
      await Promise.all(removes);
    }
  },
};
