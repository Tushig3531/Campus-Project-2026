(() => {
  const btn = document.getElementById("projectBadge");
  const modal = document.getElementById("projectModal");
  if (!btn || !modal) return;

  const closeBtn = modal.querySelector(".project-modal__close");
  const backdrop = modal.querySelector("[data-close]");

  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => closeBtn?.focus());
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    lastFocused?.focus?.();
  }

  btn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });
})();
