var REACTION_ICONS = ['👍', '❤️', '😂', '😮', '😡'];

var Reactions = {
  _data: null,

  _getData() {
    if (this._data) return this._data;
    try {
      var raw = localStorage.getItem('reactions');
      this._data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this._data = {};
    }
    return this._data;
  },

  _save() {
    try {
      localStorage.setItem('reactions', JSON.stringify(this._data));
    } catch (e) { /* ignore */ }
  },

  getReactions(messageId) {
    var data = this._getData();
    var msg = data[messageId];
    if (!msg) return [];
    return Object.keys(msg.reactions || {}).map(function(icon) {
      return { icon: icon, count: msg.reactions[icon] };
    }).sort(function(a, b) { return b.count - a.count; });
  },

  getUserReaction(messageId, userId) {
    var data = this._getData();
    var msg = data[messageId];
    return msg && msg.users ? (msg.users[userId] || null) : null;
  },

  toggleReaction(messageId, userId, icon) {
    var data = this._getData();
    if (!data[messageId]) {
      data[messageId] = { reactions: {}, users: {} };
    }
    var msg = data[messageId];
    var currentIcon = msg.users[userId];

    if (currentIcon === icon) {
      msg.reactions[icon] = (msg.reactions[icon] || 1) - 1;
      if (msg.reactions[icon] <= 0) delete msg.reactions[icon];
      delete msg.users[userId];
      var changed = 'removed';
    } else {
      if (currentIcon) {
        msg.reactions[currentIcon] = (msg.reactions[currentIcon] || 1) - 1;
        if (msg.reactions[currentIcon] <= 0) delete msg.reactions[currentIcon];
      }
      msg.reactions[icon] = (msg.reactions[icon] || 0) + 1;
      msg.users[userId] = icon;
      var changed = 'added';
    }

    if (Object.keys(msg.reactions).length === 0) {
      delete data[messageId];
    }

    this._save();
    return { reaction: icon, action: changed };
  },

  renderReactions(messageId, container) {
    var reactions = this.getReactions(messageId);
    if (reactions.length === 0) { container.innerHTML = ''; return; }
    var userId = Utils.getCurrentUser();
    var uid = userId ? userId.id : null;
    var userReact = uid ? this.getUserReaction(messageId, uid) : null;

    container.innerHTML = reactions.map(function(r) {
      var isActive = r.icon === userReact;
      return '<span class="reaction-badge' + (isActive ? ' active' : '') + '" data-icon="' + r.icon + '" onclick="Reactions.onBadgeClick(\'' + messageId + '\', \'' + r.icon + '\')">'
        + r.icon + ' ' + r.count + '</span>';
    }).join('');
  },

  onBadgeClick(messageId, icon) {
    var userId = Utils.getCurrentUser();
    if (!userId) return;
    Reactions.toggleReaction(messageId, userId.id, icon);
    var msgs = Chat._lastRenderedMessages;
    if (msgs) Chat.renderMessages(msgs);
  },

  showPicker(messageId, originEl) {
    var existing = document.getElementById('reactionPicker');
    if (existing) existing.remove();

    var picker = document.createElement('div');
    picker.id = 'reactionPicker';
    picker.className = 'reaction-picker';
    picker.innerHTML = REACTION_ICONS.map(function(icon) {
      return '<span class="reaction-option" data-icon="' + icon + '">' + icon + '</span>';
    }).join('');

    var rect = originEl.getBoundingClientRect();
    var top = rect.top - 48;
    var left = rect.left + rect.width / 2 - 110;
    if (top < 4) top = rect.bottom + 4;
    if (left < 4) left = 4;
    if (left + 220 > window.innerWidth) left = window.innerWidth - 224;

    picker.style.top = top + 'px';
    picker.style.left = left + 'px';

    picker.addEventListener('click', function(e) {
      var option = e.target.closest('.reaction-option');
      if (!option) return;
      var icon = option.dataset.icon;
      var userId = Utils.getCurrentUser();
      if (!userId) return;
      Reactions.toggleReaction(messageId, userId.id, icon);
      var msgs = Chat._lastRenderedMessages;
      if (msgs) Chat.renderMessages(msgs);
      picker.remove();
    });

    document.body.appendChild(picker);

    setTimeout(function() {
      var closeHandler = function(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  },
};
