const config = require('../config.js');
const local = require('../data/products.js');
const store = require('./store.js');

// 订单状态：待确认 → 制作中 → 待发货 → 已发货 → 已完成
const STATUS = {
  PENDING: '待确认',
  MAKING: '制作中',
  WAIT_SHIP: '待发货',
  SHIPPED: '已发货',
  DONE: '已完成',
  CANCELED: '已取消'
};

// 常用快递，韵达放第一个（默认值）
const EXPRESS = [
  '韵达快递',
  '顺丰速运',
  '中通快递',
  '圆通速递',
  '申通快递',
  '邮政EMS',
  '极兔速递',
  '京东物流',
  '德邦快递',
  '百世快递',
  '天天快递',
  '其他'
];

function isCloud() {
  return !!(config.envId && wx.cloud);
}

/* ---------------- 商品 ---------------- */

// 统一成页面好用的结构：云端新建的商品没有 id 字段，用 _id 兜底；
// 老数据可能只有 img / price，也在这里补齐成新结构
function normalize(p) {
  if (!p) return p;
  const out = Object.assign({}, p);
  out.id = p.id || p._id;

  out.images = p.images && p.images.length ? p.images : p.img ? [p.img] : [];
  out.img = out.images[0] || '';

  out.grades =
    p.grades && p.grades.length
      ? p.grades.map((g) => ({ k: g.k || '普通', price: Number(g.price) || 0 }))
      : [{ k: '普通', price: Number(p.price) || 0 }];
  out.price = out.grades[0].price;
  out.unit = p.unit || '起';

  out.tableFabrics = normFabrics(p.tableFabrics);
  out.liningFabrics = normFabrics(p.liningFabrics);
  out.size = p.size || '';
  out.desc = p.desc || '';
  out.summary = p.summary || p.desc || '';
  return out;
}

// 面料统一带上 g（属于普通还是缎面），老数据没写就当归普通
function normFabrics(list) {
  return (list || []).map((f) => ({
    n: f.n || '面料',
    img: f.img || '',
    g: f.g === '缎面' ? '缎面' : '普通'
  }));
}

// 有云端数据用云端的，没有就回落本地示例数据，保证任何时候都能看
async function getProducts() {
  if (!isCloud()) return local.products.map(normalize);
  try {
    const db = wx.cloud.database();
    const res = await db.collection('products').orderBy('sort', 'asc').limit(100).get();
    if (!res.data || !res.data.length) return local.products.map(normalize);
    return res.data.filter((p) => p.onSale !== false).map(normalize);
  } catch (e) {
    console.warn('[db] 云端商品读取失败，使用本地数据', e);
    return local.products.map(normalize);
  }
}

async function getProduct(id) {
  const list = await getProducts();
  return list.find((p) => p.id === id) || null;
}

// 店铺信息（须知、流程文案等），存在 shop 集合里 id='main' 的文档
async function getShop() {
  if (!isCloud()) return null;
  try {
    const db = wx.cloud.database();
    const res = await db.collection('shop').doc('main').get();
    return res.data || null;
  } catch (e) {
    return null;
  }
}

/* ---------------- 订单（顾客侧） ---------------- */

async function addOrder(order) {
  const base = Object.assign({}, order, {
    status: STATUS.PENDING,
    express: '',
    trackingNo: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  if (!isCloud()) {
    // 本地模式也给个 id，取消/删除/复制才有得找
    const withId = Object.assign({}, base, {
      id: 'L' + Date.now() + Math.random().toString(36).slice(2, 6)
    });
    store.saveOrder(withId);
    return withId;
  }
  const db = wx.cloud.database();
  const res = await db.collection('orders').add({ data: base });
  return Object.assign({}, base, { _id: res._id });
}

// 顾客只看自己的单（靠数据库安全规则 doc._openid == auth.openid 保证）
async function myOrders() {
  if (!isCloud()) return store.getOrders();
  const db = wx.cloud.database();
  const res = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
  return res.data;
}

async function cancelMyOrder(id) {
  if (!isCloud()) {
    store.updateOrder(id, { status: STATUS.CANCELED });
    return;
  }
  const db = wx.cloud.database();
  await db.collection('orders').doc(id).update({
    data: { status: STATUS.CANCELED, updatedAt: Date.now() }
  });
}

async function deleteMyOrder(id) {
  if (!isCloud()) {
    store.removeOrder(id);
    return;
  }
  const db = wx.cloud.database();
  await db.collection('orders').doc(id).remove();
}

/* ---------------- 店主侧（走云函数，权限更高） ---------------- */

async function adminCall(action, payload) {
  if (!isCloud()) throw new Error('还没配置云开发环境 ID（config.js）');
  const pass = wx.getStorageSync('sz_admin_pass') || '';
  const res = await wx.cloud.callFunction({
    name: 'admin',
    data: Object.assign({ action, pass }, payload || {})
  });
  const r = (res && res.result) || {};
  if (!r.ok) throw new Error(r.msg || '操作失败');
  return r.data;
}

async function adminLogin(pass) {
  if (!isCloud()) throw new Error('还没配置云开发环境 ID（config.js）');
  const res = await wx.cloud.callFunction({ name: 'admin', data: { action: 'ping', pass } });
  const r = (res && res.result) || {};
  if (!r.ok) throw new Error(r.msg || '口令不正确');
  wx.setStorageSync('sz_admin_pass', pass);
  return true;
}

// 上传商品图到云存储，返回 fileID
async function uploadImage(filePath) {
  const ext = (filePath.match(/\.\w+$/) || ['.jpg'])[0];
  const cloudPath = 'products/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath });
  return res.fileID;
}

module.exports = {
  STATUS,
  EXPRESS,
  isCloud,
  normFabrics,
  getProducts,
  getProduct,
  getShop,
  addOrder,
  myOrders,
  cancelMyOrder,
  deleteMyOrder,
  adminCall,
  adminLogin,
  uploadImage
};
