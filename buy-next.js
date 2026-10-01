(() => {
  const dialog = document.getElementById('photo-dialog');
  document.querySelectorAll('[data-photo]').forEach(button => {
    button.addEventListener('click', () => {
      const image = document.getElementById('large-photo');
      image.src = button.dataset.photo;
      image.alt = button.querySelector('img').alt;
      document.getElementById('photo-caption').textContent = button.dataset.caption;
      dialog.showModal();
    });
  });
  document.getElementById('close-photo').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }
  });
})();
