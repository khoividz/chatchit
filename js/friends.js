const Friends = {
  async searchUser(query) {
    if (!Utils.validateId(query)) return null;
    return await DB.getUser(query);
  },

  async sendFriendRequest(targetId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };
    if (currentUser.id === targetId) return { success: false, error: 'self_request' };
    if (!Utils.validateId(targetId)) return { success: false, error: 'invalid_id' };

    const targetUser = await DB.getUser(targetId);
    if (!targetUser) return { success: false, error: 'user_not_found' };

    const friendIds = await DB.getFriendIds(currentUser.id);
    if (friendIds.includes(targetId)) return { success: false, error: 'already_friends' };

    const requests = await DB.getFriendRequestsForUser(targetId);
    const pendingToTarget = requests.find(r => r.from === currentUser.id && r.status === 'pending');
    if (pendingToTarget) return { success: false, error: 'request_pending' };

    const sentRequests = await DB.getSentRequests(currentUser.id);
    const pendingFromTarget = sentRequests.find(r => r.to === targetId && r.status === 'pending');
    if (pendingFromTarget) return { success: false, error: 'request_pending' };

    const request = {
      from: currentUser.id,
      fromDisplayName: currentUser.displayName || currentUser.id,
      to: targetId,
      status: 'pending',
      createdAt: Date.now(),
    };

    const requestId = await DB.sendFriendRequest(request);
    return { success: true, requestId };
  },

  async acceptRequest(requestId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    await DB.updateFriendRequest(requestId, { status: 'accepted' });

    const request = await DB.getFriendRequest(requestId);
    if (!request) return { success: false, error: 'not_found' };

    await DB.addFriend(request.from, request.to);
    return { success: true };
  },

  async rejectRequest(requestId) {
    await DB.updateFriendRequest(requestId, { status: 'rejected' });
    return { success: true };
  },

  async removeFriend(targetId) {
    const currentUser = Utils.getCurrentUser();
    if (!currentUser) return { success: false, error: 'not_logged_in' };

    await DB.removeFriend(currentUser.id, targetId);
    const convId = Utils.getConversationId(currentUser.id, targetId);
    await DB.deleteConversation(convId);
    return { success: true };
  },

  getFriendDisplayName(friendId) {
    return DB.getUser(friendId).then(u =>
      u && u.displayName ? u.displayName : friendId
    );
  },
};
