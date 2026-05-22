const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealItems = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -80px 0px" }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
  revealObserver.observe(item);
});

const counters = document.querySelectorAll("[data-count]");
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.6 }
);

counters.forEach((counter) => counterObserver.observe(counter));

function animateCounter(element) {
  const target = Number(element.dataset.count || 0);
  const duration = 1100;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toLocaleString("zh-TW");

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

const estimator = document.querySelector("[data-estimator]");

if (estimator) {
  const basePlans = estimator.querySelectorAll('input[name="basePlan"]');
  const addons = estimator.querySelectorAll('.addons input[type="checkbox"]');
  const totalEl = estimator.querySelector("[data-total]");
  const summaryList = estimator.querySelector("[data-summary-list]");
  const copyButton = estimator.querySelector("[data-copy-estimate]");
  const message = estimator.querySelector("[data-estimate-message]");

  function getEstimate() {
    const selectedBase = estimator.querySelector('input[name="basePlan"]:checked');
    const selectedAddons = Array.from(addons).filter((input) => input.checked);
    const items = [];
    let total = 0;

    if (selectedBase) {
      total += Number(selectedBase.value);
      items.push({
        label: selectedBase.dataset.label,
        price: Number(selectedBase.value),
      });
    }

    selectedAddons.forEach((input) => {
      total += Number(input.value);
      items.push({
        label: input.dataset.label,
        price: Number(input.value),
      });
    });

    return { items, total };
  }

  function formatCurrency(amount) {
    return `NT$${amount.toLocaleString("zh-TW")}`;
  }

  function updateEstimate() {
    const estimate = getEstimate();
    totalEl.textContent = formatCurrency(estimate.total);
    summaryList.innerHTML = estimate.items
      .map((item) => `<span>${item.label} ${formatCurrency(item.price)}</span>`)
      .join("");
    message.textContent = "";
    message.classList.remove("error");
  }

  [...basePlans, ...addons].forEach((input) => {
    input.addEventListener("change", updateEstimate);
  });

  copyButton.addEventListener("click", async () => {
    const estimate = getEstimate();
    const text = [
      "Hank Studio 初步估價",
      ...estimate.items.map((item) => `- ${item.label}: ${formatCurrency(item.price)}`),
      `預估總金額: ${formatCurrency(estimate.total)}`,
      "此價格為初步估算，實際價格會依需求細節調整。",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      message.textContent = "估價內容已複製。";
    } catch (error) {
      message.textContent = "瀏覽器未允許複製，請手動複製估價內容。";
      message.classList.add("error");
    }
  });

  updateEstimate();
}

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const formMessage = contactForm.querySelector("[data-form-message]");

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = Array.from(contactForm.querySelectorAll("input, select, textarea"));
    let isValid = true;

    fields.forEach((field) => {
      field.classList.remove("field-error");

      if (!field.checkValidity()) {
        field.classList.add("field-error");
        isValid = false;
      }
    });

    if (!isValid) {
      formMessage.textContent = "請確認所有欄位皆已填寫，Email 格式也需要正確。";
      formMessage.classList.add("error");
      return;
    }

    formMessage.textContent = "已收到你的需求。這是前端示範表單，正式聯絡請透過 Email 或 Instagram。";
    formMessage.classList.remove("error");
    contactForm.reset();
  });
}
