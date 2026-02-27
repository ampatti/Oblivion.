(function() {
  const base = window.__oblivion_base || location.href;

  function proxyUrl(url) {
    try {
      if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#')) return url;
      if (url.startsWith('//')) url = 'https:' + url;
      const abs = new URL(url, base).href;
      if (!abs.startsWith('http://') && !abs.startsWith('https://')) return url;
      return '/proxy?url=' + encodeURIComponent(abs);
    } catch { return url; }
  }

  window.__oblivion_proxy_url = proxyUrl;

  // Intercept fetch
  const _fetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) url = proxyUrl(url);
    return _fetch.call(this, url, opts);
  };

  // Intercept XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) url = proxyUrl(url);
    return _open.call(this, method, url, ...args);
  };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const abs = new URL(href, base).href;
      if (abs.startsWith('http://') || abs.startsWith('https://')) {
        e.preventDefault();
        window.parent.postMessage({ type: 'oblivion-navigate', url: abs }, '*');
      }
    } catch {}
  }, true);

  // Notify parent of current URL
  window.parent.postMessage({ type: 'oblivion-url', url: base }, '*');
})();