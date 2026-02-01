// Grouped FAQ Category Accordion Functionality

document.addEventListener('DOMContentLoaded', function() {
    const faqCategories = document.querySelectorAll('.faq-category');
    
    faqCategories.forEach(category => {
        const header = category.querySelector('.faq-category-header');
        const items = category.querySelector('.faq-category-items');
        
        // Set initial max-height for active categories
        if (category.classList.contains('active')) {
            items.style.maxHeight = items.scrollHeight + 'px';
        }
        
        header.addEventListener('click', function() {
            const isActive = category.classList.contains('active');
            
            if (isActive) {
                // Close category
                category.classList.remove('active');
                items.style.maxHeight = '0';
            } else {
                // Open category
                category.classList.add('active');
                items.style.maxHeight = items.scrollHeight + 'px';
            }
        });
    });
    
    // Existing FAQ item accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const faqAnswer = faqItem.querySelector('.faq-answer');
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQ items in the same category
            const category = faqItem.closest('.faq-category');
            const categoryFaqItems = category.querySelectorAll('.faq-item');
            categoryFaqItems.forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('active');
                    const answer = item.querySelector('.faq-answer');
                    answer.style.maxHeight = null;
                }
            });
            
            // Toggle current FAQ item
            if (isActive) {
                faqItem.classList.remove('active');
                faqAnswer.style.maxHeight = null;
            } else {
                faqItem.classList.add('active');
                faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
            }
            
            // Update parent category max-height
            const categoryItems = faqItem.closest('.faq-category-items');
            if (categoryItems) {
                setTimeout(() => {
                    categoryItems.style.maxHeight = categoryItems.scrollHeight + 'px';
                }, 300);
            }
        });
    });
});
