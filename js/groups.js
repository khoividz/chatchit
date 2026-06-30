var Groups = {
  currentGroupId: null,
  _unsubMessages: null,
  _unsubTyping: null,

  async createGroup(name, memberIds) {
    var user = Utils.getCurrentUser();
    if (!user) return null;
    var members = {};
    members[user.id] = true;
    memberIds.forEach(function(id) { members[id] = true; });
    var group = {
      name: name.trim() || 'Nhóm mới',
      createdBy: user.id,
      createdAt: Date.now(),
      members: members,
    };
    var groupId = await DB.createGroup(group);
    return groupId;
  },

  async addMember(groupId, memberId) {
    var user = Utils.getCurrentUser();
    if (!user) return;
    var group = await DB.getGroup(groupId);
    if (!group || group.createdBy !== user.id) return;
    group.members[memberId] = true;
    await DB.updateGroup(groupId, { members: group.members });
  },

  async getMyGroups() {
    var user = Utils.getCurrentUser();
    if (!user) return [];
    var allGroups = await DB.getAllGroups();
    return allGroups.filter(function(g) {
      return g.members && g.members[user.id];
    });
  },

  async getGroup(groupId) {
    return await DB.getGroup(groupId);
  },

  async getGroupMembers(groupId) {
    var group = await DB.getGroup(groupId);
    if (!group || !group.members) return [];
    return Object.keys(group.members);
  },

  async getMemberDisplayNames(groupId) {
    var memberIds = await this.getGroupMembers(groupId);
    var promises = memberIds.map(function(id) {
      return DB.getUser(id).then(function(u) {
        return { id: id, displayName: (u && u.displayName) || id };
      });
    });
    return Promise.all(promises);
  },

  openGroupChat(groupId) {
    this.closeGroupChat();
    this.currentGroupId = groupId;
    this._renderEmpty();
    this._setupGroupListeners(groupId);
    this._setupGroupInput(groupId);
  },

  closeGroupChat() {
    this.currentGroupId = null;
    if (this._unsubMessages) { this._unsubMessages(); this._unsubMessages = null; }
    if (this._unsubTyping) { this._unsubTyping(); this._unsubTyping = null; }
  },

  _renderEmpty() {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '<div class="chat-empty-state">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
      + '</svg>'
      + '<h3>Đang tải cuộc trò chuyện nhóm...</h3>'
      + '</div>';
  },

  _setupGroupListeners(groupId) {
    this._unsubMessages = DB.onGroupMessages(groupId, function(messages) {
      if (Groups.currentGroupId === groupId) {
        Groups._renderGroupMessages(messages);
        Groups._scrollToBottom();
      }
    });
  },

  _renderGroupMessages(messages) {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    var user = Utils.getCurrentUser();
    if (!user) return;

    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="chat-empty-state">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
        + '</svg>'
        + '<h3>Chưa có tin nhắn</h3>'
        + '<p>Hãy gửi tin nhắn đầu tiên</p>'
        + '</div>';
      return;
    }

    var html = '';
    var lastTimestamp = 0;

    messages.forEach(function(msg) {
      if (!Utils.isSameDay(lastTimestamp, msg.timestamp)) {
        html += '<div class="date-divider">' + Utils.formatDate(msg.timestamp) + '</div>';
      }
      lastTimestamp = msg.timestamp;

      var isSent = msg.from === user.id;
      var isSticker = msg.type === 'sticker';
      var msgId = msg.id || '';

      html += '<div class="message-row ' + (isSent ? 'sent' : 'received') + '">'
        + (!isSent ? '<span class="message-sender">' + Utils.escapeHtml(msg.fromDisplayName || msg.from) + '</span>' : '')
        + '<div class="message-bubble ' + (isSent ? 'sent' : 'received') + (isSticker ? ' message-sticker' : '') + '"'
        + ' data-msg-id="' + msgId + '"'
        + ' onclick="Reactions.showPicker(\'' + msgId + '\', this)"'
        + ' ontouchstart="Chat._touchStart(event, \'' + msgId + '\')"'
        + ' ontouchend="Chat._touchEnd(event)"'
        + '>'
        + (isSticker
            ? '<div class="sticker-display">' + msg.text + '</div>'
            : Utils.escapeHtml(msg.text))
        + '<span class="message-time">' + Utils.formatTime(msg.timestamp) + '</span>'
        + '</div>'
        + '<div class="message-reactions" id="reactions-' + msgId + '"></div>'
        + '</div>';
    });

    container.innerHTML = html;

    messages.forEach(function(msg) {
      var msgId = msg.id || '';
      if (msgId) {
        var rc = document.getElementById('reactions-' + msgId);
        if (rc) Reactions.renderReactions(msgId, rc);
      }
    });
  },

  _setupGroupInput(groupId) {
    var textarea = document.getElementById('chatInput');
    var sendBtn = document.getElementById('sendBtn');
    var stickerBtn = document.getElementById('stickerBtn');
    if (!textarea || !sendBtn) return;

    var send = function() {
      var text = textarea.value.trim();
      if (text) {
        Groups._sendGroupMessage(groupId, text);
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.disabled = true;
      }
    };

    textarea.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    textarea.oninput = function() {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      sendBtn.disabled = !textarea.value.trim();
    };

    sendBtn.onclick = send;
    sendBtn.disabled = true;

    if (stickerBtn) {
      stickerBtn.onclick = function() {
        Stickers.openPicker(groupId, function(stickerHtml) {
          Groups._sendGroupMessage(groupId, stickerHtml, 'sticker');
          Stickers.closePicker();
        });
      };
    }
  },

  async _sendGroupMessage(groupId, text, type) {
    var user = Utils.getCurrentUser();
    if (!user) return;
    var message = {
      from: user.id,
      fromDisplayName: user.displayName || user.id,
      text: type === 'sticker' ? text : text.trim(),
      timestamp: Date.now(),
      seen: false,
    };
    if (type === 'sticker') message.type = 'sticker';
    await DB.sendGroupMessage(groupId, message);
  },

  _scrollToBottom() {
    var container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  renderGroupList() {
    var sidebarContainer = document.getElementById('friendsList');
    var mainContainer = document.getElementById('friendsListContainer');
    if (!sidebarContainer && !mainContainer) return;

    var self = this;
    this.getMyGroups().then(function(groups) {
      if (groups.length === 0) return;

      if (sidebarContainer) {
        var section = sidebarContainer.querySelector('.group-section');
        if (!section) {
          section = document.createElement('div');
          section.className = 'group-section';
          var header = document.createElement('div');
          header.className = 'sidebar-friends-header';
          header.innerHTML = '<h3>Nhóm</h3>';
          section.appendChild(header);
          sidebarContainer.appendChild(section);
        }
        var list = section.querySelector('.group-list');
        if (!list) {
          list = document.createElement('div');
          list.className = 'group-list';
          section.appendChild(list);
        }
        list.innerHTML = groups.map(function(g) {
          var memberCount = g.members ? Object.keys(g.members).length : 0;
          return '<div class="friend-item group-item" onclick="window.location.href=\'chat.html?group=' + g.id + '\'">'
            + '<div class="group-avatar">'
            + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
            + '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
            + '</svg>'
            + '</div>'
            + '<div class="friend-info">'
            + '<div class="friend-name">' + Utils.escapeHtml(g.name) + '</div>'
            + '<div class="friend-id">' + memberCount + ' thành viên</div>'
            + '</div>'
            + '</div>';
        }).join('');
      }

      if (mainContainer) {
        var mainSection = mainContainer.querySelector('.group-grid-section');
        if (!mainSection) {
          mainSection = document.createElement('div');
          mainSection.className = 'group-grid-section';
          mainSection.innerHTML = '<h2 style="font-size:1.125rem;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px;">'
            + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);">'
            + '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
            + '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
            + '</svg> Nhóm'
            + '</h2>';
          mainContainer.appendChild(mainSection);
        }
        var mainList = mainSection.querySelector('.group-grid');
        if (!mainList) {
          mainList = document.createElement('div');
          mainList.className = 'group-grid';
          mainSection.appendChild(mainList);
        }
        mainList.innerHTML = groups.map(function(g) {
          var memberCount = g.members ? Object.keys(g.members).length : 0;
          return '<div class="friend-card group-card" onclick="window.location.href=\'chat.html?group=' + g.id + '\'" style="cursor:pointer;">'
            + '<div class="group-avatar-lg">'
            + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
            + '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
            + '</svg>'
            + '</div>'
            + '<div class="friend-details">'
            + '<div class="friend-name-display">' + Utils.escapeHtml(g.name) + '</div>'
            + '<div class="friend-id-display">' + memberCount + ' thành viên</div>'
            + '</div>'
            + '<span class="btn btn-primary btn-sm">Nhắn tin</span>'
            + '</div>';
        }).join('');
      }
    });
  },

  showCreateModal() {
    var existing = document.getElementById('createGroupModal');
    if (existing) return;

    var overlay = document.createElement('div');
    overlay.id = 'createGroupModal';
    overlay.className = 'modal-overlay open';

    var user = Utils.getCurrentUser();
    var self = this;

    DB.getFriendIds(user.id).then(function(friendIds) {
      if (friendIds.length === 0) {
        overlay.innerHTML = '<div class="modal">'
          + '<h2>Tạo nhóm</h2>'
          + '<p>Bạn cần có bạn bè để tạo nhóm.</p>'
          + '<div class="modal-actions">'
          + '<button class="btn btn-primary" id="closeGroupModalBtn">Đóng</button>'
          + '</div>'
          + '</div>';
        document.body.appendChild(overlay);
        document.getElementById('closeGroupModalBtn').onclick = function() { overlay.remove(); };
        return;
      }

      var promises = friendIds.map(function(id) { return DB.getUser(id); });
      Promise.all(promises).then(function(users) {
        overlay.innerHTML = '<div class="modal" style="max-width:480px;">'
          + '<h2>Tạo nhóm mới</h2>'
          + '<p>Đặt tên nhóm và chọn thành viên</p>'
          + '<div style="margin-bottom:12px;">'
          + '<input type="text" id="groupNameInput" class="input" placeholder="Tên nhóm..." maxlength="50">'
          + '</div>'
          + '<div class="group-member-list" style="max-height:240px;overflow-y:auto;">'
          + friendIds.map(function(id, i) {
              var u = users[i];
              var displayName = (u && u.displayName) || id;
              return '<label class="group-member-item">'
                + '<input type="checkbox" value="' + id + '">'
                + '<span>' + Utils.escapeHtml(displayName) + ' <span style="color:var(--text-muted);font-size:0.75rem;">' + Utils.escapeHtml(id) + '</span></span>'
                + '</label>';
            }).join('')
          + '</div>'
          + '<div class="modal-actions" style="margin-top:16px;">'
          + '<button class="btn btn-secondary" id="cancelGroupBtn">Hủy</button>'
          + '<button class="btn btn-primary" id="confirmGroupBtn">Tạo nhóm</button>'
          + '</div>'
          + '</div>';

        document.body.appendChild(overlay);

        document.getElementById('cancelGroupBtn').onclick = function() { overlay.remove(); };
        document.getElementById('confirmGroupBtn').onclick = async function() {
          var name = document.getElementById('groupNameInput').value.trim() || 'Nhóm mới';
          var checked = overlay.querySelectorAll('.group-member-item input:checked');
          var memberIds = [];
          checked.forEach(function(cb) { memberIds.push(cb.value); });
          if (memberIds.length === 0) {
            Utils.showToast('Vui lòng chọn ít nhất một thành viên', 'error');
            return;
          }
          document.getElementById('confirmGroupBtn').disabled = true;
          document.getElementById('confirmGroupBtn').textContent = 'Đang tạo...';
          try {
            var gid = await self.createGroup(name, memberIds);
            Utils.showToast('Đã tạo nhóm thành công', 'success');
            overlay.remove();
            window.location.href = 'chat.html?group=' + gid;
          } catch (e) {
            Utils.showToast('Lỗi tạo nhóm: ' + (e.message || ''), 'error');
            document.getElementById('confirmGroupBtn').disabled = false;
            document.getElementById('confirmGroupBtn').textContent = 'Tạo nhóm';
          }
        };
      });
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  },
};
