// 预约单本地存储与预约单文案
// 说明：当前版本没有后台服务器，预约单保存在手机本地，
// 通过"复制预约单"粘贴给店主微信确认。接后台时只需替换本文件。

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

// 生成可复制的预约单文字
function buildOrderText(order) {
  const lines = [
    '【定制预约单】',
    '编号：' + order.no,
    '款式：' + order.styleName,
    '材质：' + (order.grade || '普通'),
    '数量：' + order.qty,
    '加急：' + (order.urgent ? '是（加急费另算）' : '否')
  ];
  // priceEstimate 存的是「参考价 ¥25.9」（卡片上直接用），这里去掉前缀，
  // 免得拼成「参考价：参考价 ¥25.9」
  const price = String(order.priceEstimate || '').replace(/^参考价\s*[:：]?\s*/, '');
  if (price) lines.push('参考价：' + price);
  if (order.tableFabric) lines.push('表布：' + order.tableFabric);
  if (order.liningFabric) lines.push('里布：' + order.liningFabric);
  if (order.remark) lines.push('备注：' + order.remark);
  if (order.nickname) lines.push('微信昵称：' + order.nickname);
  if (order.receiver) lines.push('收货信息：' + order.receiver);
  if (order.trackingNo) lines.push('物流：' + (order.express || '快递') + ' ' + order.trackingNo);
  return lines.join('\n');
}

// 订单编号：时间到秒 + 4 位随机，保证每个商品每次下单都不一样
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
  buildOrderText,
  genOrderNo
};
