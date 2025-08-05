document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    const text = link.textContent.trim();

    // Map link text to actual file names (if not directly derivable)
    const customRoutes = {
      "Dashboard": "dashboard.html",
      "Customer Support": "cs.html",
      "Leads & Opportunities": "leads-opportunities.html",
      "Sales Orders": "sales-orders.html",
      "Quotations and Pricing": "quotations-pricing.html",
      "Customer Directory": "customer-directory.html",
      "Report": "report.html",
      "Logout": "logout.html"
    };

    const page = customRoutes[text];
    if (page) {
      document.getElementById('contentFrame').src = page;

      document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    }
  });
});