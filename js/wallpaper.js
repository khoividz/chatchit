var WALLPAPER_COLORS = [
  '#ffffff', '#f0f0f0', '#e3f2fd', '#e8f5e9', '#fff3e0',
  '#fce4ec', '#f3e5f5', '#e0f7fa', '#f9fbe7', '#ffebee'
];

var Wallpaper = {
  _unsubs: {},

  async getWallpaper(conversationId) {
    var val = await DB.getWallpaper(conversationId);
    return val || '';
  },

  async setWallpaper(conversationId, value) {
    await DB.setWallpaper(conversationId, value || '');
  },

  _ensureListener(conversationId) {
    if (this._unsubs[conversationId]) return;
    var self = this;
    this._unsubs[conversationId] = DB.onWallpaper(conversationId, function(value) {
      self._applyWallpaper(conversationId, value);
    });
  },

  _applyWallpaper(conversationId, wallpaper) {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    wallpaper = wallpaper || '';
    if (wallpaper) {
      if (wallpaper.startsWith('#') || wallpaper.startsWith('rgb')) {
        container.style.backgroundColor = wallpaper;
        container.style.backgroundImage = 'none';
      } else {
        container.style.backgroundImage = 'url(' + wallpaper + ')';
        container.style.backgroundColor = 'transparent';
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
      }
    } else {
      container.style.backgroundColor = '';
      container.style.backgroundImage = '';
      container.style.backgroundSize = '';
      container.style.backgroundPosition = '';
      container.style.backgroundRepeat = '';
    }
  },

  applyWallpaper(conversationId) {
    this._ensureListener(conversationId);
  },

  openSettings(conversationId) {
    var existing = document.getElementById('wallpaperModal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'wallpaperModal';
    overlay.className = 'modal-overlay open';

    var self = this;

    DB.getWallpaper(conversationId).then(function(current) {
      current = current || '';

      overlay.innerHTML = '<div class="modal wallpaper-modal">'
        + '<h2>Hình nền đoạn chat</h2>'
        + '<p>Chọn màu nền hoặc tải ảnh lên</p>'
        + '<div class="wallpaper-color-grid">'
        + WALLPAPER_COLORS.map(function(c) {
            var active = current === c ? ' active' : '';
            return '<div class="wallpaper-color' + active + '" data-color="' + c + '" style="background:' + c + ';border:2px solid ' + (c === '#ffffff' ? '#ccc' : c) + '"></div>';
          }).join('')
        + '</div>'
        + '<div class="wallpaper-actions">'
        + '<button class="btn btn-secondary btn-sm" id="wallpaperUploadBtn">Tải ảnh lên</button>'
        + '<input type="file" id="wallpaperInput" accept="image/*" style="display:none;">'
        + (current ? '<button class="btn btn-secondary btn-sm" id="wallpaperRemoveBtn">Xóa nền</button>' : '')
        + '</div>'
        + '<div class="modal-actions" style="margin-top:16px;">'
        + '<button class="btn btn-primary btn-sm" id="wallpaperCloseBtn">Xong</button>'
        + '</div>'
        + '</div>';

      document.body.appendChild(overlay);

      overlay.querySelectorAll('.wallpaper-color').forEach(function(el) {
        el.addEventListener('click', function() {
          overlay.querySelectorAll('.wallpaper-color').forEach(function(e) { e.classList.remove('active'); });
          el.classList.add('active');
          var color = el.dataset.color;
          self.setWallpaper(conversationId, color);
        });
      });

      var uploadBtn = document.getElementById('wallpaperUploadBtn');
      var input = document.getElementById('wallpaperInput');
      if (uploadBtn && input) {
        uploadBtn.addEventListener('click', function() { input.click(); });
        input.addEventListener('change', function(e) {
          var file = e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { Utils.showToast('Vui lòng chọn file ảnh', 'error'); return; }
          if (file.size > 5 * 1024 * 1024) { Utils.showToast('Ảnh không được quá 5MB', 'error'); return; }
          var reader = new FileReader();
          reader.onload = function(ev) {
            self.setWallpaper(conversationId, ev.target.result);
            Utils.showToast('Đã cập nhật hình nền', 'success');
          };
          reader.readAsDataURL(file);
        });
      }

      var removeBtn = document.getElementById('wallpaperRemoveBtn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function() {
          self.setWallpaper(conversationId, '');
          overlay.remove();
          Utils.showToast('Đã xóa hình nền', 'info');
        });
      }

      document.getElementById('wallpaperCloseBtn').addEventListener('click', function() { overlay.remove(); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    });
  },
};
