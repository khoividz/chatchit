var DEFAULT_STICKERS = [
  { id: 'st-like', emoji: '👍', label: 'Like' },
  { id: 'st-love', emoji: '❤️', label: 'Love' },
  { id: 'st-laugh', emoji: '😂', label: 'Laugh' },
  { id: 'st-wow', emoji: '😮', label: 'Wow' },
  { id: 'st-angry', emoji: '😡', label: 'Angry' },
  { id: 'st-cry', emoji: '😭', label: 'Cry' },
  { id: 'st-cool', emoji: '😎', label: 'Cool' },
  { id: 'st-clap', emoji: '👏', label: 'Clap' },
  { id: 'st-wave', emoji: '👋', label: 'Wave' },
  { id: 'st-fire', emoji: '🔥', label: 'Fire' },
  { id: 'st-heart', emoji: '💖', label: 'Heart' },
  { id: 'st-100', emoji: '💯', label: '100' },
];

var Stickers = {
  getAll(userId) {
    var defaults = DEFAULT_STICKERS.map(function(s) {
      return { id: s.id, emoji: s.emoji, label: s.label, type: 'default' };
    });
    var custom = CustomSticker.getAll(userId);
    return defaults.concat(custom);
  },

  openPicker(targetConversationId, callback) {
    var existing = document.getElementById('stickerPanel');
    if (existing) {
      existing.remove();
      return;
    }

    var userId = Utils.getCurrentUser();
    if (!userId) return;
    var allStickers = this.getAll(userId.id);

    var panel = document.createElement('div');
    panel.id = 'stickerPanel';
    panel.className = 'sticker-panel';

    var tabsHtml = '<div class="sticker-tabs">'
      + '<button class="sticker-tab active" data-tab="all">Tất cả</button>'
      + '<button class="sticker-tab" data-tab="custom">Cá nhân</button>'
      + '</div>';

    var gridHtml = '<div class="sticker-grid" id="stickerGrid">'
      + allStickers.map(function(s) {
          if (s.type === 'custom') {
            return '<div class="sticker-item custom" data-id="' + s.id + '" title="Nhấn giữ để xóa">'
              + '<img src="' + Utils.escapeHtml(s.data) + '" alt="sticker">'
              + '</div>';
          }
          return '<div class="sticker-item default" data-id="' + s.id + '">'
            + '<span class="sticker-emoji">' + s.emoji + '</span>'
            + '</div>';
        }).join('')
      + '</div>';

    var uploadHtml = '<div class="sticker-upload">'
      + '<button class="btn btn-secondary btn-sm" id="customStickerUploadBtn">+ Tạo sticker</button>'
      + '<input type="file" id="customStickerInput" accept="image/*" style="display:none;">'
      + '</div>';

    panel.innerHTML = tabsHtml + gridHtml + uploadHtml;

    var inputArea = document.querySelector('.chat-input-area');
    if (inputArea) {
      inputArea.appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }

    var self = this;
    panel.querySelectorAll('.sticker-item').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = el.dataset.id;
        var s = allStickers.find(function(st) { return st.id === id; });
        if (!s) return;
        if (s.type === 'custom') {
          callback('<img src="' + Utils.escapeHtml(s.data) + '" style="max-width:160px;max-height:160px;" alt="sticker">');
        } else {
          callback('<span style="font-size:64px;line-height:1;">' + s.emoji + '</span>');
        }
        self.closePicker();
      });

      el.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        var id = el.dataset.id;
        var s = allStickers.find(function(st) { return st.id === id; });
        if (s && s.type === 'custom') {
          if (confirm('Xóa sticker này?')) {
            CustomSticker.remove(userId.id, id);
            Stickers.closePicker();
            Stickers.openPicker(targetConversationId, callback);
          }
        }
      });

      var pressTimer;
      el.addEventListener('touchstart', function() {
        var id = el.dataset.id;
        var s = allStickers.find(function(st) { return st.id === id; });
        if (s && s.type === 'custom') {
          pressTimer = setTimeout(function() {
            if (confirm('Xóa sticker này?')) {
              CustomSticker.remove(userId.id, id);
              Stickers.closePicker();
              Stickers.openPicker(targetConversationId, callback);
            }
          }, 800);
        }
      });
      el.addEventListener('touchend', function() { clearTimeout(pressTimer); });
      el.addEventListener('touchmove', function() { clearTimeout(pressTimer); });
    });

    var uploadBtn = document.getElementById('customStickerUploadBtn');
    var uploadInput = document.getElementById('customStickerInput');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', function() { uploadInput.click(); });
      uploadInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { Utils.showToast('Vui lòng chọn file ảnh', 'error'); return; }
        if (file.size > 2 * 1024 * 1024) { Utils.showToast('Ảnh không được quá 2MB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          CustomSticker.add(userId.id, ev.target.result);
          self.closePicker();
          Utils.showToast('Đã thêm sticker cá nhân', 'success');
          self.openPicker(targetConversationId, callback);
        };
        reader.readAsDataURL(file);
      });
    }

    panel.querySelectorAll('.sticker-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        panel.querySelectorAll('.sticker-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var grid = document.getElementById('stickerGrid');
        if (tab.dataset.tab === 'custom') {
          var custom = CustomSticker.getAll(userId.id);
          grid.innerHTML = custom.length > 0
            ? custom.map(function(s) {
                return '<div class="sticker-item custom" data-id="' + s.id + '" title="Nhấn giữ để xóa">'
                  + '<img src="' + Utils.escapeHtml(s.data) + '" alt="sticker">'
                  + '</div>';
              }).join('')
            : '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;">Chưa có sticker cá nhân</p>';
        } else {
          var all = self.getAll(userId.id);
          grid.innerHTML = all.map(function(s) {
            if (s.type === 'custom') {
              return '<div class="sticker-item custom" data-id="' + s.id + '" title="Nhấn giữ để xóa">'
                + '<img src="' + Utils.escapeHtml(s.data) + '" alt="sticker">'
                + '</div>';
            }
            return '<div class="sticker-item default" data-id="' + s.id + '">'
              + '<span class="sticker-emoji">' + s.emoji + '</span>'
              + '</div>';
          }).join('');
        }
      });
    });
  },

  closePicker() {
    var panel = document.getElementById('stickerPanel');
    if (panel) panel.remove();
  },
};
