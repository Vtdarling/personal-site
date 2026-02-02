// Goals page interactivity - no page refresh
document.addEventListener('DOMContentLoaded', () => {
  // Handle adding new goals
  const goalForms = document.querySelectorAll('form[action="/goals"]');
  goalForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const type = formData.get('type');
      const title = formData.get('title');
      
      if (!title.trim()) return;
      
      try {
        const response = await fetch('/goals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: new URLSearchParams(formData)
        });
        
        if (response.ok) {
          const data = await response.json();
          addGoalToUI(data.goal, type);
          form.reset();
          updateStats();
          showSuccessMessage('Goal added! 🎯');
        } else {
          console.error('Server error:', response.status);
          showErrorMessage('Failed to add goal');
        }
      } catch (error) {
        console.error('Error adding goal:', error);
        showErrorMessage('Failed to add goal');
      }
    });
  });
  
  // Handle completing goals
  document.addEventListener('submit', async (e) => {
    if (e.target.matches('form[action*="/complete"]')) {
      e.preventDefault();
      
      const form = e.target;
      const action = form.getAttribute('action');
      
      try {
        const response = await fetch(action, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (response.ok) {
          const goalItem = form.closest('.goal-item');
          markGoalComplete(goalItem);
          updateStats();
          showSuccessMessage('Goal completed! ✨');
        } else {
          console.error('Server error:', response.status);
          showErrorMessage('Failed to complete goal');
        }
      } catch (error) {
        console.error('Error completing goal:', error);
        showErrorMessage('Failed to complete goal');
      }
    }
  });
});

function addGoalToUI(goal, type) {
  const container = type === 'daily' 
    ? document.querySelector('.col-lg-6:first-child .d-flex.flex-column.gap-3')
    : document.querySelector('.col-lg-6:last-child .d-flex.flex-column.gap-3');
  
  const goalHTML = `
    <div class="goal-item" style="animation-delay: 0s">
      <div class="d-flex align-items-center gap-3">
        <form method="POST" action="/goals/${goal._id}/complete" class="checkbox-form">
          <button class="checkbox-btn" type="submit">
            <span class="checkbox-custom"></span>
          </button>
        </form>
        <div class="flex-grow-1">
          <h6 class="goal-title mb-0">${escapeHtml(goal.title)}</h6>
        </div>
      </div>
    </div>
  `;
  
  // Remove "no goals" message if present
  const noGoalsMsg = container.previousElementSibling;
  if (noGoalsMsg && noGoalsMsg.classList.contains('text-muted')) {
    noGoalsMsg.remove();
  }
  
  container.insertAdjacentHTML('beforeend', goalHTML);
}

function markGoalComplete(goalItem) {
  goalItem.classList.add('completed');
  
  const form = goalItem.querySelector('.checkbox-form');
  const checkbox = goalItem.querySelector('.checkbox-custom');
  
  form.outerHTML = `
    <div class="checkbox-completed">
      <span class="checkbox-custom checked">✓</span>
    </div>
  `;
  
  const title = goalItem.querySelector('.goal-title');
  title.style.color = '#64748b';
}

function updateStats() {
  // Count goals
  const dailyItems = document.querySelectorAll('.col-lg-6:first-child .goal-item');
  const weeklyItems = document.querySelectorAll('.col-lg-6:last-child .goal-item');
  
  const dailyCompleted = document.querySelectorAll('.col-lg-6:first-child .goal-item.completed').length;
  const weeklyCompleted = document.querySelectorAll('.col-lg-6:last-child .goal-item.completed').length;
  
  const totalDaily = dailyItems.length;
  const totalWeekly = weeklyItems.length;
  
  const dailyProgress = totalDaily > 0 ? Math.round((dailyCompleted / totalDaily) * 100) : 0;
  const weeklyProgress = totalWeekly > 0 ? Math.round((weeklyCompleted / totalWeekly) * 100) : 0;
  
  // Update daily stats
  const dailyStatCards = document.querySelectorAll('.progress-section')[0]?.querySelectorAll('.mini-stat-card');
  if (dailyStatCards && dailyStatCards[0]) {
    dailyStatCards[0].querySelector('.mini-stat-value').textContent = dailyProgress + '%';
  }
  if (dailyStatCards && dailyStatCards[1]) {
    dailyStatCards[1].querySelector('.mini-stat-value').textContent = `${dailyCompleted}/${totalDaily}`;
  }
  
  // Update weekly stats
  const weeklyStatCards = document.querySelectorAll('.progress-section')[1]?.querySelectorAll('.mini-stat-card');
  if (weeklyStatCards && weeklyStatCards[0]) {
    weeklyStatCards[0].querySelector('.mini-stat-value').textContent = weeklyProgress + '%';
  }
  if (weeklyStatCards && weeklyStatCards[1]) {
    weeklyStatCards[1].querySelector('.mini-stat-value').textContent = `${weeklyCompleted}/${totalWeekly}`;
  }
  
  // Update progress bars
  const dailyProgressBar = document.querySelector('.col-lg-6:first-child .progress-fill');
  const weeklyProgressBar = document.querySelector('.col-lg-6:last-child .progress-fill');
  
  if (dailyProgressBar) {
    dailyProgressBar.style.width = dailyProgress + '%';
    dailyProgressBar.querySelector('.progress-text').textContent = `${dailyCompleted}/${totalDaily}`;
  }
  
  if (weeklyProgressBar) {
    weeklyProgressBar.style.width = weeklyProgress + '%';
    weeklyProgressBar.querySelector('.progress-text').textContent = `${weeklyCompleted}/${totalWeekly}`;
  }
}

function showSuccessMessage(message) {
  const existingAlert = document.querySelector('.alert-success');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  const alert = document.createElement('div');
  alert.className = 'alert alert-success border-0 mb-4 animated-success';
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '9999';
  alert.style.minWidth = '250px';
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.style.transition = 'opacity 0.3s ease';
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function showErrorMessage(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger border-0 mb-4';
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '9999';
  alert.style.minWidth = '250px';
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.style.transition = 'opacity 0.3s ease';
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
