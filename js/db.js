var _db = null;
var _connected = false;
var _hasRealConfig = false;

var _config = {
  apiKey: 'AIzaSyCFTcxuR1rNHkX5eUhwg0z9E5HchO7zcJI',
  authDomain: 'chatchit-fd02a.firebaseapp.com',
  databaseURL: 'https://chatchit-fd02a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'chatchit-fd02a',
  storageBucket: 'chatchit-fd02a.firebasestorage.app',
  messagingSenderId: '186579020173',
  appId: '1:186579020173:web:9bb628ee6a5d981b85f5c4',
};

_hasRealConfig = _config.apiKey && _config.apiKey !== 'YOUR_API_KEY';

if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded. Check CDN script tags.');
} else {
  try {
    firebase.initializeApp(_config);
    _db = firebase.database();

    if (_hasRealConfig) {
      _db.ref('.info/connected').once('value').then(function(snap) {
        _connected = snap.val() === true;
      }).catch(function() {
        _connected = false;
      });
    } else {
      console.warn('Firebase: using placeholder config. Update js/db.js with your Firebase project config.');
    }
  } catch (e) {
    console.error('Firebase init failed:', e);
  }
}

var FB_TIMEOUT = 8000;

function fbRef(path) {
  return _db ? _db.ref(path) : null;
}

function fbOnce(ref) {
  if (!ref) return Promise.reject(new Error('Firebase not initialized'));
  return Utils.withTimeout(ref.once('value'), FB_TIMEOUT)
    .catch(function(err) {
      if (err && err.message === 'timeout') {
        return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình Firebase.'));
      }
      return Promise.reject(err);
    });
}

function fbSet(ref, val) {
  if (!ref) return Promise.reject(new Error('Firebase not initialized'));
  return Utils.withTimeout(ref.set(val), FB_TIMEOUT)
    .catch(function(err) {
      if (err && err.message === 'timeout') {
        return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình Firebase.'));
      }
      return Promise.reject(err);
    });
}

function fbUpdate(ref, val) {
  if (!ref) return Promise.reject(new Error('Firebase not initialized'));
  return Utils.withTimeout(ref.update(val), FB_TIMEOUT)
    .catch(function(err) {
      if (err && err.message === 'timeout') {
        return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình Firebase.'));
      }
      return Promise.reject(err);
    });
}

function fbPush(ref, val) {
  if (!ref) return Promise.reject(new Error('Firebase not initialized'));
  return Utils.withTimeout(ref.push(val), FB_TIMEOUT)
    .catch(function(err) {
      if (err && err.message === 'timeout') {
        return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình Firebase.'));
      }
      return Promise.reject(err);
    });
}

function fbRemove(ref) {
  if (!ref) return Promise.reject(new Error('Firebase not initialized'));
  return Utils.withTimeout(ref.remove(), FB_TIMEOUT)
    .catch(function(err) {
      if (err && err.message === 'timeout') {
        return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình Firebase.'));
      }
      return Promise.reject(err);
    });
}

