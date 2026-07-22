let inventory = [];

// Initialize the site
async function init() {
    try {
        const response = await fetch('https://site-production-b156.up.railway.app/api/products');
        inventory = await response.json();
        displayProducts(inventory);
    } catch (err) {
        console.error("Critical Error: Ensure products.json exists.", err);
    }
}

// Function to inject product cards into the HTML
function displayProducts(data) {
    const container = document.getElementById('product-container');
    container.innerHTML = data.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p><strong>Specs:</strong> ${p.specs}</p>
            <p class="price">${p.price}</p>
            <a href="https://wa.me/256700000000?text=I would like to order: ${p.name}" class="btn-whatsapp" target="_blank">Order via WhatsApp</a>
        </div>
    `).join('');
}

// Real-time search filter
if (typeof document !== 'undefined') {
document.getElementById('search-bar').addEventListener('keyup', (e) => {
    const searchString = e.target.value.toLowerCase();
    const filtered = inventory.filter(p => 
        p.name.toLowerCase().includes(searchString) || 
        p.specs.toLowerCase().includes(searchString)
    );
    displayProducts(filtered);
});
}

init();