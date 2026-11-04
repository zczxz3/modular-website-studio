// Project scripts run only in explicit Preview, and in the exported website.
document.querySelector('#explore')?.addEventListener('click', () => {
  document.querySelector('.title').textContent = '世界，就在眼前';
});
