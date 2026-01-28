(() => {
  const badge = document.getElementById("projectBadge");
  const modal = document.getElementById("projectModal");
  if (!badge || !modal) return;

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

  // Open: click + Enter/Space
  badge.addEventListener("click", openModal);
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });

  // Close: X + backdrop + ESC
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });
})();
