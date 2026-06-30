const Friends = {
  searchUser(query) {
    if (!Utils.validateId(query)) return null;

    const users = Utils.getUsers();
    return users.find(u => u.id === query) || null;
  },

  sendFriendRequest(targetId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    if (currentUser.id === targetId) {
      return { success: false, error: 'self_request' };
    }

    if (!Utils.validateId(targetId)) {
      return { success: false, error: 'invalid_id' };
    }

    const users = Utils.getUsers();
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) {
      return { success: false, error: 'user_not_found' };
    }

    const friends = Utils.getFriends();
    if (friends[currentUser.id] && friends[currentUser.id].includes(targetId)) {
      return { success: false, error: 'already_friends' };
    }

    let requests = Utils.getFriendRequests();
    const existing = requests.find(
      r => (r.from === currentUser.id && r.to === targetId) ||
           (r.from === targetId && r.to === currentUser.id)
    );

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'request_pending' };
      }
      if (existing.status === 'accepted') {
        return { success: false, error: 'already_friends' };
      }
    }

    const request = {
      id: Utils.generateUUID(),
      from: currentUser.id,
      fromDisplayName: currentUser.displayName || currentUser.id,
      to: targetId,
      status: 'pending',
      createdAt: Date.now(),
    };

    requests.push(request);
    Utils.saveFriendRequests(requests);

    Utils.broadcast({
      type: 'friend-request',
      request,
    });

    return { success: true, request };
  },

  acceptRequest(requestId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    let requests = Utils.getFriendRequests();
    const request = requests.find(r => r.id === requestId);
    if (!request) return { success: false, error: 'not_found' };

    if (request.to !== currentUser.id) {
      return { success: false, error: 'unauthorized' };
    }

    request.status = 'accepted';
    Utils.saveFriendRequests(requests);

    const friends = Utils.getFriends();
    if (!friends[request.from]) friends[request.from] = [];
    if (!friends[request.to]) friends[request.to] = [];

    if (!friends[request.from].includes(request.to)) {
      friends[request.from].push(request.to);
    }
    if (!friends[request.to].includes(request.from)) {
      friends[request.to].push(request.from);
    }
    Utils.saveFriends(friends);

    Utils.broadcast({
      type: 'friend-accept',
      from: request.from,
      to: request.to,
    });

    return { success: true };
  },

  rejectRequest(requestId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    let requests = Utils.getFriendRequests();
    const request = requests.find(r => r.id === requestId);
    if (!request) return { success: false, error: 'not_found' };

    if (request.to !== currentUser.id) {
      return { success: false, error: 'unauthorized' };
    }

    request.status = 'rejected';
    Utils.saveFriendRequests(requests);

    return { success: true };
  },

  getPendingRequests() {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return [];

    const requests = Utils.getFriendRequests();
    return requests.filter(r => r.to === currentUser.id && r.status === 'pending');
  },

  getFriendsList() {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return [];

    const friends = Utils.getFriends();
    const friendIds = friends[currentUser.id] || [];
    const users = Utils.getUsers();

    return friendIds.map(id => {
      const user = users.find(u => u.id === id);
      return user || { id, displayName: '', avatar: 'default' };
    }).filter(Boolean);
  },

  removeFriend(targetId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    let friends = Utils.getFriends();
    if (friends[currentUser.id]) {
      friends[currentUser.id] = friends[currentUser.id].filter(id => id !== targetId);
    }
    if (friends[targetId]) {
      friends[targetId] = friends[targetId].filter(id => id !== currentUser.id);
    }
    Utils.saveFriends(friends);

    const convId = Utils.getConversationId(currentUser.id, targetId);
    localStorage.removeItem('messages_' + convId);

    Utils.broadcast({
      type: 'friend-removed',
      from: currentUser.id,
      to: targetId,
    });

    return { success: true };
  },

  getFriendDisplayName(friendId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return friendId;

    const friends = this.getFriendsList();
    const friend = friends.find(f => f.id === friendId);
    return friend && friend.displayName ? friend.displayName : friendId;
  },

  getSentRequests() {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return [];

    const requests = Utils.getFriendRequests();
    return requests.filter(r => r.from === currentUser.id && r.status === 'pending');
  },
};
