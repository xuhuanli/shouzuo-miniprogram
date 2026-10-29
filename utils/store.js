// 预约单本地存储与预约单文案
// 说明：当前版本没有后台服务器，预约单保存在手机本地，
// 通过"复制预约单"粘贴给店主微信确认。接后台时只需替换本文件。

const local = require('../data/products.js');

const KEY = 'sz_orders';
const CONTACT_KEY = 'sz_contact';

function getOrders() {
  try {
    return wx.getStorageSync(KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveOrder(order) {
  const list = getOrders();
  list.unshift(order);
  wx.setStorageSync(KEY, list);
  return order;
}

function removeOrder(id) {
  const list = getOrders().filter((o) => o.id !== id);
  wx.setStorageSync(KEY, list);
}

function updateOrder(id, patch) {
  const list = getOrders().map((o) => (o.id === id ? Object.assign({}, o, patch) : o));
  wx.setStorageSync(KEY, list);
}

function getOrder(id) {
  return getOrders().find((o) => o.id === id) || null;
}

function getContact() {
  try {
    return wx.getStorageSync(CONTACT_KEY) || { nickname: '', receiver: '' };
  } catch (e) {
    return { nickname: '', receiver: '' };
  }
}

function setContact(contact) {
  wx.setStorageSync(CONTACT_KEY, contact);
}

// 一张单里的作品列表。现在一次预约是一张单、作品放在 items 里；
// 老订单是一件一张单，字段直接挂在订单上，这里统一包成一件的 items。
// 老订单当时没存图，按 styleId 去本地作品里找回封面
function orderItems(order) {
  if (order.items && order.items.length) return order.items;
  const p = order.styleId ? local.getById(order.styleId) : null;
  return [
    {
      styleName: order.styleName,
      img: p ? p.img : '',
      grade: order.grade,
      tableFabric: order.tableFabric,
      liningFabric: order.liningFabric,
      qty: order.qty
    }
  ];
}

// 订单卡底部那行费用：件数 / 加急费 / 运费 / 参考价
function feeLine(order) {
  if (order.payTotal == null) {
    // 老订单没有分项费用，只有件数、运费（同批只挂在第一张）和参考价
    const parts = ['共 ' + (order.qty || 1) + ' 件'];
    if (order.shippingFee) parts.push('运费 ¥' + order.shippingFee);
    if (order.priceEstimate) parts.push(order.priceEstimate);
    return parts.join(' · ');
  }
  const parts = ['共 ' + (order.count || orderItems(order).length) + ' 件'];
  if (order.urgentFee) parts.push('加急 ¥' + order.urgentFee);
  parts.push(order.shippingFee ? '运费 ¥' + order.shippingFee : '包邮');
  parts.push('参考价 ¥' + order.payTotal);
  return parts.join(' · ');
}

// 生成可复制的预约单文字
function buildOrderText(order) {
  const items = orderItems(order);
  const lines = ['【定制预约单】', '编号：' + order.no];

  items.forEach((it, i) => {
    const head = (items.length > 1 ? i + 1 + '. ' : '') + it.styleName;
    lines.push(head + '　' + (it.grade || '普通') + ' × ' + it.qty + (it.amount != null ? '　¥' + it.amount : ''));
    const fabric = [];
    if (it.tableFabric) fabric.push('表布：' + it.tableFabric);
    if (it.liningFabric) fabric.push('里布：' + it.liningFabric);
    if (fabric.length) lines.push((items.length > 1 ? '　 ' : '') + fabric.join('　'));
  });

  lines.push('加急：' + (order.urgent ? '是' : '否'));
  if (order.payTotal != null) {
    lines.push('商品合计：¥' + order.goodsTotal);
    if (order.urgentFee) lines.push('加急费：¥' + order.urgentFee);
    lines.push('运费：' + (order.shippingFee ? '¥' + order.shippingFee : '包邮'));
    lines.push('参考价：¥' + order.payTotal);
  } else {
    // 老订单的 priceEstimate 是「参考价 ¥25.9」，去掉前缀，免得拼成「参考价：参考价 ¥25.9」
    const price = String(order.priceEstimate || '').replace(/^参考价\s*[:：]?\s*/, '');
    if (price) lines.push('参考价：' + price);
  }
  if (order.remark) lines.push('备注：' + order.remark);
  if (order.nickname) lines.push('微信昵称：' + order.nickname);
  if (order.receiver) lines.push('收货信息：' + order.receiver);
  if (order.trackingNo) lines.push('物流：' + (order.express || '快递') + ' ' + order.trackingNo);
  return lines.join('\n');
}

// 订单编号：时间到秒 + 4 位随机，保证每次预约的单号都不一样
// 同一秒内连下多单时，随机尾号理论上会撞（1/10000），所以生成后要和
// ①已有订单  ②本次运行里已经发出去的编号  都比对一遍，撞了就重摇
const issued = {};

function rawOrderNo() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return (
    'SZ' +
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds()) +
    rand
  );
}

function genOrderNo() {
  const used = {};
  getOrders().forEach((o) => {
    if (o && o.no) used[o.no] = 1;
  });

  let no = rawOrderNo();
  // 最多重摇 20 次；撞满 20 次的概率几乎为零，兜底防止死循环
  for (let i = 0; i < 20 && (used[no] || issued[no]); i++) {
    no = rawOrderNo();
  }

  issued[no] = 1;
  return no;
}

module.exports = {
  getOrders,
  getOrder,
  saveOrder,
  removeOrder,
  updateOrder,
  getContact,
  setContact,
  orderItems,
  feeLine,
  buildOrderText,
  genOrderNo
};
