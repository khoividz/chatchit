const Settings = {
  init() {
    this.loadSettings();
    this.setupEventListeners();
  },

  loadSettings() {
    const user = Utils.getCurrentUser();
    if (!user) return;

    const displayNameInput = document.getElementById('displayName');
    const themeSelect = document.getElementById('themeSelect');
    const soundToggle = document.getElementById('soundToggle');
    const notifToggle = document.getElementById('notifToggle');

    if (displayNameInput) displayNameInput.value = user.displayName || '';
    if (themeSelect) themeSelect.value = user.theme || 'light';
    if (soundToggle) soundToggle.checked = user.soundEnabled !== false;
    if (notifToggle) notifToggle.checked = user.notificationsEnabled !== false;

    this.loadAvatarPreview();
  },

  setupEventListeners() {
    const displayNameInput = document.getElementById('displayName');
    if (displayNameInput) {
      displayNameInput.addEventListener('change', (e) => {
        Auth.updateProfile({ displayName: e.target.value.trim() });
        Utils.showToast('Đã cập nhật tên hiển thị', 'success');
      });
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        Auth.updateProfile({ theme });
        document.documentElement.setAttribute('data-theme', theme);
        Utils.showToast(theme === 'dark' ? 'Đã chuyển sang chế độ tối' : 'Đã chuyển sang chế độ sáng', 'success');
      });
    }

    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        Auth.updateProfile({ soundEnabled: e.target.checked });
        Utils.showToast(e.target.checked ? 'Âm thanh đã bật' : 'Âm thanh đã tắt', 'success');
      });
    }

    const notifToggle = document.getElementById('notifToggle');
    if (notifToggle) {
      notifToggle.addEventListener('change', (e) => {
        Auth.updateProfile({ notificationsEnabled: e.target.checked });
        Utils.showToast(e.target.checked ? 'Thông báo đã bật' : 'Thông báo đã tắt', 'success');
      });
    }

    const avatarInput = document.getElementById('avatarInput');
    const avatarUploadBtn = document.getElementById('avatarUploadBtn');
    if (avatarUploadBtn && avatarInput) {
      avatarUploadBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }

    const avatarPresets = document.querySelectorAll('.avatar-preset');
    avatarPresets.forEach(el => {
      el.addEventListener('click', () => {
        const preset = el.dataset.avatar;
        this.selectPresetAvatar(preset);
      });
    });

    const deleteBtn = document.getElementById('deleteAccountBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteModal = document.getElementById('deleteModal');

    if (deleteBtn && deleteModal) {
      deleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('open');
      });
    }

    if (cancelDeleteBtn && deleteModal) {
      cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.remove('open');
      });
    }

    if (confirmDeleteBtn && deleteModal) {
      confirmDeleteBtn.addEventListener('click', () => {
        Auth.deleteAccount();
        deleteModal.classList.remove('open');
        Utils.showToast('Đã xóa tài khoản', 'info');
        window.location.href = 'index.html';
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
        window.location.href = 'index.html';
      });
    }
  },

  loadAvatarPreview() {
    const img = document.getElementById('avatarPreview');
    const user = Utils.getCurrentUser();
    if (img && user) {
      img.src = Utils.getAvatarUrl(user.avatar);
    }
  },

  handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.showToast('Vui lòng chọn file ảnh', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Utils.showToast('Ảnh không được quá 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      Auth.updateProfile({ avatar: dataUrl });
      this.loadAvatarPreview();
      Utils.showToast('Đã cập nhật ảnh đại diện', 'success');
    };
    reader.readAsDataURL(file);
  },

  selectPresetAvatar(preset) {
    Auth.updateProfile({ avatar: preset });
    this.loadAvatarPreview();
    Utils.showToast('Đã cập nhật ảnh đại diện', 'success');
  },
};
