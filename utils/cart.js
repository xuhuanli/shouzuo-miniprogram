// 购物车：存在本机（wx.storage），不占云数据库
// 每条 = 一件作品 + 选好的材质 / 表布 / 里布，同款同配置会自动合并数量
const KEY = 'sz_cart';

function getCart() {
  return wx.getStorageSync(KEY) || [];
}

function setCart(list) {
  wx.setStorageSync(KEY, list);
  syncBadge(list);
  return list;
}

function makeKey(item) {
  return [item.styleId, item.grade, item.tableFabric || '', item.liningFabric || ''].join('|');
}

function add(item) {
  const list = getCart();
  const key = makeKey(item);
  const found = list.find((x) => x.key === key);
  if (found) {
    found.qty += item.qty || 1;
    found.checked = true;
  } else {
    list.push(Object.assign({}, item, { key, qty: item.qty || 1, checked: true }));
  }
  return setCart(list);
}

function update(key, patch) {
  const list = getCart().map((x) => (x.key === key ? Object.assign({}, x, patch) : x));
  return setCart(list);
}

function remove(keys) {
  const list = getCart().filter((x) => keys.indexOf(x.key) < 0);
  return setCart(list);
}

function toggleAll(checked) {
  const list = getCart().map((x) => Object.assign({}, x, { checked }));
  return setCart(list);
}

function checkedItems() {
  return getCart().filter((x) => x.checked);
}

function count(list) {
  return (list || getCart()).reduce((s, x) => s + (x.qty || 1), 0);
}

// 底部 tab 购物车角标：用的是自定义导航（custom-tab-bar），wx.setTabBarBadge 不起作用，
// 只能直接改当前页面上的导航；非 tab 页没有导航，跳过即可，回到 tab 页时 onShow 会再刷一次
function syncBadge(list) {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const bar = page && typeof page.getTabBar === 'function' && page.getTabBar();
  if (bar && bar.setBadge) bar.setBadge(count(list));
}

module.exports = { getCart, setCart, add, update, remove, toggleAll, checkedItems, count, syncBadge };
