const db = require('../../utils/db.js');
const local = require('../../data/products.js');

const EXPRESS = db.EXPRESS;

// 订单状态页签（按流程先后排）
const STATUS_TABS = ['全部', '待确认', '制作中', '待发货', '已发货', '已完成', '已取消'];

// 当前状态 → 流转到下一步（按钮文案 / 目标状态）
const NEXT_STEP = {
  待确认: { label: '待确认', to: '制作中' },
  制作中: { label: '制作完成', to: '待发货' },
  已发货: { label: '标记完成', to: '已完成' }
};

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

Page({
  data: {
    logged: false,
    pass: '',
    envMissing: false,
    tab: 'orders',
    statusTabs: STATUS_TABS,
    statusFilter: '全部',
    expressList: EXPRESS,
    orders: [],
    products: [],
    loading: false
  },

  onLoad() {
    this.setData({ envMissing: !db.isCloud() });
    const pass = wx.getStorageSync('sz_admin_pass');
    if (pass && db.isCloud()) {
      db.adminLogin(pass)
        .then(() => {
          this.setData({ logged: true, pass });
          this.loadAll();
        })
        .catch(() => {
          wx.removeStorageSync('sz_admin_pass');
        });
    }
  },

  onPassInput(e) {
    this.setData({ pass: e.detail.value });
  },

  // 下拉刷新：重新拉一遍订单，看有没有新单
  onPullDownRefresh() {
    if (!this.data.logged) return wx.stopPullDownRefresh();
    const job = this.data.tab === 'orders' ? this.loadOrders() : this.loadProducts();
    Promise.resolve(job).then(() => wx.stopPullDownRefresh());
  },

  async login() {
    const pass = (this.data.pass || '').trim();
    if (!pass) return wx.showToast({ title: '请输入口令', icon: 'none' });
    try {
      wx.showLoading({ title: '验证中…', mask: true });
      await db.adminLogin(pass);
      wx.hideLoading();
      this.setData({ logged: true });
      this.loadAll();
    } catch (e) {
      wx.hideLoading();
      wx.showModal({ title: '进不去', content: e.message || '口令不正确', showCancel: false });
    }
  },

  logout() {
    wx.removeStorageSync('sz_admin_pass');
    this.setData({ logged: false, pass: '', orders: [], products: [] });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'products' && !this.data.products.length) this.loadProducts();
  },

  loadAll() {
    this.loadOrders();
    this.loadProducts();
  },

  /* ---------------- 订单 ---------------- */

  async loadOrders() {
    const status = this.data.statusFilter;
    this.setData({ loading: true });
    try {
      const data = await db.adminCall('listOrders', status === '全部' ? {} : { status });
      this.setData({
        orders: (data || []).map((o) => this.normalizeOrder(o)),
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '读取失败', icon: 'none' });
    }
  },

  // 「全部」页签里按每单当前状态，决定显示哪些信息和哪个按钮
  normalizeOrder(o) {
    const status = o.status || '待确认';
    const next = NEXT_STEP[status];
    return Object.assign({}, o, {
      id: o._id,
      expressIndex: Math.max(0, EXPRESS.indexOf(o.express || EXPRESS[0])),
      actionLabel: next ? next.label : '',
      actionTo: next ? next.to : '',
      canCancel: status === '待确认' || status === '制作中',
      needShip: status === '待发货' || status === '已发货',
      shipBtn: status === '待发货' ? '保存并发货' : '保存单号',
      createdAtText: fmtTime(o.createdAt)
    });
  },

  async filterStatus(e) {
    this.setData({ statusFilter: e.currentTarget.dataset.s });
    this.loadOrders();
  },

  // 状态流转：待确认 → 制作中 → 待发货 → 已发货 → 已完成
  async setStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '更新中…', mask: true });
      await db.adminCall('updateOrder', { id, patch: { status } });
      wx.hideLoading();
      wx.showToast({ title: '已更新为' + status, icon: 'none' });
      this.loadOrders();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  onExpressChange(e) {
    const i = Number(e.currentTarget.dataset.index);
    const orders = this.data.orders.slice();
    orders[i].expressIndex = Number(e.detail.value);
    orders[i].express = EXPRESS[orders[i].expressIndex];
    this.setData({ orders });
  },

  onTrackInput(e) {
    const i = Number(e.currentTarget.dataset.index);
    const orders = this.data.orders.slice();
    orders[i].trackingNo = e.detail.value.trim();
    this.setData({ orders });
  },

  // 保存快递 + 单号；待发货的单顺手变成已发货
  async saveTracking(e) {
    const i = Number(e.currentTarget.dataset.index);
    const o = this.data.orders[i];
    if (!o.trackingNo) return wx.showToast({ title: '先填物流单号', icon: 'none' });
    const patch = {
      trackingNo: o.trackingNo,
      express: o.express || EXPRESS[o.expressIndex || 0]
    };
    if (o.status === '待发货') patch.status = '已发货';
    try {
      wx.showLoading({ title: '保存中…', mask: true });
      await db.adminCall('updateOrder', { id: o.id, patch });
      wx.hideLoading();
      wx.showToast({ title: patch.status ? '已发货，客户可见' : '单号已更新', icon: 'none' });
      this.loadOrders();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  copyText(e) {
    const v = e.currentTarget.dataset.v;
    if (!v) return;
    wx.setClipboardData({ data: v, success: () => wx.showToast({ title: '已复制', icon: 'none' }) });
  },

  /* ---------------- 商品 ---------------- */

  async loadProducts() {
    try {
      const data = await db.adminCall('listProducts');
      this.setData({ products: (data || []).map((p) => this.normalizeProduct(p)) });
    } catch (e) {
      this.setData({ products: [] });
    }
  },

  // 云端老数据可能只有 img/price，这里补齐成新结构，页面才好编辑
  normalizeProduct(p) {
    const grades = (p.grades && p.grades.length ? p.grades : [{ k: '普通', price: p.price || 0 }]).map((g) => ({
      k: g.k || '普通',
      price: Number(g.price) || 0
    }));
    if (grades.length < 2) grades.push({ k: grades[0].k === '缎面' ? '普通' : '缎面', price: grades[0].price });
    const images = p.images && p.images.length ? p.images : p.img ? [p.img] : [];
    return this.withFabricViews(
      Object.assign({}, p, {
        grades,
        images,
        img: images[0] || '',
        size: p.size || '',
        desc: p.desc || '',
        tableFabrics: db.normFabrics(p.tableFabrics),
        liningFabrics: db.normFabrics(p.liningFabrics),
        fabOpen: false,
        fabGrade: '普通',
        dirty: false
      })
    );
  },

  // 面料图按「当前选中的材质」筛出来显示；fi 是它在整张表里的位置，改名/删除都靠它
  withFabricViews(item) {
    const g = item.fabGrade || '普通';
    const view = (list) =>
      (list || [])
        .map((f, fi) => ({ fi, n: f.n, img: f.img, g: f.g === '缎面' ? '缎面' : '普通' }))
        .filter((f) => f.g === g);
    return Object.assign({}, item, {
      tableView: view(item.tableFabrics),
      liningView: view(item.liningFabrics)
    });
  },

  // 后台里切普通 / 缎面：只看这一档的面料
  switchFabGrade(e) {
    const { index, g } = e.currentTarget.dataset;
    const i = Number(index);
    const products = this.data.products.slice();
    products[i] = this.withFabricViews(Object.assign({}, products[i], { fabGrade: g }));
    this.setData({ products });
  },

  // 首次使用：把本地示例作品导入云数据库
  async seedProducts() {
    try {
      wx.showLoading({ title: '导入中…', mask: true });
      await db.adminCall('initProducts', {
        products: local.products.map((p) => Object.assign({}, p, { onSale: true }))
      });
      wx.hideLoading();
      wx.showToast({ title: '已导入，去云数据库看', icon: 'none' });
      this.loadProducts();
    } catch (e) {
      wx.hideLoading();
      wx.showModal({ title: '导入失败', content: e.message || '', showCancel: false });
    }
  },

  // 输入只改本地，点「保存修改」才写云端
  onProductField(e) {
    const { field, index } = e.currentTarget.dataset;
    const products = this.data.products.slice();
    const item = Object.assign({}, products[Number(index)]);
    const value = e.detail.value;

    if (field === 'price0' || field === 'price1') {
      const grades = item.grades.map((g) => Object.assign({}, g));
      grades[field === 'price0' ? 0 : 1].price = value;
      item.grades = grades;
    } else {
      item[field] = value;
    }
    item.dirty = true;
    products[Number(index)] = item;
    this.setData({ products });
  },

  // 面料名输入（也只改本地）
  onFabricName(e) {
    const { index, kind, fi } = e.currentTarget.dataset;
    const i = Number(index);
    const key = kind === 'table' ? 'tableFabrics' : 'liningFabrics';
    const products = this.data.products.slice();
    const item = Object.assign({}, products[i]);
    item[key] = item[key].map((f, k) => (k === Number(fi) ? Object.assign({}, f, { n: e.detail.value }) : f));
    item.dirty = true;
    products[i] = this.withFabricViews(item);
    this.setData({ products });
  },

  // 保存这一件作品
  async saveProductCard(e) {
    const i = Number(e.currentTarget.dataset.index);
    const p = this.data.products[i];
    const grades = p.grades.map((g) => ({ k: g.k, price: Number(g.price) || 0 }));
    const patch = {
      name: (p.name || '').trim(),
      grades,
      price: grades[0].price,
      size: p.size || '',
      desc: p.desc || '',
      tableFabrics: p.tableFabrics,
      liningFabrics: p.liningFabrics
    };
    try {
      wx.showLoading({ title: '保存中…', mask: true });
      await db.adminCall('saveProduct', { id: p._id, data: patch });
      wx.hideLoading();
      const products = this.data.products.slice();
      products[i] = Object.assign({}, p, { dirty: false });
      this.setData({ products });
      wx.showToast({ title: '已保存', icon: 'none' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  toggleFabricPanel(e) {
    const i = Number(e.currentTarget.dataset.index);
    const products = this.data.products.slice();
    products[i] = this.withFabricViews(
      Object.assign({}, products[i], { fabOpen: !products[i].fabOpen })
    );
    this.setData({ products });
  },

  // 加一张表布 / 里布图：图片要立刻上传保存，不然会丢；存进当前选中的材质
  addFabric(e) {
    const { index, kind } = e.currentTarget.dataset;
    const i = Number(index);
    const key = kind === 'table' ? 'tableFabrics' : 'liningFabrics';
    const grade = this.data.products[i].fabGrade || '普通';
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        try {
          wx.showLoading({ title: '上传中…', mask: true });
          const added = [];
          for (const f of res.tempFiles) {
            const fileID = await db.uploadImage(f.tempFilePath);
            added.push({ n: '新面料', img: fileID, g: grade });
          }
          const p = this.data.products[i];
          const list = p[key].concat(added);
          await db.adminCall('saveProduct', { id: p._id, data: { [key]: list } });
          wx.hideLoading();
          // 本地就地更新，保持在当前材质页签上，方便接着加
          const products = this.data.products.slice();
          products[i] = this.withFabricViews(Object.assign({}, p, { [key]: list }));
          this.setData({ products });
          wx.showToast({ title: '已加 ' + added.length + ' 张到' + grade, icon: 'none' });
        } catch (err) {
          wx.hideLoading();
          wx.showModal({ title: '上传失败', content: err.message || '', showCancel: false });
        }
      }
    });
  },

  removeFabric(e) {
    const { index, kind, fi } = e.currentTarget.dataset;
    const i = Number(index);
    const key = kind === 'table' ? 'tableFabrics' : 'liningFabrics';
    const p = this.data.products[i];
    wx.showModal({
      title: '删掉这张面料图？',
      content: '删了之后客人就选不到了。',
      confirmText: '删除',
      confirmColor: '#EC8FA5',
      success: async (res) => {
        if (!res.confirm) return;
        const list = p[key].filter((f, k) => k !== Number(fi));
        try {
          wx.showLoading({ title: '删除中…', mask: true });
          await db.adminCall('saveProduct', { id: p._id, data: { [key]: list } });
          wx.hideLoading();
          const products = this.data.products.slice();
          products[i] = this.withFabricViews(Object.assign({}, p, { [key]: list }));
          this.setData({ products });
          wx.showToast({ title: '已删除', icon: 'none' });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  async toggleOnSale(e) {
    const { id, index } = e.currentTarget.dataset;
    const onSale = e.detail.value;
    try {
      await db.adminCall('saveProduct', { id, data: { onSale } });
      wx.showToast({ title: onSale ? '已上架' : '已下架', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async toggleFeatured(e) {
    const { id } = e.currentTarget.dataset;
    const featured = e.detail.value;
    try {
      await db.adminCall('saveProduct', { id, data: { featured } });
      wx.showToast({ title: featured ? '已设为首页精选' : '已取消精选', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async changeImage(e) {
    const { id } = e.currentTarget.dataset;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        const path = res.tempFiles[0].tempFilePath;
        try {
          wx.showLoading({ title: '上传中…', mask: true });
          const fileID = await db.uploadImage(path);
          await db.adminCall('saveProduct', { id, data: { img: fileID, images: [fileID] } });
          wx.hideLoading();
          wx.showToast({ title: '封面已更新', icon: 'none' });
          this.loadProducts();
        } catch (err) {
          wx.hideLoading();
          wx.showModal({ title: '上传失败', content: err.message || '', showCancel: false });
        }
      }
    });
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: [src], current: src });
  }
});
