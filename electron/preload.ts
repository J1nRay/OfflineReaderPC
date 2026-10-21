function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) resolve(true);
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) parent.appendChild(child);
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) parent.removeChild(child);
  }
};

/** 应用启动时的加载动画，待渲染进程就绪后移除 */
function useLoading() {
  const styleContent = `
  #app-loading-container {
    display: flex; align-items: center; justify-content: center;
    position: fixed; inset: 0; width: 100vw; height: 100vh;
    background-color: #F2F6FC; z-index: 99999;
  }
  #app-loading-container .lds-ripple { display: inline-block; position: relative; width: 72px; height: 72px; color: #1E78EB; }
  #app-loading-container .lds-ripple div {
    position: absolute; border: 4px solid currentColor; opacity: 1; border-radius: 50%;
    animation: lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  #app-loading-container .lds-ripple div:nth-child(2) { animation-delay: -0.5s; }
  @keyframes lds-ripple {
    0% { top: 32px; left: 32px; width: 8px; height: 8px; opacity: 0; }
    4.9% { top: 32px; left: 32px; width: 8px; height: 8px; opacity: 0; }
    5% { top: 32px; left: 32px; width: 8px; height: 8px; opacity: 1; }
    100% { top: 0; left: 0; width: 72px; height: 72px; opacity: 0; }
  }`;
  const oStyle = document.createElement('style');
  const oDiv = document.createElement('div');
  oStyle.id = 'app-loading-style';
  oStyle.innerHTML = styleContent;
  oDiv.id = 'app-loading-container';
  oDiv.classList.add('app-drag');
  oDiv.innerHTML = `<div class="lds-ripple"><div></div><div></div></div>`;
  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    }
  };
}

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = ev => {
  ev.data.payload === 'removeLoading' && removeLoading();
};
