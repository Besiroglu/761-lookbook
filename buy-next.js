(() => {
  const dialog = document.getElementById('photo-dialog');
  document.querySelectorAll('[data-photo]').forEach(button => {
    button.addEventListener('click', () => {
      const image = document.getElementById('large-photo');
      image.src = button.dataset.photo;
      image.alt = button.querySelector('img').alt;
      document.getElementById('photo-caption').textContent = button.dataset.caption || '';
      dialog.showModal();
    });
  });
  document.getElementById('close-photo')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  const cards = [...document.querySelectorAll('.pick')];
  const rows = [...document.querySelectorAll('tbody tr[data-tags]')];
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      [...cards, ...rows].forEach(item => {
        item.hidden = filter !== 'all' && !item.dataset.tags.split(' ').includes(filter);
      });
      const visible = cards.filter(card => !card.hidden).length;
      document.getElementById('filter-count').textContent = `${visible} recommendation${visible === 1 ? '' : 's'}`;
      document.getElementById('no-results').hidden = visible !== 0;
    });
  });
})();
