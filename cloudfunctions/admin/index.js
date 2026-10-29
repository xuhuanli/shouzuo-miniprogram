const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ⚠️ 管理口令：改这里，并保持与小程序 config.js 里的 adminPass 一致
const ADMIN_PASS = 'fantuan8899';

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (e) {
    // 已存在会报错，忽略
  }
}

exports.main = async (event) => {
  const { action, pass } = event || {};
  if (pass !== ADMIN_PASS) {
    return { ok: false, msg: '口令不正确' };
  }

  try {
    if (action === 'ping') {
      await ensureCollection('orders');
      await ensureCollection('products');
      await ensureCollection('shop');
      return { ok: true, data: true };
    }

    if (action === 'listOrders') {
      const where = event.status ? { status: event.status } : {};
      const res = await db.collection('orders').where(where).orderBy('createdAt', 'desc').limit(100).get();
      return { ok: true, data: res.data };
    }

    if (action === 'updateOrder') {
      const data = Object.assign({}, event.patch, { updatedAt: Date.now() });
      await db.collection('orders').doc(event.id).update({ data });
      return { ok: true, data: true };
    }

    if (action === 'listProducts') {
      const res = await db.collection('products').orderBy('sort', 'asc').limit(100).get();
      return { ok: true, data: res.data };
    }

    if (action === 'saveProduct') {
      if (event.id) {
        await db.collection('products').doc(event.id).update({ data: event.data });
        return { ok: true, data: event.id };
      }
      const res = await db.collection('products').add({ data: event.data });
      return { ok: true, data: res._id };
    }

    if (action === 'removeProduct') {
      await db.collection('products').doc(event.id).remove();
      return { ok: true, data: true };
    }

    // 把本地示例作品导入云数据库（只补不覆盖）
    if (action === 'initProducts') {
      const list = event.products || [];
      let added = 0;
      for (let i = 0; i < list.length; i++) {
        const p = Object.assign({}, list[i], { sort: i, onSale: true });
        const exist = await db.collection('products').where({ id: p.id }).count();
        if (exist.total === 0) {
          await db.collection('products').add({ data: p });
          added++;
        }
      }
      return { ok: true, data: { added } };
    }

    // 店铺须知文案（shop 集合，文档 _id = 'main'）
    if (action === 'getShop') {
      try {
        const res = await db.collection('shop').doc('main').get();
        return { ok: true, data: res.data || null };
      } catch (e) {
        return { ok: true, data: null };
      }
    }

    if (action === 'saveShop') {
      const data = event.shop || {};
      try {
        await db.collection('shop').doc('main').update({ data });
      } catch (e) {
        await db.collection('shop').add({ data: Object.assign({ _id: 'main' }, data) });
      }
      return { ok: true, data: true };
    }

    return { ok: false, msg: '未知操作：' + action };
  } catch (e) {
    return { ok: false, msg: e.message || '服务端错误' };
  }
};
