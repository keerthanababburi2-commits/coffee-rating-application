/* ==========================================================================
   BrewPulse Frontend Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let state = {
    coffees: [],
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'votes',
    currentCoffeeId: null
  };

  // DOM Elements
  const coffeeGrid = document.getElementById('coffeeGrid');
  const gridLoader = document.getElementById('gridLoader');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const categoryButtons = document.querySelectorAll('.tab-btn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  
  // Header Stats
  const statTotalVotes = document.getElementById('statTotalVotes');
  const statAvgRating = document.getElementById('statAvgRating');
  const statTotalComments = document.getElementById('statTotalComments');

  // Details Modal Elements
  const detailModal = document.getElementById('detailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const modalCoffeeImage = document.getElementById('modalCoffeeImage');
  const modalCoffeeCategory = document.getElementById('modalCoffeeCategory');
  const modalCoffeeName = document.getElementById('modalCoffeeName');
  const modalCoffeeOrigin = document.getElementById('modalCoffeeOrigin');
  const modalCoffeeRoast = document.getElementById('modalCoffeeRoast');
  const modalFlavorNotes = document.getElementById('modalFlavorNotes');
  const modalCoffeeDesc = document.getElementById('modalCoffeeDesc');
  const modalRatingScore = document.getElementById('modalRatingScore');
  const modalRatingStars = document.getElementById('modalRatingStars');
  const modalRatingCount = document.getElementById('modalRatingCount');
  const modalVoteBtn = document.getElementById('modalVoteBtn');
  const modalVoteCount = document.getElementById('modalVoteCount');
  const commentForm = document.getElementById('commentForm');
  const reviewsFeed = document.getElementById('reviewsFeed');

  // Add Brew Modal Elements
  const addModal = document.getElementById('addModal');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addCoffeeForm = document.getElementById('addCoffeeForm');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // Particle Canvas Setup
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];

  // Initialize Canvas Size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Particle Animation Loop
  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p.y -= p.speedY;
      p.x += p.speedX;
      p.alpha -= p.decay;
      p.scale += 0.01;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // Draw a heart shape or simple glowing bubble
      ctx.beginPath();
      if (p.isHeart) {
        // Draw Heart
        let size = p.size * p.scale;
        ctx.moveTo(p.x, p.y + size / 4);
        ctx.quadraticCurveTo(p.x, p.y, p.x - size / 2, p.y);
        ctx.quadraticCurveTo(p.x - size, p.y, p.x - size, p.y + size / 3);
        ctx.quadraticCurveTo(p.x - size, p.y + size * 0.7, p.x, p.y + size * 1.15);
        ctx.quadraticCurveTo(p.x + size, p.y + size * 0.7, p.x + size, p.y + size / 3);
        ctx.quadraticCurveTo(p.x + size, p.y, p.x + size / 2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + size / 4);
      } else {
        // Draw Bubble/Sparkle
        ctx.arc(p.x, p.y, p.size * p.scale, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();

      // Remove dead particles
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        i--;
      }
    }
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  // Trigger heart confetti explosion
  function spawnParticles(x, y, count = 15, isHeart = false, color = '#f25c54') {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        size: Math.random() * 8 + 6,
        scale: 0.5,
        speedX: (Math.random() - 0.5) * 5,
        speedY: Math.random() * 4 + 2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        isHeart: isHeart,
        color: color
      });
    }
  }

  // Spawn floating "+1" text
  function triggerPlusOne(element, clientX, clientY) {
    const floatText = document.createElement('div');
    floatText.className = 'floating-plus-one';
    floatText.innerText = '+1';
    
    // Position it where clicked, accounting for scroll
    floatText.style.left = `${clientX + window.scrollX - 10}px`;
    floatText.style.top = `${clientY + window.scrollY - 20}px`;
    
    document.body.appendChild(floatText);
    
    setTimeout(() => {
      floatText.remove();
    }, 800);
  }

  // Show Toast
  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    const icon = toast.querySelector('.toast-icon');
    if (type === 'success') {
      icon.className = 'ri-checkbox-circle-fill toast-icon';
      icon.style.color = 'var(--success-color)';
    } else {
      icon.className = 'ri-error-warning-fill toast-icon';
      icon.style.color = 'var(--error-color)';
    }
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // ==========================================================================
  // Core API Functions
  // ==========================================================================

  // Fetch all coffees
  async function fetchCoffees(showLoading = true) {
    if (showLoading) {
      gridLoader.style.display = 'grid';
      coffeeGrid.style.display = 'none';
      emptyState.style.display = 'none';
    }

    try {
      const response = await fetch('/api/coffees');
      const data = await response.json();
      
      if (data.success) {
        state.coffees = data.coffees;
        renderGrid();
        renderStats();
        
        // If modal is active, update the details page
        if (state.currentCoffeeId) {
          const currentCoffee = state.coffees.find(c => c.id === state.currentCoffeeId);
          if (currentCoffee) {
            updateDetailsModalUI(currentCoffee);
          }
        }
      } else {
        showToast('Failed to fetch coffee records', 'error');
      }
    } catch (error) {
      console.error('API Error:', error);
      showToast('Network error while connecting to server', 'error');
    } finally {
      if (showLoading) {
        gridLoader.style.display = 'none';
        coffeeGrid.style.display = 'grid';
      }
    }
  }

  // Cast a Vote
  async function castVote(id, clickEvent = null) {
    try {
      const response = await fetch(`/api/coffees/${id}/vote`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        // Update local state
        const index = state.coffees.findIndex(c => c.id === id);
        if (index !== -1) {
          state.coffees[index] = data.coffee;
        }

        // Trigger animations
        if (clickEvent) {
          spawnParticles(clickEvent.clientX, clickEvent.clientY, 16, true, '#f25c54');
          triggerPlusOne(null, clickEvent.clientX, clickEvent.clientY);
        }

        // Update UI
        renderGrid();
        renderStats();
        
        // If details modal is viewing this coffee
        if (state.currentCoffeeId === id) {
          updateDetailsModalUI(data.coffee);
        }

        showToast(`Voted for ${data.coffee.name}!`);
      } else {
        showToast('Failed to submit vote', 'error');
      }
    } catch (error) {
      console.error('Vote API Error:', error);
      showToast('Error sending vote to server', 'error');
    }
  }

  // Add a Tasting Review
  async function submitReview(e) {
    e.preventDefault();
    if (!state.currentCoffeeId) return;

    const nameInput = document.getElementById('reviewName');
    const textInput = document.getElementById('reviewText');
    const ratingInputs = document.getElementsByName('starRating');
    
    let selectedRating = null;
    for (let r of ratingInputs) {
      if (r.checked) {
        selectedRating = parseInt(r.value);
        break;
      }
    }

    if (!selectedRating) {
      showToast('Please select a star rating', 'error');
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      rating: selectedRating,
      text: textInput.value.trim()
    };

    try {
      const response = await fetch(`/api/coffees/${state.currentCoffeeId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        // Update local state
        const index = state.coffees.findIndex(c => c.id === state.currentCoffeeId);
        if (index !== -1) {
          state.coffees[index] = data.coffee;
        }

        // Reset Form
        commentForm.reset();
        
        // Particles
        const formBtn = commentForm.querySelector('button[type="submit"]');
        const rect = formBtn.getBoundingClientRect();
        spawnParticles(rect.left + rect.width/2, rect.top, 12, false, '#e8c595');

        // Update UI
        renderGrid();
        renderStats();
        updateDetailsModalUI(data.coffee);
        
        showToast('Tasting review published successfully!');
      } else {
        showToast(data.error || 'Failed to submit review', 'error');
      }
    } catch (error) {
      console.error('Review API Error:', error);
      showToast('Network error during review submission', 'error');
    }
  }

  // Create a Custom Coffee Roast
  async function submitNewCoffee(e) {
    e.preventDefault();

    const name = document.getElementById('coffeeName').value.trim();
    const category = document.getElementById('coffeeCategory').value;
    const roastLevel = document.getElementById('coffeeRoast').value;
    const origin = document.getElementById('coffeeOrigin').value.trim();
    const flavorNotes = document.getElementById('coffeeFlavors').value.trim();
    const description = document.getElementById('coffeeDesc').value.trim();

    const payload = {
      name,
      category,
      roastLevel,
      origin,
      flavorNotes: flavorNotes ? flavorNotes.split(',').map(n => n.trim()) : [],
      description,
      imageUrl: '/images/default.png' // Default generated illustration
    };

    try {
      const response = await fetch('/api/coffees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        // Add to state and re-render
        state.coffees.push(data.coffee);
        
        // Reset and close
        addCoffeeForm.reset();
        closeModal(addModal);
        
        renderGrid();
        renderStats();
        showToast(`${data.coffee.name} cataloged!`);
      } else {
        showToast(data.error || 'Failed to catalog coffee', 'error');
      }
    } catch (error) {
      console.error('Add Coffee API Error:', error);
      showToast('Network error creating coffee drink', 'error');
    }
  }

  // ==========================================================================
  // Render Functions
  // ==========================================================================

  // Render main coffee grid
  function renderGrid() {
    let filtered = [...state.coffees];

    // 1. Filter by category
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(coffee => coffee.category === state.selectedCategory);
    }

    // 2. Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(coffee => 
        coffee.name.toLowerCase().includes(query) ||
        coffee.description.toLowerCase().includes(query) ||
        coffee.origin.toLowerCase().includes(query) ||
        coffee.category.toLowerCase().includes(query) ||
        coffee.flavorNotes.some(note => note.toLowerCase().includes(query))
      );
    }

    // 3. Sort items
    if (state.sortBy === 'votes') {
      filtered.sort((a, b) => b.votes - a.votes);
    } else if (state.sortBy === 'rating') {
      const avgA = a.ratingCount > 0 ? (a.ratingSum / a.ratingCount) : 0;
      const avgB = b.ratingCount > 0 ? (b.ratingSum / b.ratingCount) : 0;
      filtered.sort((a, b) => avgB - avgA || b.votes - a.votes);
    } else if (state.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Toggle Empty State
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      coffeeGrid.innerHTML = '';
      return;
    } else {
      emptyState.style.display = 'none';
    }

    // Render cards
    coffeeGrid.innerHTML = filtered.map(coffee => {
      // Calculate star rating
      const avgRating = coffee.ratingCount > 0 
        ? (coffee.ratingSum / coffee.ratingCount).toFixed(1) 
        : '0.0';
      
      const flavorPillsHtml = coffee.flavorNotes
        .map(note => `<span class="pill">${note}</span>`)
        .join('');

      return `
        <div class="coffee-card" data-id="${coffee.id}">
          <div class="card-image-wrapper">
            <img src="${coffee.imageUrl}" alt="${coffee.name}" loading="lazy">
            <span class="badge">${coffee.category}</span>
          </div>
          <div class="card-content">
            <h3>${coffee.name}</h3>
            <div class="origin-badge">
              <i class="ri-map-pin-2-line"></i> ${coffee.origin} &bull; ${coffee.roastLevel}
            </div>
            <p class="card-description">${coffee.description}</p>
            
            <div class="flavor-pills">
              ${flavorPillsHtml}
            </div>

            <div class="card-actions-row">
              <div class="rating-indicator">
                <i class="ri-star-fill"></i>
                <span>${avgRating}</span>
                <span class="count-label">(${coffee.ratingCount})</span>
              </div>
              <button class="upvote-btn" data-id="${coffee.id}" aria-label="Upvote ${coffee.name}">
                <i class="ri-heart-3-fill"></i>
                <span class="votes-num">${coffee.votes}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    document.querySelectorAll('.coffee-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // If they clicked the upvote heart specifically, don't open details modal
        if (e.target.closest('.upvote-btn')) {
          const id = card.dataset.id;
          castVote(id, e);
          return;
        }
        
        // Open Details
        const id = card.dataset.id;
        const coffee = state.coffees.find(c => c.id === id);
        if (coffee) {
          openDetailsModal(coffee);
        }
      });
    });
  }

  // Render Stats Ticker
  function renderStats() {
    let totalVotes = 0;
    let totalRatingsCount = 0;
    let totalRatingsSum = 0;
    let totalComments = 0;

    state.coffees.forEach(c => {
      totalVotes += (c.votes || 0);
      totalRatingsCount += (c.ratingCount || 0);
      totalRatingsSum += (c.ratingSum || 0);
      totalComments += (c.comments ? c.comments.length : 0);
    });

    const averageRating = totalRatingsCount > 0 
      ? (totalRatingsSum / totalRatingsCount).toFixed(1) 
      : '0.0';

    // Update Banner Text with nice roll numbers (direct HTML insertion is fine)
    statTotalVotes.textContent = totalVotes;
    statAvgRating.textContent = averageRating;
    statTotalComments.textContent = totalComments;
  }

  // Update details modal contents
  function updateDetailsModalUI(coffee) {
    const avgRating = coffee.ratingCount > 0 
      ? (coffee.ratingSum / coffee.ratingCount).toFixed(1) 
      : '0.0';

    modalCoffeeImage.src = coffee.imageUrl;
    modalCoffeeImage.alt = coffee.name;
    modalCoffeeCategory.textContent = coffee.category;
    modalCoffeeName.textContent = coffee.name;
    modalCoffeeOrigin.textContent = coffee.origin;
    modalCoffeeRoast.textContent = coffee.roastLevel;
    modalCoffeeDesc.textContent = coffee.description;

    // Render flavor notes
    modalFlavorNotes.innerHTML = coffee.flavorNotes
      .map(note => `<span class="pill">${note}</span>`)
      .join('');

    // Render stars and ratings count
    modalRatingScore.textContent = avgRating;
    modalRatingCount.textContent = `based on ${coffee.ratingCount} reviews`;
    modalVoteCount.textContent = coffee.votes;

    // Redraw star rating icons
    const roundedRating = Math.round(parseFloat(avgRating));
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        starsHtml += '<i class="ri-star-fill"></i>';
      } else {
        starsHtml += '<i class="ri-star-line"></i>';
      }
    }
    modalRatingStars.innerHTML = starsHtml;

    // Set vote button ID
    modalVoteBtn.dataset.id = coffee.id;

    // Render reviews feed
    if (!coffee.comments || coffee.comments.length === 0) {
      reviewsFeed.innerHTML = `
        <div class="empty-reviews-state" style="text-align:center; padding: 20px 0; color:var(--text-muted);">
          <i class="ri-chat-voice-line" style="font-size:24px; margin-bottom:8px; display:block;"></i>
          <p style="font-size: 13px;">No reviews yet. Be the first to share your notes!</p>
        </div>
      `;
    } else {
      reviewsFeed.innerHTML = coffee.comments.map(c => {
        const dateFormatted = new Date(c.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        let reviewStarsHtml = '';
        for (let i = 1; i <= 5; i++) {
          if (i <= c.rating) {
            reviewStarsHtml += '<i class="ri-star-fill"></i>';
          } else {
            reviewStarsHtml += '<i class="ri-star-line"></i>';
          }
        }

        return `
          <div class="review-item">
            <div class="review-header">
              <span class="reviewer-name">${c.name}</span>
              <span class="review-stars">${reviewStarsHtml}</span>
            </div>
            <p class="review-text">${c.text}</p>
            <span class="review-date">${dateFormatted}</span>
          </div>
        `;
      }).join('');
    }
  }

  // ==========================================================================
  // Modal State Controls
  // ==========================================================================

  function openDetailsModal(coffee) {
    state.currentCoffeeId = coffee.id;
    updateDetailsModalUI(coffee);
    
    detailModal.classList.add('active');
    detailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    detailModal.focus();
  }

  function openAddModal() {
    addModal.classList.add('active');
    addModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    addModal.focus();
  }

  function closeModal(modalElement) {
    modalElement.classList.remove('active');
    modalElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    if (modalElement === detailModal) {
      state.currentCoffeeId = null;
    }
  }

  // Close Modals on click of background/close buttons
  [detailModal, addModal].forEach(modal => {
    modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));
  });

  closeDetailModalBtn.addEventListener('click', () => closeModal(detailModal));
  closeAddModalBtn.addEventListener('click', () => closeModal(addModal));
  cancelAddBtn.addEventListener('click', () => closeModal(addModal));

  openAddModalBtn.addEventListener('click', openAddModal);

  // Modal upvote click
  modalVoteBtn.addEventListener('click', (e) => {
    if (state.currentCoffeeId) {
      castVote(state.currentCoffeeId, e);
    }
  });

  // Form submissions
  commentForm.addEventListener('submit', submitReview);
  addCoffeeForm.addEventListener('submit', submitNewCoffee);

  // Keyboard support for closing modals (Escape key)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) closeModal(activeModal);
    }
  });

  // ==========================================================================
  // Filter & Search Controls
  // ==========================================================================

  // Category Tab Selection
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      state.selectedCategory = btn.dataset.category;
      renderGrid();
    });
  });

  // Sorting
  sortSelect.addEventListener('change', () => {
    state.sortBy = sortSelect.value;
    renderGrid();
  });

  // Search Input Handler
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    
    // Toggle Clear button visibility
    if (state.searchQuery) {
      clearSearchBtn.style.display = 'block';
    } else {
      clearSearchBtn.style.display = 'none';
    }
    
    renderGrid();
  });

  // Clear Search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderGrid();
    searchInput.focus();
  });

  // Reset Filters Empty State Action
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    state.selectedCategory = 'all';
    
    categoryButtons.forEach((b, idx) => {
      if (idx === 0) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      }
    });

    renderGrid();
  });

  // ==========================================================================
  // App Startup
  // ==========================================================================
  fetchCoffees(true);
});
