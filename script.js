// State management
let state = {
    products: [],
    wishlist: JSON.parse(localStorage.getItem('wishlist')) || [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    userPreferences: JSON.parse(localStorage.getItem('userPreferences')) || {
        categories: [],
        priceRange: { min: 0, max: 1000 },
        brands: []
    }
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const searchBtn = document.getElementById('searchBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const productGrid = document.getElementById('productGrid');
const wishlistModal = document.getElementById('wishlistModal');
const cartModal = document.getElementById('cartModal');
const wishlistBtn = document.getElementById('wishlistBtn');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
sendMessageBtn.addEventListener('click', handleChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatMessage();
});
wishlistBtn.addEventListener('click', openWishlistModal);
cartBtn.addEventListener('click', openCartModal);

// API Configuration
const API_BASE_URL = 'https://fakestoreapi.com';

// Fetch products from Fake Store API
async function fetchProducts(query = '', category = '') {
    try {
        let url = `${API_BASE_URL}/products`;

        // If category is selected, filter by category
        if (category) {
            url = `${API_BASE_URL}/products/category/${encodeURIComponent(category)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        let products = await response.json();

        // If there's a search query, filter products
        if (query) {
            const searchTerm = query.toLowerCase();
            products = products.filter(product =>
                product.title.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }

        // Transform the API response to match our product structure
        return products.map(product => ({
            id: product.id,
            name: product.title,
            price: product.price,
            image: product.image,
            category: product.category,
            brand: 'Fake Store', // API doesn't provide brand info
            description: product.description
        }));
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}

// Search functionality
async function handleSearch() {
    const query = searchInput.value;
    const category = categorySelect.value;

    showLoading();
    try {
        const products = await fetchProducts(query, category);
        state.products = products;
        renderProducts(products);
    } catch (error) {
        showError('Failed to fetch products');
    } finally {
        hideLoading();
    }
}

// Chat functionality
function handleChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    // Process the message and generate response
    setTimeout(() => {
        typingIndicator.remove();
        processChatMessage(message);
    }, 1000);
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'chat-message assistant-message typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
}

async function processChatMessage(message) {
    const keywords = message.toLowerCase().split(' ');
    const categories = ['electronics', 'jewelery', "men's clothing", "women's clothing"];

    // Check for price range queries
    const priceMatch = message.match(/\$(\d+)/g);
    if (priceMatch) {
        const prices = priceMatch.map(p => parseInt(p.replace('$', '')));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const products = await fetchProducts('', '');
        const filteredProducts = products.filter(p => p.price >= minPrice && p.price <= maxPrice);
        if (filteredProducts.length > 0) {
            addChatMessage(`I found ${filteredProducts.length} products in your price range. Here are some options:`, 'assistant');
            renderProductRecommendations(filteredProducts.slice(0, 3));
        } else {
            addChatMessage("I couldn't find any products in that price range. Would you like to try a different price range?", 'assistant');
        }
        return;
    }

    // Check for category queries
    const mentionedCategory = categories.find(category =>
        message.toLowerCase().includes(category)
    );

    if (mentionedCategory) {
        const products = await fetchProducts('', mentionedCategory);
        addChatMessage(`I found ${products.length} products in the ${mentionedCategory} category. Here are some options:`, 'assistant');
        renderProductRecommendations(products.slice(0, 3));
        return;
    }

    // Check for product recommendations
    if (keywords.includes('recommend') || keywords.includes('suggest')) {
        const products = await fetchProducts('', '');
        const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 3);
        addChatMessage("Here are some products you might like:", 'assistant');
        renderProductRecommendations(randomProducts);
        return;
    }

    // Check for product search
    if (keywords.length > 1) {
        const products = await fetchProducts(message, '');
        if (products.length > 0) {
            addChatMessage(`I found ${products.length} products matching your search. Here are some options:`, 'assistant');
            renderProductRecommendations(products.slice(0, 3));
        } else {
            addChatMessage("I couldn't find any products matching your search. Could you please try different keywords?", 'assistant');
        }
        return;
    }

    // Default response
    addChatMessage("I can help you find products, compare prices, or get recommendations. What would you like to know?", 'assistant');
}

function renderProductRecommendations(products) {
    const recommendationsContainer = document.createElement('div');
    recommendationsContainer.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mt-4';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'bg-gray-50 rounded-lg p-4';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="w-full h-32 object-contain mb-2">
            <h4 class="font-semibold text-sm">${product.name}</h4>
            <p class="text-blue-600 font-bold">$${product.price}</p>
            <button onclick="addToCart(${product.id})" class="mt-2 w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                Add to Cart
            </button>
        `;
        recommendationsContainer.appendChild(productCard);
    });

    chatMessages.appendChild(recommendationsContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addChatMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${type}-message`;
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}

// Product rendering
function renderProducts(products) {
    productGrid.innerHTML = products.map(product => `
        <div class="product-card bg-white rounded-lg shadow-md p-4">
            <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4">
            <h3 class="text-lg font-semibold mb-2">${product.name}</h3>
            <p class="text-gray-600 text-sm mb-2">${product.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-xl font-bold">$${product.price}</span>
                <div class="flex gap-2">
                    <button onclick="toggleWishlist(${product.id})" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="addToCart(${product.id})" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Wishlist functionality
function toggleWishlist(productId) {
    const index = state.wishlist.indexOf(productId);
    if (index === -1) {
        state.wishlist.push(productId);
    } else {
        state.wishlist.splice(index, 1);
    }
    localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
    updateWishlistUI();
}

function openWishlistModal() {
    wishlistModal.classList.remove('hidden');
    updateWishlistUI();
}

function closeWishlistModal() {
    wishlistModal.classList.add('hidden');
}

function updateWishlistUI() {
    const wishlistItems = document.getElementById('wishlistItems');
    const wishlistProducts = state.products.filter(product =>
        state.wishlist.includes(product.id)
    );

    wishlistItems.innerHTML = wishlistProducts.map(product => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-4">
                <img src="${product.image}" alt="${product.name}" class="w-16 h-16 object-cover rounded">
                <div>
                    <h3 class="font-semibold">${product.name}</h3>
                    <p class="text-gray-600">$${product.price}</p>
                </div>
            </div>
            <button onclick="toggleWishlist(${product.id})" class="text-red-600 hover:text-red-700">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `).join('');
}

// Cart functionality
function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
        state.cart.push(product);
        localStorage.setItem('cart', JSON.stringify(state.cart));
        updateCartUI();
        showNotification('Product added to cart!');
    }
}

function openCartModal() {
    cartModal.classList.remove('hidden');
    updateCartUI();
}

function closeCartModal() {
    cartModal.classList.add('hidden');
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    cartItems.innerHTML = state.cart.map(product => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-4">
                <img src="${product.image}" alt="${product.name}" class="w-16 h-16 object-cover rounded">
                <div>
                    <h3 class="font-semibold">${product.name}</h3>
                    <p class="text-gray-600">$${product.price}</p>
                </div>
            </div>
            <button onclick="removeFromCart(${product.id})" class="text-red-600 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    const total = state.cart.reduce((sum, product) => sum + product.price, 0);
    cartTotal.textContent = total.toFixed(2);
    cartCount.textContent = state.cart.length;
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(product => product.id !== productId);
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCartUI();
}

// Utility functions
function showLoading() {
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner mx-auto';
    productGrid.appendChild(loadingSpinner);
}

function hideLoading() {
    const spinner = productGrid.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
    errorElement.textContent = message;
    productGrid.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    handleSearch();
    updateCartUI();
}); 