var DB = {
  isReady: function() {
    return _db !== null;
  },

  isConfigured: function() {
    return _hasRealConfig;
  },

  isConnected: function() {
    return _connected;
  },

  // ==================== USERS ====================
  createUser: async function(userId, data) {
    await fbSet(fbRef('users/' + userId), data);
  },

  getUser: async function(userId) {
    var snap = await fbOnce(fbRef('users/' + userId));
    return snap ? snap.val() : null;
  },

  updateUser: async function(userId, data) {
    await fbUpdate(fbRef('users/' + userId), data);
  },

  deleteUser: async function(userId) {
    await fbRemove(fbRef('users/' + userId));
  },

  getAllUsers: async function() {
    var snap = await fbOnce(fbRef('users'));
    var data = snap ? snap.val() : null;
    if (!data) return [];
    return Object.keys(data).map(function(k) {
      return { id: k, displayName: data[k].displayName || '', avatar: data[k].avatar || 'default' };
    });
  },

  onUsers: function(callback) {
    if (!_db) return function() {};
    var ref = _db.ref('users');
    var handler = function(snap) {
      var data = snap.val();
      callback(data ? Object.keys(data).map(function(k) {
        return { id: k, displayName: data[k].displayName || '', avatar: data[k].avatar || 'default' };
      }) : []);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  onUser: function(userId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('users/' + userId);
    var handler = function(snap) { callback(snap.val()); };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== FRIEND REQUESTS ====================
  sendFriendRequest: async function(request) {
    var ref = await fbPush(fbRef('friendRequests'), request);
    return ref ? ref.key : null;
  },

  getFriendRequestsForUser: async function(userId) {
    var snap = await fbOnce(
      fbRef('friendRequests').orderByChild('to').equalTo(userId)
    );
    var data = snap ? snap.val() : null;
    if (!data) return [];
    return Object.keys(data).map(function(k) {
      return { id: k, from: data[k].from, fromDisplayName: data[k].fromDisplayName, to: data[k].to, status: data[k].status, createdAt: data[k].createdAt };
    });
  },

  onFriendRequestsForUser: function(userId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('friendRequests').orderByChild('to').equalTo(userId);
    var handler = function(snap) {
      var data = snap.val();
      callback(data ? Object.keys(data).map(function(k) {
        return { id: k, from: data[k].from, fromDisplayName: data[k].fromDisplayName, to: data[k].to, status: data[k].status, createdAt: data[k].createdAt };
      }) : []);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  getSentRequests: async function(userId) {
    var snap = await fbOnce(
      fbRef('friendRequests').orderByChild('from').equalTo(userId)
    );
    var data = snap ? snap.val() : null;
    if (!data) return [];
    return Object.keys(data).map(function(k) {
      return { id: k, from: data[k].from, to: data[k].to, status: data[k].status };
    });
  },

  updateFriendRequest: async function(requestId, data) {
    await fbUpdate(fbRef('friendRequests/' + requestId), data);
  },

  getFriendRequest: async function(requestId) {
    var snap = await fbOnce(fbRef('friendRequests/' + requestId));
    return snap ? snap.val() : null;
  },

  // ==================== FRIENDS ====================
  addFriend: async function(userId, friendId) {
    await Promise.all([
      fbSet(fbRef('friends/' + userId + '/' + friendId), true),
      fbSet(fbRef('friends/' + friendId + '/' + userId), true),
    ]);
  },

  removeFriend: async function(userId, friendId) {
    await Promise.all([
      fbRemove(fbRef('friends/' + userId + '/' + friendId)),
      fbRemove(fbRef('friends/' + friendId + '/' + userId)),
    ]);
  },

  getFriendIds: async function(userId) {
    var snap = await fbOnce(fbRef('friends/' + userId));
    var data = snap ? snap.val() : null;
    return data ? Object.keys(data) : [];
  },

  onFriendIds: function(userId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('friends/' + userId);
    var handler = function(snap) {
      var data = snap.val();
      callback(data ? Object.keys(data) : []);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== MESSAGES ====================
  sendMessage: async function(conversationId, message) {
    var ref = await fbPush(fbRef('messages/' + conversationId), message);
    return ref ? ref.key : null;
  },

  getMessages: async function(conversationId) {
    var snap = await fbOnce(
      fbRef('messages/' + conversationId).orderByChild('timestamp')
    );
    var data = snap ? snap.val() : null;
    if (!data) return [];
    return Object.keys(data).map(function(k) {
      return { id: k, from: data[k].from, text: data[k].text, timestamp: data[k].timestamp, seen: data[k].seen || false, type: data[k].type || '' };
    });
  },

  onMessages: function(conversationId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('messages/' + conversationId).orderByChild('timestamp');
    var handler = function(snap) {
      var data = snap.val();
      callback(data ? Object.keys(data).map(function(k) {
        return { id: k, from: data[k].from, text: data[k].text, timestamp: data[k].timestamp, seen: data[k].seen || false, type: data[k].type || '' };
      }) : []);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  markAllMessagesAsSeen: async function(conversationId, userId) {
    var snap = await fbOnce(fbRef('messages/' + conversationId));
    var data = snap ? snap.val() : null;
    if (!data) return;

    var updates = {};
    Object.keys(data).forEach(function(key) {
      if (data[key].from !== userId && !data[key].seen) {
        updates[key + '/seen'] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      await fbUpdate(fbRef('messages/' + conversationId), updates);
    }
  },

  deleteConversation: async function(conversationId) {
    await fbRemove(fbRef('messages/' + conversationId));
  },

  // ==================== TYPING ====================
  setTyping: function(conversationId, userId, isTyping) {
    if (!_db) return;
    _db.ref('typing/' + conversationId).set({
      userId: userId,
      isTyping: isTyping,
      timestamp: Date.now(),
    });
  },

  onTyping: function(conversationId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('typing/' + conversationId);
    var handler = function(snap) { callback(snap.val()); };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== REACTIONS ====================
  setReaction: async function(messageId, userId, icon) {
    if (icon) {
      var existing = await fbOnce(fbRef('reactions/' + messageId + '/' + userId));
      var current = existing ? existing.val() : null;
      if (current === icon) {
        await fbRemove(fbRef('reactions/' + messageId + '/' + userId));
      } else {
        await fbSet(fbRef('reactions/' + messageId + '/' + userId), icon);
      }
    } else {
      await fbRemove(fbRef('reactions/' + messageId + '/' + userId));
    }
  },

  onReactions: function(messageId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('reactions/' + messageId);
    var handler = function(snap) {
      var data = snap.val();
      var result = { reactions: {}, users: {} };
      if (data) {
        Object.keys(data).forEach(function(uid) {
          var icon = data[uid];
          if (!result.reactions[icon]) result.reactions[icon] = 0;
          result.reactions[icon]++;
          result.users[uid] = icon;
        });
      }
      callback(result);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== WALLPAPERS ====================
  setWallpaper: async function(conversationId, value) {
    if (value) {
      await fbSet(fbRef('wallpapers/' + conversationId), value);
    } else {
      await fbRemove(fbRef('wallpapers/' + conversationId));
    }
  },

  getWallpaper: async function(conversationId) {
    var snap = await fbOnce(fbRef('wallpapers/' + conversationId));
    return snap ? snap.val() : null;
  },

  onWallpaper: function(conversationId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('wallpapers/' + conversationId);
    var handler = function(snap) { callback(snap.val()); };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== GROUPS ====================
  createGroup: async function(groupData) {
    var ref = await fbPush(fbRef('groups'), groupData);
    return ref ? ref.key : null;
  },

  getGroup: async function(groupId) {
    var snap = await fbOnce(fbRef('groups/' + groupId));
    var data = snap ? snap.val() : null;
    if (data) data.id = groupId;
    return data;
  },

  updateGroup: async function(groupId, data) {
    await fbUpdate(fbRef('groups/' + groupId), data);
  },

  getAllGroups: async function() {
    var snap = await fbOnce(fbRef('groups'));
    var data = snap ? snap.val() : null;
    if (!data) return [];
    return Object.keys(data).map(function(k) {
      var g = data[k];
      g.id = k;
      return g;
    });
  },

  sendGroupMessage: async function(groupId, message) {
    var ref = await fbPush(fbRef('groupMessages/' + groupId), message);
    return ref ? ref.key : null;
  },

  onGroupMessages: function(groupId, callback) {
    if (!_db) return function() {};
    var ref = _db.ref('groupMessages/' + groupId).orderByChild('timestamp');
    var handler = function(snap) {
      var data = snap.val();
      callback(data ? Object.keys(data).map(function(k) {
        var m = data[k];
        m.id = k;
        return m;
      }) : []);
    };
    ref.on('value', handler);
    return function() { ref.off('value', handler); };
  },

  // ==================== CLEANUP ====================
  deleteUserData: async function(userId) {
    await fbRemove(fbRef('users/' + userId));
    await fbRemove(fbRef('friends/' + userId));

    var snap = await fbOnce(fbRef('friendRequests'));
    var data = snap ? snap.val() : null;
    if (data) {
      var promises = [];
      Object.keys(data).forEach(function(key) {
        if (data[key].from === userId || data[key].to === userId) {
          promises.push(fbRemove(fbRef('friendRequests/' + key)));
        }
      });
      await Promise.all(promises);
    }
  },
};
