const cart = require('../../utils/cart.js');
const preview = require('../../utils/preview.js');

Page({
  data: {
    list: [],
    allChecked: false,
    checkedCount: 0,
    total: 0,
    manage: false
  },

  onShow() {
    const bar = this.getTabBar && this.getTabBar();
    if (bar) bar.refresh(2);
    this.load();
  },

  onPullDownRefresh() {
    this.load();
    wx.stopPullDownRefresh();
  },

  load() {
    this.compute(cart.getCart());
  },

  compute(list) {
    const checked = list.filter((x) => x.checked);
    const total = checked.reduce((s, x) => s + x.price * x.qty, 0);
    this.setData({
      list,
      allChecked: list.length > 0 && checked.length === list.length,
      checkedCount: checked.length,
      total: Math.round(total * 10) / 10
    });
    cart.syncBadge(list);
  },

  toggleItem(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.data.list.find((x) => x.key === key);
    if (!it) return;
    this.compute(cart.update(key, { checked: !it.checked }));
  },

  toggleAll() {
    this.compute(cart.toggleAll(!this.data.allChecked));
  },

  plus(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.data.list.find((x) => x.key === key);
    if (!it) return;
    this.compute(cart.update(key, { qty: it.qty + 1 }));
  },

  minus(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.data.list.find((x) => x.key === key);
    if (!it || it.qty <= 1) return;
    this.compute(cart.update(key, { qty: it.qty - 1 }));
  },

  onQty(e) {
    const key = e.currentTarget.dataset.key;
    const v = Math.max(1, Number(e.detail.value) || 1);
    this.compute(cart.update(key, { qty: v }));
  },

  removeOne(e) {
    const key = e.currentTarget.dataset.key;
    wx.showModal({
      title: '删掉这一件？',
      content: '删掉后可以回作品里重新加。',
      confirmText: '删除',
      confirmColor: '#EC8FA5',
      success: (res) => {
        if (!res.confirm) return;
        cart.remove([key]);
        this.load();
      }
    });
  },

  toggleManage() {
    this.setData({ manage: !this.data.manage });
  },

  // 管理模式下：删除已勾选的
  removeChecked() {
    const keys = this.data.list.filter((x) => x.checked).map((x) => x.key);
    if (!keys.length) {
      wx.showToast({ title: '先勾选要删的作品', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除 ' + keys.length + ' 件？',
      content: '删掉后可以回作品里重新加。',
      confirmText: '删除',
      confirmColor: '#EC8FA5',
      success: (res) => {
        if (!res.confirm) return;
        cart.remove(keys);
        this.load();
      }
    });
  },

  checkout() {
    const items = cart.checkedItems();
    if (!items.length) {
      wx.showToast({ title: '先勾选要预约的作品', icon: 'none' });
      return;
    }
    wx.setStorageSync('sz_checkout', items);
    wx.navigateTo({ url: '/pages/custom/custom' });
  },

  // 点作品小图：购物车里所有作品图一起，左右滑着看
  previewImg(e) {
    preview.open(this.data.list.map((x) => x.img), e.currentTarget.dataset.src);
  },

  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  }
});
