var CustomSticker = {
  _cache: {},

  getAll(userId) {
    if (this._cache[userId]) return this._cache[userId];
    try {
      var raw = localStorage.getItem('custom_stickers');
      var data = raw ? JSON.parse(raw) : {};
      this._cache[userId] = data[userId] || [];
      return this._cache[userId];
    } catch (e) {
      return [];
    }
  },

  add(userId, base64Data) {
    var allCustom = {};
    try {
      var raw = localStorage.getItem('custom_stickers');
      allCustom = raw ? JSON.parse(raw) : {};
    } catch (e) { /* ignore */ }
    if (!allCustom[userId]) allCustom[userId] = [];
    var id = 'st_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    allCustom[userId].push({ id: id, data: base64Data, type: 'custom' });
    try {
      localStorage.setItem('custom_stickers', JSON.stringify(allCustom));
    } catch (e) { /* ignore */ }
    this._cache[userId] = null;
    return id;
  },

  remove(userId, stickerId) {
    try {
      var raw = localStorage.getItem('custom_stickers');
      var allCustom = raw ? JSON.parse(raw) : {};
      if (allCustom[userId]) {
        allCustom[userId] = allCustom[userId].filter(function(s) { return s.id !== stickerId; });
        if (allCustom[userId].length === 0) delete allCustom[userId];
        localStorage.setItem('custom_stickers', JSON.stringify(allCustom));
      }
    } catch (e) { /* ignore */ }
    this._cache[userId] = null;
  },

  clearCache() {
    this._cache = {};
  },
};
