


export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  const { className, text, html, attrs, on } = props;
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  if (html != null) node.innerHTML = String(html);
  if (attrs && typeof attrs === 'object') {
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value == null) return;
      node.setAttribute(key, String(value));
    });
  }
  if (on && typeof on === 'object') {
    Object.keys(on).forEach((eventName) => {
      const handler = on[eventName];
      if (typeof handler === 'function') node.addEventListener(eventName, handler);
    });
  }
  children.flat(Infinity).forEach((child) => {
    if (child == null) return;
    if (child instanceof Node) {
      node.appendChild(child);
      return;
    }
    node.appendChild(document.createTextNode(String(child)));
  });
  return node;
}





export function clear(node) {
  if (!node) return;
  node.replaceChildren();
}





export function button(props = {}) {
  const { attrs = {}, ...rest } = props;
  return el('button', { ...rest, attrs: { type: 'button', ...attrs } });
}
