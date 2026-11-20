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
  element.textContent = "0";

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toLocaleString("zh-TW");

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = target.toLocaleString("zh-TW");
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
    const selectedAddons = Array.from(addons).filter((input) => input.checked && !input.disabled);
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
    const selected = estimator.querySelector('input[name="basePlan"]:checked');
    const included = new Set((selected?.dataset.includes || "").split(","));
    addons.forEach(input => {
      const isIncluded = included.has(input.dataset.addon);
      input.disabled = isIncluded;
      if (isIncluded) input.checked = false;
      const priceLabel = input.closest("label").querySelector("span");
      if (!priceLabel.dataset.original) priceLabel.dataset.original = priceLabel.textContent;
      priceLabel.textContent = isIncluded ? "方案已含" : priceLabel.dataset.original;
    });
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
      `預估總金額（未稅）: ${formatCurrency(estimate.total)}`,
      "此為未稅初步估算，實際金額與稅額以正式報價單為準。",
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
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const dialog = document.querySelector("[data-contact-success]");
  let sending = false;
  dialog.querySelector("button").addEventListener("click", () => dialog.close());
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const fields = Array.from(contactForm.querySelectorAll("[required]"));
    fields.forEach(field => {
      if (field.tagName !== "SELECT") field.value = field.value.trim();
      field.classList.toggle("field-error", !field.checkValidity());
    });
    if (!contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    if (data.get("_honey")) return;
    if (!/^https?:$/.test(location.protocol)) {
      formMessage.textContent = "請從網站網址開啟此頁再送出，或直接寄信至 hankk5625@gmail.com。";
      formMessage.classList.add("error");
      return;
    }
    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = "送出中…";
    contactForm.setAttribute("aria-busy", "true");
    formMessage.classList.remove("error");
    formMessage.textContent = "正在傳送您的需求，請稍候。";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        signal: controller.signal,
        body: JSON.stringify({
          name: data.get("name"), email: data.get("email"),
          "需求類型": data.get("type"), "預算範圍": data.get("budget"), message: data.get("message"),
          _replyto: data.get("email"), _subject: "Hank Studio 專案洽詢：" + data.get("type"),
          _template: "table", _honey: ""
        })
      });
      const result = await response.json();
      if (/activat|confirm.*email|verify.*email/i.test(result.message || "")) {
        throw new Error("activation");
      }
      if (!response.ok || !(result.success === true || result.success === "true")) throw new Error("submission");
      contactForm.reset();
      formMessage.textContent = "您的需求已送出。";
      dialog.showModal();
    } catch (error) {
      formMessage.classList.add("error");
      formMessage.textContent = error.message === "activation"
        ? "收件信箱尚待啟用，這次尚未確認送達。請直接寄信至 hankk5625@gmail.com，我們會盡快回覆。"
        : "目前無法確認是否送達，您填寫的內容已保留。請稍後再試，或寄信至 hankk5625@gmail.com；若重試，請註明可能重複送出。";
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      submitButton.textContent = "送出需求";
      contactForm.setAttribute("aria-busy", "false");
    }
  });
}

const serviceChoice = {web:"品牌形象官網",hardware:"硬體開發",printing:"3D 列印",marketing:"網路行銷（短影音）"}[new URLSearchParams(location.search).get("service")];
if (contactForm && serviceChoice) contactForm.elements.type.value = serviceChoice;
document.addEventListener("keydown", event => { if(event.key === "Escape" && menuToggle) {document.body.classList.remove("menu-open");menuToggle.setAttribute("aria-expanded","false");}});
