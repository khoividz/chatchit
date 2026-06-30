var REACTION_ICONS = ['👍', '❤️', '😂', '😮', '😡'];

var Reactions = {
  _unsubs: {},
  _cache: {},

  _getCached(messageId) {
    return this._cache[messageId] || { reactions: {}, users: {} };
  },

  _ensureListener(messageId) {
    if (this._unsubs[messageId]) return;
    var self = this;
    this._unsubs[messageId] = DB.onReactions(messageId, function(data) {
      self._cache[messageId] = data;
      var container = document.getElementById('reactions-' + messageId);
      if (container) self.renderReactions(messageId, container, data);
    });
  },

  getReactions(messageId) {
    var data = this._getCached(messageId);
    return Object.keys(data.reactions || {}).map(function(icon) {
      return { icon: icon, count: data.reactions[icon] };
    }).sort(function(a, b) { return b.count - a.count; });
  },

  getUserReaction(messageId, userId) {
    var data = this._getCached(messageId);
    return (data.users && data.users[userId]) || null;
  },

  async toggleReaction(messageId, userId, icon) {
    await DB.setReaction(messageId, userId, icon);
  },

  renderReactions(messageId, container, optData) {
    var data = optData || this._getCached(messageId);
    var reactions = Object.keys(data.reactions || {}).map(function(icon) {
      return { icon: icon, count: data.reactions[icon] };
    }).sort(function(a, b) { return b.count - a.count; });

    if (reactions.length === 0) { container.innerHTML = ''; return; }
    var userId = Utils.getCurrentUser();
    var uid = userId ? userId.id : null;
    var userReact = uid ? (data.users[uid] || null) : null;

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

  attachToMessage(messageId) {
    this._ensureListener(messageId);
  },
};
