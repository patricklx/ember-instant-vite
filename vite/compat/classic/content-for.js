const contentFor = {};

function apply() {
  const placeHolders = ['head', 'head-footer', 'body', 'body-footer'];
  for (const placeHolder of placeHolders) {
    const head = document.getElementById(`content-for-${placeHolder}`);
    const headReplace = document.createElement('div');
    headReplace.innerHTML = contentFor['head'];
    head.replaceWith(...headReplace.children);
  }
}


apply();
